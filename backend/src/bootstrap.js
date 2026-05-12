const { User, Role, UserRole } = require('./models');

async function bootstrap() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@test.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'password123';

    // Check if admin user exists
    const adminUser = await User.findOne({
      where: { email: adminEmail },
    });

    if (adminUser) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const newAdmin = await User.create({
      email: adminEmail,
      firstName: 'System',
      lastName: 'Admin',
      password: adminPassword,
      requestedRole: 'ADMIN',
      approvedRole: 'ADMIN',
      status: 'ACTIVE',
    });

    // Get or create ADMIN role
    const [adminRole] = await Role.findOrCreate({
      where: { name: 'ADMIN' },
      defaults: { name: 'ADMIN' },
    });

    // Assign role to user
    await newAdmin.addRole(adminRole);

    console.log(`Bootstrap admin user created: ${adminEmail}`);
  } catch (error) {
    console.error('Bootstrap error:', error);
  }
}

module.exports = bootstrap;
