const { User, Role } = require('./models');

async function bootstrap() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  // No-op unless explicitly opted-in via env vars. Prevents shipping a
  // hardcoded admin account to any environment.
  if (!email || !password) {
    return;
  }

  if (password.length < 12) {
    console.error('Bootstrap admin password must be at least 12 characters; skipping');
    return;
  }

  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return;
    }

    const newAdmin = await User.create({
      email,
      firstName: 'System',
      lastName: 'Admin',
      password,
      requestedRole: 'ADMIN',
      approvedRole: 'ADMIN',
      status: 'ACTIVE',
    });

    const [adminRole] = await Role.findOrCreate({
      where: { name: 'ADMIN' },
      defaults: { name: 'ADMIN' },
    });

    await newAdmin.addRole(adminRole);

    console.log(`Bootstrap admin user created: ${email}`);
  } catch (error) {
    console.error('Bootstrap error:', error.name);
  }
}

module.exports = bootstrap;
