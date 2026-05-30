const express = require('express');
const router = express.Router();
const mentorController = require('../controllers/mentorController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { assessmentUpload } = require('../middleware/upload');

// ============ DEBUG LOGGING ============
router.use((req, res, next) => {
  console.log('[MentorRoutes] Incoming request:', { method: req.method, path: req.path, url: req.url });
  next();
});

// ============ MONITORING (ADMIN / HOD / CHAIR_HEAD) ============
router.get(
  '/monitoring',
  authenticateToken,
  authorizeRole('ADMIN', 'HOD', 'CHAIR_HEAD'),
  mentorController.getMonitoring,
);

// ============ MENTOR TEAM MANAGEMENT (ADMIN) ============

// Create mentor team
router.post(
  '/teams',
  authenticateToken,
  authorizeRole('ADMIN', 'HOD', 'CHAIR_HEAD'),
  mentorController.createMentorTeam
);

// Get all mentor teams (admin/faculty)
router.get(
  '/teams',
  authenticateToken,
  mentorController.getMentorTeams
);

// Get single mentor team
router.get(
  '/teams/:teamId',
  authenticateToken,
  mentorController.getMentorTeam
);

// Update mentor team
router.put(
  '/teams/:teamId',
  authenticateToken,
  authorizeRole('ADMIN', 'HOD', 'CHAIR_HEAD'),
  mentorController.updateMentorTeam
);

// Delete mentor team
router.delete(
  '/teams/:teamId',
  authenticateToken,
  authorizeRole('ADMIN', 'HOD', 'CHAIR_HEAD'),
  mentorController.deleteMentorTeam
);

// Add students to mentor team
router.post(
  '/teams/:teamId/members',
  authenticateToken,
  authorizeRole('ADMIN', 'HOD', 'CHAIR_HEAD'),
  mentorController.addTeamMembers
);

// Remove student from mentor team
router.delete(
  '/teams/:teamId/members/:memberId',
  authenticateToken,
  authorizeRole('ADMIN', 'HOD', 'CHAIR_HEAD'),
  mentorController.removeTeamMember
);

// ============ MENTOR REQUIREMENTS (FACULTY) ============

// Create requirement
router.post(
  '/teams/:teamId/requirements',
  authenticateToken,
  authorizeRole('FACULTY', 'ADMIN', 'HOD', 'CHAIR_HEAD'),
  mentorController.createRequirement
);

// Get requirements for a team
router.get(
  '/teams/:teamId/requirements',
  authenticateToken,
  mentorController.getTeamRequirements
);

// Get single requirement
router.get(
  '/requirements/:requirementId',
  authenticateToken,
  mentorController.getRequirement
);

// Update requirement
router.put(
  '/requirements/:requirementId',
  authenticateToken,
  authorizeRole('FACULTY', 'ADMIN', 'HOD', 'CHAIR_HEAD'),
  mentorController.updateRequirement
);

// Delete requirement
router.delete(
  '/requirements/:requirementId',
  authenticateToken,
  authorizeRole('FACULTY', 'ADMIN', 'HOD', 'CHAIR_HEAD'),
  mentorController.deleteRequirement
);

// ============ STUDENT RESPONSES ============

// Submit response to requirement (with optional file upload)
router.post(
  '/requirements/:requirementId/respond',
  authenticateToken,
  authorizeRole('STUDENT'),
  assessmentUpload.single('file'),
  mentorController.submitResponse
);

// Get responses for a requirement (faculty view)
router.get(
  '/requirements/:requirementId/responses',
  authenticateToken,
  authorizeRole('FACULTY', 'ADMIN', 'HOD', 'CHAIR_HEAD'),
  mentorController.getRequirementResponses
);

// Get student's own responses
router.get(
  '/student-responses',
  authenticateToken,
  authorizeRole('STUDENT'),
  mentorController.getStudentResponses
);

// Provide feedback on response
router.put(
  '/responses/:responseId/feedback',
  authenticateToken,
  authorizeRole('FACULTY', 'ADMIN', 'HOD', 'CHAIR_HEAD'),
  mentorController.provideFeedback
);

// ============ STUDENT MENTOR VIEW ============

// Get student's mentors
router.get(
  '/student-mentors',
  authenticateToken,
  authorizeRole('STUDENT'),
  mentorController.getStudentMentors
);

// Get requirements for student
router.get(
  '/student-requirements',
  authenticateToken,
  authorizeRole('STUDENT'),
  mentorController.getStudentRequirements
);

module.exports = router;
