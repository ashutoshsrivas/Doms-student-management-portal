const { User } = require('./src/models');
const { sequelize } = require('./src/config/database');

const createUsers = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    // Create Faculty user
    const faculty = await User.findOrCreate({
      where: { email: 'faculty@example.com' },
      defaults: {
        firstName: 'John',
        lastName: 'Faculty',
        email: 'faculty@example.com',
        password: 'Faculty@123',
        requestedRole: 'FACULTY',
        approvedRole: 'FACULTY',
        status: 'ACTIVE',
        registrationNumber: 'FAC001',
      },
    });
    console.log('Faculty user:', faculty[0].toJSON());

    // Create Placement Coordinator user
    const coordinator = await User.findOrCreate({
      where: { email: 'coordinator@example.com' },
      defaults: {
        firstName: 'Jane',
        lastName: 'Coordinator',
        email: 'coordinator@example.com',
        password: 'Coordinator@123',
        requestedRole: 'PLACEMENT_COORDINATOR',
        approvedRole: 'PLACEMENT_COORDINATOR',
        status: 'ACTIVE',
        registrationNumber: 'PC001',
      },
    });
    console.log('Placement Coordinator user:', coordinator[0].toJSON());

    // Create Trainer user
    const trainer = await User.findOrCreate({
      where: { email: 'trainer@example.com' },
      defaults: {
        firstName: 'Mike',
        lastName: 'Trainer',
        email: 'trainer@example.com',
        password: 'Trainer@123',
        requestedRole: 'TRAINER',
        approvedRole: 'TRAINER',
        status: 'ACTIVE',
        registrationNumber: 'TRAIN001',
      },
    });
    console.log('Trainer user:', trainer[0].toJSON());

    console.log('\n✅ All users created successfully!');
    console.log('\nLogin credentials:');
    console.log('Faculty: faculty@example.com / Faculty@123');
    console.log('Placement Coordinator: coordinator@example.com / Coordinator@123');
    console.log('Trainer: trainer@example.com / Trainer@123');

    process.exit(0);
  } catch (error) {
    console.error('Error creating users:', error);
    process.exit(1);
  }
};

createUsers();
