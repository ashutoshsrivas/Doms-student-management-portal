const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { upload, resumeUpload } = require('../middleware/upload');

// Admin-only routes (must come before :id routes)
router.get(
  '/admin/filter',
  authenticateToken,
  authorizeRole('ADMIN'),
  userController.getUsersWithFilters
);

router.get(
  '/admin/statistics',
  authenticateToken,
  authorizeRole('ADMIN'),
  userController.getUserStatistics
);

// Get all users (Admin only)
router.get(
  '/',
  authenticateToken,
  authorizeRole('ADMIN'),
  userController.getAllUsers
);

// Search users
router.get('/search/query', authenticateToken, userController.searchUsers);

// Student profile routes (must come before /:id routes)
router.get(
  '/student-profile',
  authenticateToken,
  userController.getStudentProfile
);

router.put(
  '/student-profile',
  authenticateToken,
  userController.updateStudentProfile
);

router.post(
  '/student-profile/upload-resume',
  authenticateToken,
  resumeUpload.single('resume'),
  userController.uploadResume
);

router.post(
  '/student-profile/upload-certificate',
  authenticateToken,
  resumeUpload.single('certificate'),
  userController.uploadCertificateDocument
);

router.delete(
  '/student-profile/certificate/:documentId',
  authenticateToken,
  userController.deleteCertificateDocument
);

// Protected routes with :id parameter - SPECIFIC ROUTES MUST COME FIRST
router.post(
  '/',
  authenticateToken,
  authorizeRole('ADMIN'),
  userController.createUser
);

// Update user (Admin only)
router.put(
  '/:userId',
  authenticateToken,
  authorizeRole('ADMIN'),
  userController.updateUser
);

// Reset user password (Admin only)
router.post(
  '/:userId/reset-password',
  authenticateToken,
  authorizeRole('ADMIN'),
  userController.resetUserPassword
);

// Delete user (Admin only)
router.delete(
  '/:userId',
  authenticateToken,
  authorizeRole('ADMIN'),
  userController.deleteUser
);

// Update user role (Admin only)
router.put(
  '/:userId/role',
  authenticateToken,
  authorizeRole('ADMIN'),
  userController.updateUserRole
);

// Deactivate user (Admin only)
router.put(
  '/:userId/deactivate',
  authenticateToken,
  authorizeRole('ADMIN'),
  userController.deactivateUser
);

// Reactivate user (Admin only)
router.put(
  '/:userId/reactivate',
  authenticateToken,
  authorizeRole('ADMIN'),
  userController.reactivateUser
);

// Get user by ID - GENERAL ROUTE COMES LAST
router.get('/:id', authenticateToken, userController.getUserById);

module.exports = router;
