const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { assessmentUpload } = require('../middleware/upload');

// Verify controller functions exist
console.log('[assessmentRoutes] Checking controller functions:');
console.log('  - createSubmissionDirect:', typeof assessmentController.createSubmissionDirect);
console.log('  - createSubmissionForStudent:', typeof assessmentController.createSubmissionForStudent);
console.log('  - getAssessmentSubmissions:', typeof assessmentController.getAssessmentSubmissions);

// Authorization middleware for assessment creation
const canCreateAssessment = (req, res, next) => {
  const allowedRoles = ['ADMIN', 'HOD', 'MENTOR', 'FACULTY', 'PLACEMENT_COORDINATOR'];
  if (allowedRoles.includes(req.user?.role)) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized to create assessments' });
  }
};

// ============ STATIC ROUTES (MUST COME FIRST) ============

// Create assessment
router.post(
  '/',
  authenticateToken,
  canCreateAssessment,
  assessmentController.createAssessment
);

// Get all assessments for a session
router.get(
  '/',
  authenticateToken,
  assessmentController.getAssessments
);

// ============ SUBMISSION ROUTES (BEFORE :id CATCH-ALL) ============

// Get all submissions (paginated, with filters)
router.get(
  '/submissions',
  authenticateToken,
  assessmentController.getSubmissions
);

// Create submission for a student (admin only)
router.post(
  '/submissions/create-for-student',
  authenticateToken,
  assessmentController.createSubmissionForStudent
);

// Delete submission (admin only)
router.delete(
  '/submissions/:submissionId',
  authenticateToken,
  assessmentController.deleteSubmission
);

// Submit answer
router.post(
  '/submissions/:submissionId/answers/:questionId',
  authenticateToken,
  assessmentController.submitAnswer
);

// Submit complete assessment
router.post(
  '/submissions/:submissionId/submit',
  authenticateToken,
  assessmentController.submitAssessment
);

// Grade submission (manual grading)
router.post(
  '/submissions/:submissionId/grade',
  authenticateToken,
  canCreateAssessment,
  assessmentController.gradeSubmission
);

// ============ OTHER STATIC ROUTES (BEFORE :id CATCH-ALL) ============

// Get assessments assigned to current student
router.get(
  '/student/assigned',
  authenticateToken,
  assessmentController.getStudentAssignedAssessments
);

// Upload file for assessment submission
router.post(
  '/upload-file',
  authenticateToken,
  assessmentUpload.single('file'),
  assessmentController.uploadAssessmentFile
);

// ============ PARAMETERIZED ROUTES (AFTER STATIC ROUTES) ============

// Get single assessment
router.get(
  '/:id',
  authenticateToken,
  assessmentController.getAssessment
);

// Update assessment
router.put(
  '/:id',
  authenticateToken,
  canCreateAssessment,
  assessmentController.updateAssessment
);

// Publish assessment (DRAFT -> PUBLISHED)
router.post(
  '/:id/publish',
  authenticateToken,
  canCreateAssessment,
  assessmentController.publishAssessment
);

// Close assessment (PUBLISHED -> CLOSED)
router.post(
  '/:id/close',
  authenticateToken,
  canCreateAssessment,
  assessmentController.closeAssessment
);

// Unpublish assessment (PUBLISHED -> DRAFT)
router.post(
  '/:id/unpublish',
  authenticateToken,
  canCreateAssessment,
  assessmentController.unpublishAssessment
);

// Delete assessment
router.delete(
  '/:id',
  authenticateToken,
  canCreateAssessment,
  assessmentController.deleteAssessment
);

// ============ ASSESSMENT-SPECIFIC ROUTES ============

// Add question to assessment
router.post(
  '/:assessmentId/questions',
  authenticateToken,
  canCreateAssessment,
  assessmentController.addQuestion
);

// Update question
router.put(
  '/:assessmentId/questions/:questionId',
  authenticateToken,
  canCreateAssessment,
  assessmentController.updateQuestion
);

// Delete question
router.delete(
  '/:assessmentId/questions/:questionId',
  authenticateToken,
  canCreateAssessment,
  assessmentController.deleteQuestion
);

// Assign assessment to students/categories (multi-select)
router.post(
  '/:assessmentId/assign',
  authenticateToken,
  canCreateAssessment,
  assessmentController.assignAssessment
);

// Remove assignment
router.delete(
  '/:assessmentId/assignments/:assignmentId',
  authenticateToken,
  canCreateAssessment,
  assessmentController.removeAssignment
);

// Get assigned students
router.get(
  '/:assessmentId/assigned-students',
  authenticateToken,
  assessmentController.getAssignedStudents
);

// Get submissions for a specific assessment
router.get(
  '/:assessmentId/submissions',
  authenticateToken,
  assessmentController.getAssessmentSubmissions
);

// Create submission (admin only - with assessmentId and userId/studentSessionId)
router.post(
  '/:assessmentId/submissions',
  authenticateToken,
  (req, res, next) => {
    console.log('[Route] POST /:assessmentId/submissions - assessmentId:', req.params.assessmentId, 'body:', req.body);
    next();
  },
  assessmentController.createSubmissionDirect
);

// Start submission (student initiates)
router.post(
  '/:assessmentId/submissions/start',
  authenticateToken,
  assessmentController.startSubmission
);

// Get results (only creator and admin)
router.get(
  '/:assessmentId/results',
  authenticateToken,
  assessmentController.getResults
);

module.exports = router;
