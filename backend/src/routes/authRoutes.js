const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, upload.single('profileImage'), authController.updateProfile);
router.post('/logout', authenticateToken, authController.logout);
router.post('/reset-password', authenticateToken, authController.resetPassword);

// Admin only routes
router.get(
  '/pending-requests',
  authenticateToken,
  authorizeRole('ADMIN'),
  authController.getPendingRequests
);
router.post(
  '/approve-user',
  authenticateToken,
  authorizeRole('ADMIN'),
  authController.approveUser
);
router.post(
  '/reject-user',
  authenticateToken,
  authorizeRole('ADMIN'),
  authController.rejectUser
);

module.exports = router;
