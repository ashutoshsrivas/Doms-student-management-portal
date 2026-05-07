const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { User, UserRole, Role } = require('../models');

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

// Development only - approve user by email (temporary)
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev/approve/:email', async (req, res) => {
    try {
      const user = await User.findOne({ where: { email: req.params.email } });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Auto-approve the user
      await user.update({
        status: 'ACTIVE',
        approvedRole: user.requestedRole,
      });

      // Assign role
      let role = await Role.findOne({ where: { name: user.requestedRole } });
      if (!role) {
        role = await Role.create({
          name: user.requestedRole,
          description: `${user.requestedRole} role`,
        });
      }

      // Create UserRole association
      try {
        await user.addRole(role);
      } catch (e) {
        console.log('Role association may already exist:', e.message);
      }

      res.json({ message: 'User approved', user });
    } catch (error) {
      console.error('Dev approve error:', error);
      res.status(500).json({ message: 'Failed to approve user', error: error.message });
    }
  });
}

module.exports = router;
