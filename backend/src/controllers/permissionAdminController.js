// Admin-only endpoints for managing role-default permissions and per-user
// overrides. All require the `admin.manage_roles` permission (enforced by
// the route layer via requirePerm).
//
// Routes (mounted under /api/permissions):
//   GET    /              → catalog grouped by area, role defaults included
//   PATCH  /role/:roleName/:permissionKey   { granted: boolean }
//   GET    /user/:userId                     → user + base role + effective + overrides
//   PATCH  /user/:userId/:permissionKey      { state: 'grant'|'revoke'|'reset' }
//   GET    /users                            → list of assignable users for the picker

const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { Permission, RolePermission, UserPermission, User } = require('../models');
const { ALL_ROLES } = require('../permissions/catalog');
const { getEffectivePermissions, checkAdminNotLockedOut } = require('../permissions/service');

// GET /api/permissions
// Response:
//   {
//     roles: ['ADMIN', 'HOD', ...],
//     areas: [{
//       name: 'Events',
//       permissions: [{
//         id, key, label, description,
//         defaultRoles: ['ADMIN', 'FACULTY']  // roles that currently have it by default
//       }]
//     }]
//   }
exports.listPermissions = async (req, res) => {
  try {
    const perms = await Permission.findAll({ order: [['area', 'ASC'], ['label', 'ASC']] });
    const defaults = await RolePermission.findAll({
      attributes: ['roleName', 'permissionId'],
    });
    const byPerm = new Map();
    for (const d of defaults) {
      if (!byPerm.has(d.permissionId)) byPerm.set(d.permissionId, new Set());
      byPerm.get(d.permissionId).add(d.roleName);
    }

    const areas = new Map();
    for (const p of perms) {
      if (!areas.has(p.area)) areas.set(p.area, []);
      areas.get(p.area).push({
        id: p.id,
        key: p.key,
        label: p.label,
        description: p.description,
        defaultRoles: Array.from(byPerm.get(p.id) || []).sort(),
      });
    }
    res.json({
      roles: ALL_ROLES,
      areas: Array.from(areas.entries()).map(([name, permissions]) => ({ name, permissions })),
    });
  } catch (err) {
    console.error('listPermissions error:', err);
    res.status(500).json({ message: 'Failed to load permissions' });
  }
};

// PATCH /api/permissions/role/:roleName/:permissionKey   { granted: boolean }
// granted=true  → ensure row exists (idempotent)
// granted=false → delete row
exports.setRoleDefault = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { roleName, permissionKey } = req.params;
    const { granted } = req.body || {};
    if (!ALL_ROLES.includes(roleName)) {
      await t.rollback();
      return res.status(400).json({ message: `Unknown role: ${roleName}` });
    }
    const perm = await Permission.findOne({ where: { key: permissionKey }, transaction: t });
    if (!perm) { await t.rollback(); return res.status(404).json({ message: 'Permission not found' }); }

    if (granted) {
      await RolePermission.findOrCreate({
        where: { roleName, permissionId: perm.id },
        defaults: { roleName, permissionId: perm.id },
        transaction: t,
      });
    } else {
      await RolePermission.destroy({
        where: { roleName, permissionId: perm.id },
        transaction: t,
      });
    }

    // Self-lockout guard
    const lockoutMsg = await checkAdminNotLockedOut(req.user, t);
    if (lockoutMsg) {
      await t.rollback();
      return res.status(400).json({ message: lockoutMsg, code: 'WOULD_LOCK_OUT_SELF' });
    }
    await t.commit();
    res.json({ ok: true, roleName, permissionKey, granted: !!granted });
  } catch (err) {
    await t.rollback();
    console.error('setRoleDefault error:', err);
    res.status(500).json({ message: 'Failed to update' });
  }
};

// GET /api/permissions/user/:userId
exports.getUserPermissions = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole', 'department', 'status'],
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const baseRoleSet = new Set(
      (await RolePermission.findAll({
        where: { roleName: user.approvedRole },
        attributes: ['permissionId'],
        include: [{ model: Permission, as: 'Permission', attributes: ['key'] }],
      })).map((rp) => rp.Permission.key),
    );
    const overrides = await UserPermission.findAll({
      where: { userId: user.id },
      include: [{ model: Permission, as: 'Permission', attributes: ['id', 'key', 'label', 'area'] }],
    });
    const effective = await getEffectivePermissions({ id: user.id, role: user.approvedRole });
    res.json({
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email,
              role: user.approvedRole, department: user.department, status: user.status },
      baseRolePermissions: Array.from(baseRoleSet).sort(),
      overrides: overrides.map((o) => ({
        key: o.Permission.key,
        label: o.Permission.label,
        area: o.Permission.area,
        granted: o.granted,
      })),
      effective: Array.from(effective).sort(),
    });
  } catch (err) {
    console.error('getUserPermissions error:', err);
    res.status(500).json({ message: 'Failed to load user permissions' });
  }
};

// PATCH /api/permissions/user/:userId/:permissionKey   { state: 'grant'|'revoke'|'reset' }
exports.setUserOverride = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { userId, permissionKey } = req.params;
    const { state } = req.body || {};
    if (!['grant', 'revoke', 'reset'].includes(state)) {
      await t.rollback();
      return res.status(400).json({ message: 'state must be grant|revoke|reset' });
    }
    const user = await User.findByPk(userId, { transaction: t });
    if (!user) { await t.rollback(); return res.status(404).json({ message: 'User not found' }); }
    const perm = await Permission.findOne({ where: { key: permissionKey }, transaction: t });
    if (!perm) { await t.rollback(); return res.status(404).json({ message: 'Permission not found' }); }

    if (state === 'reset') {
      await UserPermission.destroy({
        where: { userId, permissionId: perm.id },
        transaction: t,
      });
    } else {
      const granted = state === 'grant';
      const [row, created] = await UserPermission.findOrCreate({
        where: { userId, permissionId: perm.id },
        defaults: { userId, permissionId: perm.id, granted },
        transaction: t,
      });
      if (!created && row.granted !== granted) await row.update({ granted }, { transaction: t });
    }

    // Self-lockout guard — only relevant if the affected user IS the caller
    if (userId === req.user.id) {
      const lockoutMsg = await checkAdminNotLockedOut(req.user, t);
      if (lockoutMsg) {
        await t.rollback();
        return res.status(400).json({ message: lockoutMsg, code: 'WOULD_LOCK_OUT_SELF' });
      }
    }
    await t.commit();
    res.json({ ok: true, userId, permissionKey, state });
  } catch (err) {
    await t.rollback();
    console.error('setUserOverride error:', err);
    res.status(500).json({ message: 'Failed to update override' });
  }
};

// GET /api/permissions/users  — slim list for the picker
exports.listUsers = async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim().toLowerCase();
    const where = { status: { [Op.in]: ['ACTIVE', 'APPROVED'] } };
    const users = await User.findAll({
      where,
      attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole', 'department'],
      order: [['firstName', 'ASC']],
      limit: 1000,
    });
    const filtered = q
      ? users.filter((u) => {
          const name = `${u.firstName} ${u.lastName || ''}`.toLowerCase();
          return name.includes(q) || u.email.toLowerCase().includes(q);
        })
      : users;
    res.json({ users: filtered });
  } catch (err) {
    console.error('listUsers error:', err);
    res.status(500).json({ message: 'Failed to list users' });
  }
};
