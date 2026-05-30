// Permission-check service + Express middleware.
//
// The check is per-request and does ONE DB call (the user's effective
// permission key set). Keep it short — we may eventually add a 30s
// in-process cache keyed by user id, but for now correctness > speed.

const { Op } = require('sequelize');
const { Permission, RolePermission, UserPermission, UserCustomRole, CustomRolePermission } = require('../models');

/**
 * Compute the effective permission keys for a user.
 * = role defaults  UNION  user overrides where granted=true
 *   MINUS user overrides where granted=false
 *
 * Returns Set<string>.
 */
// opts.transaction lets a mutation pre-check whether the caller would lose
// `admin.manage_roles` after a not-yet-committed change in the same tx.
async function getEffectivePermissions(user, opts = {}) {
  const { transaction } = opts;
  if (!user || !user.role) return new Set();
  // 1) Base role defaults
  const rolePerms = await RolePermission.findAll({
    where: { roleName: user.role },
    attributes: ['permissionId'],
    include: [{ model: Permission, as: 'Permission', attributes: ['key'] }],
    transaction,
  });
  const effective = new Set();
  for (const rp of rolePerms) {
    if (rp.Permission?.key) effective.add(rp.Permission.key);
  }
  if (!user.id) return effective;

  // 2) Assigned custom roles — UNION their permissions in
  const customAssignments = await UserCustomRole.findAll({
    where: { userId: user.id },
    attributes: ['customRoleId'],
    transaction,
  });
  if (customAssignments.length) {
    const customRoleIds = customAssignments.map((a) => a.customRoleId);
    const customPerms = await CustomRolePermission.findAll({
      where: { customRoleId: { [Op.in]: customRoleIds } },
      attributes: ['permissionId'],
      include: [{ model: Permission, as: 'Permission', attributes: ['key'] }],
      transaction,
    });
    for (const cp of customPerms) {
      if (cp.Permission?.key) effective.add(cp.Permission.key);
    }
  }

  // 3) Per-user overrides — final say
  const overrides = await UserPermission.findAll({
    where: { userId: user.id },
    attributes: ['granted'],
    include: [{ model: Permission, as: 'Permission', attributes: ['key'] }],
    transaction,
  });
  for (const uo of overrides) {
    const k = uo.Permission?.key;
    if (!k) continue;
    if (uo.granted) effective.add(k);
    else effective.delete(k);
  }
  return effective;
}

/**
 * Helper for admin endpoints — call inside a transaction after applying a
 * change. Returns null if OK; otherwise returns a string error message to
 * surface to the client. Caller is responsible for the rollback.
 */
async function checkAdminNotLockedOut(callerUser, transaction) {
  const effective = await getEffectivePermissions(callerUser, { transaction });
  if (!effective.has('admin.manage_roles')) {
    return 'This change would remove your own ability to manage roles & permissions. Refused to prevent self-lockout. ' +
      'Ask another admin to make the change, or grant yourself the permission first via a different path.';
  }
  return null;
}

/** Does this user have a specific permission key? */
async function hasPermission(user, key) {
  if (!user) return false;
  const perms = await getEffectivePermissions(user);
  return perms.has(key);
}

/**
 * Express middleware factory. Pass the permission key required to access
 * the route. ADMIN bypass intentionally NOT hard-coded — admins get
 * everything via the seed, so they pass naturally. If you remove a
 * permission from ADMIN in the UI, admin loses it.
 *
 * On 403, response: { message, missingPermission }
 */
function requirePerm(key) {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
      const ok = await hasPermission(req.user, key);
      if (!ok) {
        return res.status(403).json({
          message: `Permission denied (${key})`,
          missingPermission: key,
        });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Same as requirePerm but accepts multiple keys and passes when the user
 * has ANY of them. Useful for routes used by overlapping flows.
 */
function requireAnyPerm(...keys) {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
      const perms = await getEffectivePermissions(req.user);
      const ok = keys.some((k) => perms.has(k));
      if (!ok) {
        return res.status(403).json({
          message: `Permission denied (needs one of ${keys.join(', ')})`,
          missingAnyPermission: keys,
        });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { getEffectivePermissions, hasPermission, requirePerm, requireAnyPerm, checkAdminNotLockedOut };
