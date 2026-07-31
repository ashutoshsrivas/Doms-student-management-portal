require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./config/database');
const bootstrap = require('./bootstrap');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const studentProfileRoutes = require('./routes/studentProfileRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const rubricRoutes = require('./routes/rubricRoutes');
const mentorRoutes = require('./routes/mentorRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const jobMatchingRoutes = require('./routes/jobMatchingRoutes');
const sipRoutes = require('./routes/sipRoutes');
const sipRequirementRoutes = require('./routes/sipRequirementRoutes');
const sipQuestionRoutes = require('./routes/sipQuestionRoutes');
const fileManagementRoutes = require('./routes/fileManagementRoutes');
const reportRoutes = require('./routes/reportRoutes');
const publicProfileRoutes = require('./routes/publicProfileRoutes');
const shareLinkRoutes = require('./routes/shareLinkRoutes');
const facultyTaskRoutes = require('./routes/facultyTaskRoutes');
const facultyNoteRoutes = require('./routes/facultyNoteRoutes');
const facultyGroupRoutes = require('./routes/facultyGroupRoutes');
const eventRoutes = require('./routes/eventRoutes');
const landingRoutes = require('./routes/landingRoutes');
const classRoutes = require('./routes/classRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const mentorReportRoutes = require('./routes/mentorReportRoutes');
const mentorFeedbackRoutes = require('./routes/mentorFeedbackRoutes');
const notificationPromptRoutes = require('./routes/notificationPromptRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware - CORS must be before routes
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging middleware (no bodies, no PII)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.method === 'DELETE' || req.url.includes('certificate') || req.url.includes('submission')) {
      console.log(`[REQUEST] ${req.method} ${req.url}`);
    }
    next();
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api', studentProfileRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/rubrics', rubricRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/job-matching', jobMatchingRoutes);
app.use('/api/sip', sipRoutes);
app.use('/api/sip-requirements', sipRequirementRoutes);
app.use('/api/sip-questions', sipQuestionRoutes);
app.use('/api/file-management', fileManagementRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/public', publicProfileRoutes);
app.use('/api/share-links', shareLinkRoutes);
app.use('/api/faculty-tasks', facultyTaskRoutes);
app.use('/api/faculty-notes', facultyNoteRoutes);
app.use('/api/faculty-groups', facultyGroupRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/landing', landingRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/mentor-report', mentorReportRoutes);
app.use('/api/mentor-feedback', mentorFeedbackRoutes);
app.use('/api/notification-prompts', notificationPromptRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// 404 catch-all for debugging
app.use((req, res, next) => {
  console.log(`[404] No route found for: ${req.method} ${req.url}`);
  next();
});

// Error handling
app.use(errorHandler);

// Database sync and server start
const PORT = process.env.PORT || 4000;

async function start() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection successful');

    // Sync models - don't use alter due to MySQL key limit (max 64 keys per table)
    await sequelize.sync({ force: false });
    console.log('Database models synced');
    
    // Add rubricId column if it doesn't exist
    try {
      await sequelize.query(`
        ALTER TABLE assessment_submissions 
        ADD COLUMN rubric_id CHAR(36) NULL DEFAULT NULL
      `);
      console.log('Added rubric_id column to assessment_submissions');
    } catch (error) {
      if (error.message && error.message.includes('Duplicate column')) {
        console.log('rubric_id column already exists');
      } else if (!error.message.includes('already exists')) {
        console.error('Error adding rubric_id column:', error.message);
      }
    }

    // Add resume and certificate document columns to student_profiles if missing
    try {
      await sequelize.query(`
        ALTER TABLE student_profiles 
        ADD COLUMN resume VARCHAR(1024) NULL
      `);
      console.log('Added resume column to student_profiles');
    } catch (error) {
      if (error.message && error.message.includes('Duplicate column')) {
        console.log('resume column already exists');
      } else if (!error.message.includes('already exists')) {
        console.error('Error adding resume column:', error.message);
      }
    }

    try {
      await sequelize.query(`
        ALTER TABLE student_profiles
        ADD COLUMN certificate_documents JSON NULL DEFAULT '[]'
      `);
      console.log('Added certificate_documents column to student_profiles');
    } catch (error) {
      if (error.message && error.message.includes('Duplicate column')) {
        console.log('certificate_documents column already exists');
      } else if (!error.message.includes('already exists')) {
        console.error('Error adding certificate_documents column:', error.message);
      }
    }

    // Add sipEnabled column to academic_sessions if missing
    try {
      await sequelize.query(`
        ALTER TABLE academic_sessions
        ADD COLUMN sip_enabled BOOLEAN DEFAULT FALSE
      `);
      console.log('Added sip_enabled column to academic_sessions');
    } catch (error) {
      if (error.message && error.message.includes('Duplicate column')) {
        console.log('sip_enabled column already exists');
      } else if (!error.message.includes('already exists')) {
        console.error('Error adding sip_enabled column:', error.message);
      }
    }

    // Create sip_questions table if missing
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS sip_questions (
          id CHAR(36) PRIMARY KEY,
          session_id CHAR(36) NOT NULL,
          question LONGTEXT NOT NULL,
          description LONGTEXT,
          created_by CHAR(36) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);
      console.log('Created sip_questions table');
    } catch (error) {
      console.log('sip_questions table already exists or error:', error.message);
    }

    // Create sip_question_answers table if missing
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS sip_question_answers (
          id CHAR(36) PRIMARY KEY,
          question_id CHAR(36) NOT NULL,
          sip_id CHAR(36) NOT NULL,
          answer_text LONGTEXT,
          answer_document VARCHAR(1024),
          submitted_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (question_id) REFERENCES sip_questions(id) ON DELETE CASCADE,
          FOREIGN KEY (sip_id) REFERENCES sips(id) ON DELETE CASCADE
        )
      `);
      console.log('Created sip_question_answers table');
    } catch (error) {
      console.log('sip_question_answers table already exists or error:', error.message);
    }

    // Fix assessment_responses foreign key constraint to CASCADE on delete
    try {
      await sequelize.query(`
        ALTER TABLE assessment_responses
        DROP FOREIGN KEY assessment_responses_ibfk_2
      `);
      console.log('Dropped old assessment_responses foreign key');
    } catch (error) {
      if (!error.message.includes("can't find file")) {
        console.log('Could not drop old FK (may already be dropped):', error.message);
      }
    }

    try {
      await sequelize.query(`
        ALTER TABLE assessment_responses
        ADD CONSTRAINT assessment_responses_ibfk_2
        FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE
      `);
      console.log('Added CASCADE delete constraint to assessment_responses.question_id');
    } catch (error) {
      if (error.message && error.message.includes('Duplicate')) {
        console.log('Constraint already exists');
      } else {
        console.log('Constraint update completed or error:', error.message);
      }
    }

    // Add priority + admin-remark columns to faculty_tasks if missing.
    // sequelize.sync() creates the table on first deploy; these ALTERs are
    // for subsequent deploys to existing installs.
    const facultyTaskColumns = [
      { name: 'priority', ddl: "ENUM('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM'" },
      { name: 'admin_remark', ddl: 'TEXT NULL' },
      { name: 'remarked_at', ddl: 'DATETIME NULL' },
      { name: 'remarked_by', ddl: 'CHAR(36) NULL' },
      { name: 'group_task_id', ddl: 'CHAR(36) NULL' },
      { name: 'shared_completion', ddl: 'BOOLEAN NOT NULL DEFAULT FALSE' },
      { name: 'submitted_late', ddl: 'BOOLEAN NOT NULL DEFAULT FALSE' },
      { name: 'extension_status', ddl: "ENUM('PENDING','APPROVED','REJECTED') NULL" },
      { name: 'extension_requested_deadline', ddl: 'DATETIME NULL' },
      { name: 'extension_request_reason', ddl: 'TEXT NULL' },
      { name: 'extension_requested_at', ddl: 'DATETIME NULL' },
      { name: 'extension_responded_by', ddl: 'CHAR(36) NULL' },
      { name: 'extension_responded_at', ddl: 'DATETIME NULL' },
      { name: 'extension_response_reason', ddl: 'TEXT NULL' },
      // Assigner-side approval of a completed task. Positive-delta
      // effects on the accuracy score only apply once approved_at is set.
      { name: 'approved_at', ddl: 'DATETIME NULL' },
      { name: 'approved_by', ddl: 'CHAR(36) NULL' },
      // Additional supporting documents the assignee can attach after
      // submission — even post-approval. Stored as a JSON array of
      // { url, name, mime, uploadedAt, uploadedBy }.
      { name: 'extra_documents', ddl: "JSON NULL" },
    ];
    for (const col of facultyTaskColumns) {
      try {
        await sequelize.query(`ALTER TABLE faculty_tasks ADD COLUMN ${col.name} ${col.ddl}`);
        console.log(`Added ${col.name} column to faculty_tasks`);
      } catch (error) {
        if (error.message && error.message.includes('Duplicate column')) {
          console.log(`${col.name} column already exists on faculty_tasks`);
        } else if (error.message && error.message.includes("doesn't exist")) {
          // Table not created yet (very first deploy) — sync() will create it
          // with the columns already in place. Safe to ignore.
        } else {
          console.error(`Error adding ${col.name} to faculty_tasks:`, error.message);
        }
      }
    }

    // notification_prompts + notification_prompt_responses: file
    // attachments (added after the tables shipped without them) and
    // FILE prompt type on the ENUM.
    const notificationPromptCols = [
      { name: 'attachment_url', ddl: 'VARCHAR(1024) NULL' },
      { name: 'attachment_name', ddl: 'VARCHAR(255) NULL' },
      { name: 'attachment_mime', ddl: 'VARCHAR(120) NULL' },
    ];
    for (const col of notificationPromptCols) {
      try {
        await sequelize.query(`ALTER TABLE notification_prompts ADD COLUMN ${col.name} ${col.ddl}`);
        console.log(`Added ${col.name} column to notification_prompts`);
      } catch (error) {
        if (error.message && error.message.includes('Duplicate column')) {
          console.log(`${col.name} column already exists on notification_prompts`);
        } else if (error.message && error.message.includes("doesn't exist")) {
          // Table not created yet — sync() will create with columns in place.
        } else {
          console.error(`Error adding ${col.name} to notification_prompts:`, error.message);
        }
      }
    }
    // Add FILE to promptType ENUM
    try {
      await sequelize.query(
        `ALTER TABLE notification_prompts MODIFY COLUMN prompt_type ENUM('ACK','TEXT','CHOICE','FILE') NOT NULL DEFAULT 'ACK'`,
      );
      console.log('notification_prompts.prompt_type ENUM includes FILE');
    } catch (error) {
      if (!(error.message && error.message.includes("doesn't exist"))) {
        console.error('Error updating prompt_type ENUM:', error.message);
      }
    }
    const notificationResponseCols = [
      { name: 'response_file_url', ddl: 'VARCHAR(1024) NULL' },
      { name: 'response_file_name', ddl: 'VARCHAR(255) NULL' },
      { name: 'response_file_mime', ddl: 'VARCHAR(120) NULL' },
    ];
    for (const col of notificationResponseCols) {
      try {
        await sequelize.query(`ALTER TABLE notification_prompt_responses ADD COLUMN ${col.name} ${col.ddl}`);
        console.log(`Added ${col.name} column to notification_prompt_responses`);
      } catch (error) {
        if (error.message && error.message.includes('Duplicate column')) {
          console.log(`${col.name} column already exists on notification_prompt_responses`);
        } else if (error.message && error.message.includes("doesn't exist")) {
          // Table not created yet — sync() will handle it.
        } else {
          console.error(`Error adding ${col.name} to notification_prompt_responses:`, error.message);
        }
      }
    }

    // Add created_by column to mentor_teams if missing — used to scope
    // CHAIR_HEAD monitoring to teams they personally created.
    try {
      await sequelize.query('ALTER TABLE mentor_teams ADD COLUMN created_by CHAR(36) NULL');
      console.log('Added created_by column to mentor_teams');
    } catch (error) {
      if (error.message && error.message.includes('Duplicate column')) {
        console.log('created_by column already exists on mentor_teams');
      } else {
        console.error('Error adding created_by to mentor_teams:', error.message);
      }
    }

    // Add CHAIR_HEAD to the users.requested_role and users.approved_role
    // ENUMs if it isn't already a member. Safe to re-run: MySQL silently
    // succeeds when the new ENUM list already contains every existing value.
    try {
      const ENUM_VALUES = "'ADMIN','HOD','FACULTY','COORDINATOR','PLACEMENT_COORDINATOR','TRAINER','STUDENT','MENTOR','CHAIR_HEAD'";
      await sequelize.query(`ALTER TABLE users MODIFY COLUMN requested_role ENUM(${ENUM_VALUES}) NOT NULL`);
      await sequelize.query(`ALTER TABLE users MODIFY COLUMN approved_role ENUM(${ENUM_VALUES}) NULL`);
      console.log('users.requested_role / approved_role ENUM includes CHAIR_HEAD');
    } catch (e) {
      console.error('Error extending users role ENUMs:', e.message);
    }

    // Bootstrap default admin user
    await bootstrap();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

module.exports = { app };
