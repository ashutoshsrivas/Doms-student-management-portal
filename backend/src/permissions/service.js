// Permission-check service + Express middleware.
//
// The check is per-request and does ONE DB call (the user's effective
// permission key set). Keep it short — we may eventually add a 30s
// in-process cache keyed by user id, but for now correctness > speed.

const { Op } = require('sequelize');
const { Permission, RolePermission, UserPermission } = require('../models');

/**
 * Compute the effective permission keys for a user.
 * = role defaults  UNION  user overrides where granted=true
 *   MINUS user overrides where granted=false
 *
 * Returns Set<string>.
 */
async function getEffectivePermissions(user) {
  if (!user || !user.role) return new Set();
  // Role defaults: which perms does this base role have?
  const rolePerms = await RolePermission.findAll({
    where: { roleName: user.role },
    attributes: ['permissionId'],
    include: [{ model: Permission, as: 'Permission', attributes: ['key'] }],
  });
  const effective = new Set();
  for (const rp of rolePerms) {
    if (rp.Permission?.key) effective.add(rp.Permission.key);
  }
  // User overrides
  if (user.id) {
    const overrides = await UserPermission.findAll({
      where: { userId: user.id },
      attributes: ['granted'],
      include: [{ model: Permission, as: 'Permission', attributes: ['key'] }],
    });
    for (const uo of overrides) {
      const k = uo.Permission?.key;
      if (!k) continue;
      if (uo.granted) effective.add(k);
      else effective.delete(k);
    }
  }
  return effective;
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

module.exports = { getEffectivePermissions, hasPermission, requirePerm, requireAnyPerm };
