const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/mentorReportController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/sessions', authorizeRole('ADMIN', 'HOD'), ctrl.listSessions);
router.get('/', authorizeRole('ADMIN', 'HOD'), ctrl.getFullReport);

module.exports = router;
