const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const {
  matchStudentsToJob,
  getStudentDetails,
} = require('../controllers/jobMatchingController');

const router = express.Router();

// Match students to job description
// POST /job-matching/match
router.post(
  '/match',
  authenticateToken,
  authorizeRole('PLACEMENT_COORDINATOR'),
  matchStudentsToJob
);

// Get detailed student profile
// GET /job-matching/student/:studentId
router.get(
  '/student/:studentId',
  authenticateToken,
  authorizeRole('PLACEMENT_COORDINATOR'),
  getStudentDetails
);

module.exports = router;
