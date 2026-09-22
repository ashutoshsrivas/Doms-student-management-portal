const express = require('express');
const router = express.Router();
const {
  getLandingContent,
  updateLandingContent,
  resetLandingContent,
} = require('../controllers/landingController');
const { authenticateToken, authorizeRole, denyRawRoles } = require('../middleware/auth');

// Public read — the landing page hits this from the browser, unauthenticated.
router.get('/', getLandingContent);

// Admin/HOD writes
router.put('/', authenticateToken, authorizeRole('ADMIN', 'HOD'), denyRawRoles('COORDINATOR'), updateLandingContent);
router.post('/reset', authenticateToken, authorizeRole('ADMIN', 'HOD'), denyRawRoles('COORDINATOR'), resetLandingContent);

module.exports = router;
