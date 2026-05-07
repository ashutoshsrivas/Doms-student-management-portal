#!/usr/bin/env node

/**
 * Migration Script: Add 'IN_PROGRESS' status to assessment_submissions table
 * Run this once after updating the model definition
 * 
 * Usage: node migrate-add-in-progress.js
 */

const { sequelize } = require('./src/config/database');

async function runMigration() {
  try {
    console.log('Starting migration: Adding IN_PROGRESS status to assessment_submissions...');
    
    // Alter the ENUM column to include 'IN_PROGRESS'
    await sequelize.query(`
      ALTER TABLE assessment_submissions 
      MODIFY COLUMN status ENUM('IN_PROGRESS', 'SUBMITTED', 'GRADED') NOT NULL DEFAULT 'IN_PROGRESS'
    `);
    
    console.log('✅ Migration completed successfully!');
    console.log('   - Added IN_PROGRESS to status ENUM');
    console.log('   - Changed default to IN_PROGRESS');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.sql) {
      console.error('   SQL:', error.sql);
    }
    await sequelize.close();
    process.exit(1);
  }
}

runMigration();
