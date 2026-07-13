const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/mentorFeedbackController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Any authenticated user hits these; controller enforces the (mentor,
// student, admin/HOD) access rule.
router.get('/thread', ctrl.list);
router.post('/thread', ctrl.post);

// Student-side helper — list my mentors with last-message preview.
router.get('/my-mentors', ctrl.myMentors);

module.exports = router;
