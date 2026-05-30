const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Every report route requires an authenticated ADMIN.
router.use(authenticateToken, authorizeRole('ADMIN', 'HOD'));

// Metadata
router.get('/types', reportController.listReports);
router.get('/sessions', reportController.listSessions);

// Session-scoped reports
router.get('/students/master', reportController.studentsMaster);
router.get('/students/profiles', reportController.studentsProfilesFull);
router.get('/sip/details', reportController.sipDetails);
router.get('/sip/qa', reportController.sipQA);
router.get('/assessments/summary', reportController.assessmentSummary);
router.get('/mentors/teams', reportController.mentorTeams);

// Non-session-scoped
router.get('/users/status', reportController.usersStatus);

module.exports = router;
