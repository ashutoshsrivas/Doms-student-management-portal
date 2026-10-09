const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Hidden /exams sub-portal: every staff role may reach it, students never.
const STAFF_ROLES = [
  'ADMIN', 'HOD', 'FACULTY', 'CHAIR_HEAD',
  'COORDINATOR', 'PLACEMENT_COORDINATOR', 'TRAINER', 'MENTOR',
];
router.use(authenticateToken, authorizeRole(...STAFF_ROLES));

router.get('/staff', examController.listStaff);

router.get('/courses', examController.listCourses);
router.post('/courses', examController.createCourse);
router.get('/courses/:id', examController.getCourse);
router.patch('/courses/:id', examController.updateCourse);
router.delete('/courses/:id', examController.deleteCourse);

router.post('/courses/:id/assignees', examController.setAssignees);
router.delete('/courses/:id/assignees/:userId', examController.removeAssignee);

router.post('/courses/:id/outcomes', examController.addOutcome);
router.patch('/outcomes/:outcomeId', examController.updateOutcome);
router.delete('/outcomes/:outcomeId', examController.deleteOutcome);

router.post('/courses/:id/questions', examController.addQuestion);
router.patch('/questions/:questionId', examController.updateQuestion);
router.delete('/questions/:questionId', examController.deleteQuestion);

router.get('/courses/:id/paper/preview', examController.previewPaper);
router.post('/courses/:id/paper', examController.downloadPaper);

module.exports = router;
