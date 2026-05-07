const { sequelize } = require('./src/config/database');

const migrate = async () => {
  try {
    console.log('Starting migration: make onboardedBy nullable...');
    
    // Alter the column to allow NULL (using VARCHAR for MySQL compatibility)
    await sequelize.query(`
      ALTER TABLE student_sessions 
      MODIFY COLUMN onboarded_by VARCHAR(36) NULL;
    `);
    
    console.log('✅ Migration successful: onboarded_by is now nullable');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
