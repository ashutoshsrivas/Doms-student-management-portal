// Idempotent permissions seeder. Runs on backend startup. Safe to run any
// number of times.
//
// Behavior:
//  - For each catalog entry: upsert the `permissions` row (by `key`) so
//    label/area/description updates flow through but the UUID stays
//    stable across restarts.
//  - For each (role, perm) listed in `defaultRoles`: ONLY insert the
//    `role_permissions` row if no row exists for that (role, perm) pair
//    yet. This means admin edits to defaults (toggling something off)
//    are never undone by a restart.
//  - We do NOT remove permissions or role_permissions automatically.
//    Deleting a key from the catalog leaves the DB row alone (safe).

const { CATALOG } = require('./catalog');

async function seedPermissions({ Permission, RolePermission }) {
  let createdPerms = 0;
  let updatedPerms = 0;
  let createdDefaults = 0;

  for (const entry of CATALOG) {
    const [perm, created] = await Permission.findOrCreate({
      where: { key: entry.key },
      defaults: {
        key: entry.key,
        label: entry.label,
        area: entry.area,
        description: entry.description || null,
      },
    });
    if (created) createdPerms += 1;
    else {
      // Keep label / area / description in sync with catalog (cheap)
      const needsUpdate = perm.label !== entry.label ||
        perm.area !== entry.area ||
        (perm.description || null) !== (entry.description || null);
      if (needsUpdate) {
        await perm.update({
          label: entry.label,
          area: entry.area,
          description: entry.description || null,
        });
        updatedPerms += 1;
      }
    }

    // Default role mappings (only insert when missing — never overwrite
    // admin edits)
    for (const roleName of entry.defaultRoles || []) {
      const [, defCreated] = await RolePermission.findOrCreate({
        where: { roleName, permissionId: perm.id },
        defaults: { roleName, permissionId: perm.id },
      });
      if (defCreated) createdDefaults += 1;
    }
  }

  if (createdPerms || updatedPerms || createdDefaults) {
    console.log(
      `[permissions] seeded: ${createdPerms} new perm(s), ` +
      `${updatedPerms} updated, ${createdDefaults} new default mapping(s)`,
    );
  }
}

module.exports = { seedPermissions };
