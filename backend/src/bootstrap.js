const { User, Role, UserRole } = require('./models');
const bcrypt = require('bcryptjs');

async function bootstrap() {
  try {
    // Check if admin user exists
    const adminUser = await User.findOne({
      where: { email: 'admin@test.com' },
    });

    if (adminUser) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const newAdmin = await User.create({
      email: 'admin@test.com',
      firstName: 'System',
      lastName: 'Admin',
      password: 'password123',
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

    console.log('✓ Bootstrap admin user created: admin@test.com / password123');
  } catch (error) {
    console.error('Bootstrap error:', error);
  }
}

module.exports = bootstrap;
