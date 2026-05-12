const express = require('express');
const router = express.Router();
const sipQuestionController = require('../controllers/sipQuestionController');
const { authenticateToken } = require('../middleware/auth');
const { resumeUpload } = require('../middleware/upload');

// Post a new question (admin only)
router.post('/', authenticateToken, sipQuestionController.postQuestion);

// Get all questions for a session
router.get('/session/:sessionId', authenticateToken, sipQuestionController.getQuestions);

// Get a single question
router.get('/:questionId', authenticateToken, sipQuestionController.getQuestion);

// Delete a question (admin only)
router.delete('/:questionId', authenticateToken, sipQuestionController.deleteQuestion);

// Submit answer to a question (student)
router.post('/:questionId/answer', authenticateToken, resumeUpload.single('document'), sipQuestionController.submitAnswer);

// Get my answer to a question (student)
router.get('/:questionId/my-answer', authenticateToken, sipQuestionController.getMyAnswer);

// Get all answers to a question (admin)
router.get('/:questionId/answers', authenticateToken, sipQuestionController.getQuestionAnswers);

module.exports = router;
