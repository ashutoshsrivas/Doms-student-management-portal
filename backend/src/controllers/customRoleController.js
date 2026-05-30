// Admin-defined custom roles. All endpoints require admin.manage_roles.

const { Op } = require('sequelize');
const { CustomRole, CustomRolePermission, UserCustomRole, Permission, User } = require('../models');

const includeAll = {
  model: CustomRolePermission,
  as: 'Permissions',
  include: [{ model: Permission, as: 'Permission', attributes: ['id', 'key', 'label', 'area'] }],
};
const includeCreator = { model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName', 'email'] };

const sanitiseName = (s) => (s || '').toString().trim().slice(0, 100);

// GET /api/custom-roles
exports.list = async (req, res) => {
  try {
    const rows = await CustomRole.findAll({
      include: [includeAll, includeCreator],
      order: [['name', 'ASC']],
    });
    // Attach assignment counts (cheap)
    const ids = rows.map((r) => r.id);
    const counts = ids.length
      ? await UserCustomRole.findAll({
          where: { customRoleId: { [Op.in]: ids } },
          attributes: ['customRoleId'],
        })
      : [];
    const countMap = new Map();
    for (const a of counts) countMap.set(a.customRoleId, (countMap.get(a.customRoleId) || 0) + 1);
    res.json({
      customRoles: rows.map((r) => ({
        id: r.id, name: r.name, description: r.description,
        createdAt: r.createdAt, Creator: r.Creator,
        permissionKeys: (r.Permissions || []).map((p) => p.Permission?.key).filter(Boolean),
        assigneeCount: countMap.get(r.id) || 0,
      })),
    });
  } catch (err) {
    console.error('CustomRole list error:', err);
    res.status(500).json({ message: 'Failed to load custom roles' });
  }
};

// GET /api/custom-roles/:id  → full detail + assignees
exports.get = async (req, res) => {
  try {
    const role = await CustomRole.findByPk(req.params.id, { include: [includeAll, includeCreator] });
    if (!role) return res.status(404).json({ message: 'Not found' });
    const assignments = await UserCustomRole.findAll({
      where: { customRoleId: role.id },
      include: [{ model: User, as: 'User', attributes: ['id', 'firstName', 'lastName', 'email', 'approvedRole', 'department'] }],
    });
    res.json({
      customRole: {
        id: role.id, name: role.name, description: role.description,
        createdAt: role.createdAt, Creator: role.Creator,
        permissionKeys: (role.Permissions || []).map((p) => p.Permission?.key).filter(Boolean),
        assignees: assignments.map((a) => a.User).filter(Boolean),
      },
    });
  } catch (err) {
    console.error('CustomRole get error:', err);
    res.status(500).json({ message: 'Failed' });
  }
};

// POST /api/custom-roles   { name, description?, permissionKeys?: [] }
exports.create = async (req, res) => {
  try {
    const name = sanitiseName(req.body?.name);
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const existing = await CustomRole.findOne({ where: { name } });
    if (existing) return res.status(400).json({ message: 'A custom role with that name already exists' });

    const role = await CustomRole.create({
      name,
      description: req.body?.description ? String(req.body.description).slice(0, 500) : null,
      createdBy: req.user.id,
    });

    const keys = Array.isArray(req.body?.permissionKeys) ? req.body.permissionKeys : [];
    if (keys.length) {
      const perms = await Permission.findAll({ where: { key: { [Op.in]: keys } }, attributes: ['id'] });
      await CustomRolePermission.bulkCreate(
        perms.map((p) => ({ customRoleId: role.id, permissionId: p.id })),
        { ignoreDuplicates: true },
      );
    }
    const full = await CustomRole.findByPk(role.id, { include: [includeAll, includeCreator] });
    res.status(201).json({ customRole: full });
  } catch (err) {
    console.error('CustomRole create error:', err);
    res.status(500).json({ message: 'Failed to create' });
  }
};

// PATCH /api/custom-roles/:id   { name?, description?, permissionKeys? (REPLACES the set) }
exports.update = async (req, res) => {
  try {
    const role = await CustomRole.findByPk(req.params.id);
    if (!role) return res.status(404).json({ message: 'Not found' });
    const patch = {};
    if (req.body?.name !== undefined) {
      const n = sanitiseName(req.body.name);
      if (!n) return res.status(400).json({ message: 'Name cannot be empty' });
      patch.name = n;
    }
    if (req.body?.description !== undefined) {
      patch.description = req.body.description ? String(req.body.description).slice(0, 500) : null;
    }
    await role.update(patch);

    // If permissionKeys is provided, REPLACE the permission set (most intuitive)
    if (Array.isArray(req.body?.permissionKeys)) {
      const desiredKeys = req.body.permissionKeys;
      const desiredPerms = await Permission.findAll({
        where: { key: { [Op.in]: desiredKeys } },
        attributes: ['id', 'key'],
      });
      const desiredIds = new Set(desiredPerms.map((p) => p.id));
      const current = await CustomRolePermission.findAll({ where: { customRoleId: role.id } });
      const currentIds = new Set(current.map((c) => c.permissionId));
      // Delete removed
      const toDelete = current.filter((c) => !desiredIds.has(c.permissionId));
      if (toDelete.length) {
        await CustomRolePermission.destroy({
          where: { id: { [Op.in]: toDelete.map((t) => t.id) } },
        });
      }
      // Add new
      const toAdd = desiredPerms.filter((p) => !currentIds.has(p.id));
      if (toAdd.length) {
        await CustomRolePermission.bulkCreate(
          toAdd.map((p) => ({ customRoleId: role.id, permissionId: p.id })),
          { ignoreDuplicates: true },
        );
      }
    }
    const full = await CustomRole.findByPk(role.id, { include: [includeAll, includeCreator] });
    res.json({ customRole: full });
  } catch (err) {
    console.error('CustomRole update error:', err);
    res.status(500).json({ message: 'Failed' });
  }
};

// DELETE /api/custom-roles/:id  → cascades to assignments + permissions
exports.remove = async (req, res) => {
  try {
    const role = await CustomRole.findByPk(req.params.id);
    if (!role) return res.status(404).json({ message: 'Not found' });
    await role.destroy();
    res.json({ message: 'Custom role deleted', id: req.params.id });
  } catch (err) {
    console.error('CustomRole delete error:', err);
    res.status(500).json({ message: 'Failed' });
  }
};

// POST /api/custom-roles/:id/assign   { userId }
exports.assign = async (req, res) => {
  try {
    const userId = req.body?.userId;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    const role = await CustomRole.findByPk(req.params.id);
    if (!role) return res.status(404).json({ message: 'Custom role not found' });
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await UserCustomRole.findOrCreate({
      where: { userId, customRoleId: role.id },
      defaults: { userId, customRoleId: role.id },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('CustomRole assign error:', err);
    res.status(500).json({ message: 'Failed to assign' });
  }
};

// DELETE /api/custom-roles/:id/assign/:userId
exports.unassign = async (req, res) => {
  try {
    const removed = await UserCustomRole.destroy({
      where: { customRoleId: req.params.id, userId: req.params.userId },
    });
    if (!removed) return res.status(404).json({ message: 'Assignment not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('CustomRole unassign error:', err);
    res.status(500).json({ message: 'Failed' });
  }
};
