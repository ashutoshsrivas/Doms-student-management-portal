const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationPromptController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Student-side (specific path before /:id catch-all)
router.get('/mine', ctrl.myPending);

// Admin/HOD list + create
router.get('/', ctrl.list);
router.post('/', ctrl.create);

// Per-prompt: responses list (admin/HOD) & respond (student)
router.get('/:id/responses', ctrl.responses);
router.post('/:id/respond', ctrl.respond);
router.patch('/:id/archive', ctrl.archive);
router.delete('/:id', ctrl.remove);

module.exports = router;
