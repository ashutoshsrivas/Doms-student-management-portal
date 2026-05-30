const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { excelUpload } = require('../middleware/upload');

// Registration link routes (PUBLIC - must be first to avoid catching as :id)
router.get('/registration/:token/details', sessionController.getRegistrationLinkDetails);
router.post('/registration/:token/register', sessionController.registerStudent);

// Public routes
router.get('/', authenticateToken, sessionController.getAllSessions);

// Student specific routes (MUST come before :id routes)
router.get('/me/session', authenticateToken, sessionController.getStudentEnrolledSession);
router.get('/me/categories', authenticateToken, sessionController.getStudentEnrolledCategories);

// Admin only routes
router.post(
  '/',
  authenticateToken,
  authorizeRole('ADMIN', 'HOD'),
  sessionController.createSession
);
router.put(
  '/:sessionId',
  authenticateToken,
  authorizeRole('ADMIN', 'HOD'),
  sessionController.updateSession
);
router.post(
  '/:sessionId/activate',
  authenticateToken,
  authorizeRole('ADMIN', 'HOD'),
  sessionController.activateSession
);
router.post(
  '/:sessionId/onboard-student',
  authenticateToken,
  authorizeRole('ADMIN', 'HOD'),
  sessionController.onboardStudent
);
router.post(
  '/:sessionId/upload-students',
  authenticateToken,
  authorizeRole('ADMIN', 'HOD'),
  excelUpload.single('file'),
  (err, req, res, next) => {
    // Handle multer errors
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ message: err.message || 'File upload failed' });
    }
    next();
  },
  sessionController.uploadStudents
);
router.post(
  '/:sessionId/create-registration-link',
  authenticateToken,
  authorizeRole('ADMIN', 'HOD'),
  sessionController.createRegistrationLink
);
router.get(
  '/:sessionId/students',
  authenticateToken,
  sessionController.getSessionStudents
);
router.delete(
  '/:studentSessionId/drop-student',
  authenticateToken,
  authorizeRole('ADMIN', 'HOD'),
  sessionController.dropStudent
);

// Category Management Routes (MUST come before generic /:id route)
router.post(
  '/:sessionId/categories',
  authenticateToken,
  authorizeRole('ADMIN', 'HOD'),
  sessionController.createCategory
);
router.get(
  '/:sessionId/categories',
  authenticateToken,
  sessionController.getSessionCategories
);
router.put(
  '/categories/:categoryId',
  authenticateToken,
  authorizeRole('ADMIN', 'HOD'),
  sessionController.updateCategory
);
router.delete(
  '/categories/:categoryId',
  authenticateToken,
  authorizeRole('ADMIN', 'HOD'),
  sessionController.deleteCategory
);
router.post(
  '/categories/:categoryId/assign',
  authenticateToken,
  authorizeRole('ADMIN', 'HOD'),
  sessionController.assignStudentToCategory
);
router.post(
  '/categories/:categoryId/assign-bulk',
  authenticateToken,
  authorizeRole('ADMIN', 'HOD'),
  sessionController.bulkAssignStudentsToCategory
);
router.post(
  '/categories/:categoryId/remove',
  authenticateToken,
  authorizeRole('ADMIN', 'HOD'),
  sessionController.removeStudentFromCategory
);
router.get(
  '/categories/:categoryId/students',
  authenticateToken,
  sessionController.getStudentsByCategory
);
router.get(
  '/student-sessions/:studentSessionId/categories',
  authenticateToken,
  sessionController.getStudentCategories
);

// Generic session routes (MUST be last to avoid catching specific routes)
router.get('/:id', authenticateToken, sessionController.getSessionById);

module.exports = router;

