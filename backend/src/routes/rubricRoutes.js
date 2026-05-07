const express = require('express');
const router = express.Router();
const rubricController = require('../controllers/rubricController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Authorization middleware for rubric creation
const canCreateRubric = (req, res, next) => {
  const allowedRoles = ['ADMIN', 'HOD', 'MENTOR', 'FACULTY', 'PLACEMENT_COORDINATOR'];
  if (allowedRoles.includes(req.user?.role)) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized to create rubrics' });
  }
};

// Rubric CRUD operations
router.post('/', authenticateToken, canCreateRubric, rubricController.createRubric);
router.get('/assessment/:assessmentId', authenticateToken, rubricController.getRubrics);
router.get('/:rubricId', authenticateToken, rubricController.getRubric);
router.put('/:rubricId', authenticateToken, rubricController.updateRubric);
router.delete('/:rubricId', authenticateToken, rubricController.deleteRubric);

// Rubric Criteria operations
router.post('/:rubricId/criteria', authenticateToken, rubricController.addCriteria);
router.put('/criteria/:criteriaId', authenticateToken, rubricController.updateCriteria);
router.delete('/criteria/:criteriaId', authenticateToken, rubricController.deleteCriteria);

// Grading with rubric
router.post('/submissions/:submissionId/grade-with-rubric', authenticateToken, rubricController.gradeSubmissionWithRubric);
router.get('/submissions/:submissionId/rubric-scores', authenticateToken, rubricController.getSubmissionRubricScores);

module.exports = router;
