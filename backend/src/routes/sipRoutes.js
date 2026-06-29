const express = require('express');
const router = express.Router();
const sipController = require('../controllers/sipController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { resumeUpload } = require('../middleware/upload');

// SIP CRUD Routes - more specific routes first
router.get('/session/:sessionId', authenticateToken, sipController.getSIPsBySession);
// Faculty/mentor view of their mentees' SIPs + weekly updates. Must be
// defined BEFORE the /:sipId route, otherwise Express matches "my-mentees"
// as a sipId param.
router.get(
  '/my-mentees',
  authenticateToken,
  authorizeRole('FACULTY', 'CHAIR_HEAD', 'MENTOR', 'HOD', 'ADMIN'),
  sipController.getMyMenteesSIPs
);
// SIP-wide statistics + per-student compliance report. Must be defined
// before /:sipId. Used by /admin/sip-monitor (admin/HOD/coordinator).
router.get(
  '/monitor',
  authenticateToken,
  authorizeRole('ADMIN', 'HOD', 'PLACEMENT_COORDINATOR'),
  sipController.getMonitor
);
router.post('/', authenticateToken, sipController.createSIP);
router.get('/:sipId', authenticateToken, sipController.getSIPDetails);
router.put('/:sipId', authenticateToken, sipController.updateSIP);
router.delete('/:sipId', authenticateToken, sipController.deleteSIP);

// Weekly Updates Routes
router.post('/:sipId/weekly-updates', authenticateToken, sipController.submitWeeklyUpdate);
router.get('/:sipId/weekly-updates', authenticateToken, sipController.getWeeklyUpdates);

// File Upload Routes
router.post('/:sipId/upload-certificate', authenticateToken, resumeUpload.single('certificate'), sipController.uploadCertificate);
router.post('/:sipId/upload-feedback', authenticateToken, resumeUpload.single('feedback'), sipController.uploadFeedback);

module.exports = router;
