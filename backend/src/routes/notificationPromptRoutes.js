const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationPromptController');
const { authenticateToken } = require('../middleware/auth');
const { assessmentUpload } = require('../middleware/upload');

router.use(authenticateToken);

// Student-side (specific paths before /:id catch-all)
router.get('/mine', ctrl.myPending);
router.get('/mine/history', ctrl.myHistory);

// Admin/HOD list + create (multipart for optional attachment)
router.get('/', ctrl.list);
router.post('/', assessmentUpload.single('attachment'), ctrl.create);

// Per-prompt: responses list (admin/HOD) & respond (student, multipart for FILE/TEXT)
router.get('/:id/responses', ctrl.responses);
router.post('/:id/respond', assessmentUpload.single('file'), ctrl.respond);
router.patch('/:id/archive', ctrl.archive);
router.delete('/:id', ctrl.remove);

module.exports = router;
