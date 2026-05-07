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

// Request logging middleware
app.use((req, res, next) => {
  if (req.method === 'DELETE' || req.url.includes('certificate')) {
    console.log(`[REQUEST] ${req.method} ${req.url} - Original URL: ${req.originalUrl}`);
  }
  // Log all POST requests to submission endpoints
  if (req.method === 'POST' && req.url.includes('submission')) {
    console.log(`[REQUEST] ${req.method} ${req.url} - Original URL: ${req.originalUrl} - Body:`, req.body);
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api', studentProfileRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/rubrics', rubricRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/announcements', announcementRoutes);

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
