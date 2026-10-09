const express = require('express');
const router = express.Router();
const socialMediaController = require('../controllers/socialMediaController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken);

// Everything an admin or a social-media holder can see (gated in the controller)
router.get('/overview', socialMediaController.overview);

// Access management — admin/HOD only
router.get('/managers', authorizeRole('ADMIN', 'HOD'), socialMediaController.listManagers);
router.post('/managers', authorizeRole('ADMIN', 'HOD'), socialMediaController.setManager);

module.exports = router;
