const express = require('express');
const router = express.Router();
const facultyTaskController = require('../controllers/facultyTaskController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { assessmentUpload } = require('../middleware/upload');

router.use(authenticateToken);

// --- Admin-only routes (specific paths first, before any :id catch) ------
router.post('/', authorizeRole('ADMIN', 'HOD'), facultyTaskController.create);
router.post('/bulk', authorizeRole('ADMIN', 'HOD'), facultyTaskController.bulkCreate);

// Bulk-batch management — must come before /:id catch-all.
router.get('/bulk-history', authorizeRole('ADMIN', 'HOD'), facultyTaskController.bulkHistory);
router.get('/bulk/:groupTaskId', authorizeRole('ADMIN', 'HOD'), facultyTaskController.bulkDetail);
router.patch('/bulk/:groupTaskId', authorizeRole('ADMIN', 'HOD'), facultyTaskController.bulkUpdate);
router.delete('/bulk/:groupTaskId', authorizeRole('ADMIN', 'HOD'), facultyTaskController.bulkDelete);

router.get('/summary', authorizeRole('ADMIN', 'HOD'), facultyTaskController.summary);
router.get('/report', authorizeRole('ADMIN', 'HOD'), facultyTaskController.report);
router.get('/pending-queue', authorizeRole('ADMIN', 'HOD'), facultyTaskController.pendingQueue);
router.get('/performance-report', authorizeRole('ADMIN', 'HOD'), facultyTaskController.performanceReport);

// --- Authenticated user (gating inside the controller) -------------------
// /accuracy must come before /:id, otherwise express matches "accuracy" as
// an :id.
router.get('/accuracy', facultyTaskController.accuracy);

// Trail updates — author or admin can delete. Mounted with its own
// path so it doesn't clash with task :id routes.
router.delete('/updates/:updateId', facultyTaskController.removeUpdate);

router.get('/', facultyTaskController.list);
router.get('/:id', facultyTaskController.get);

router.get('/:id/updates', facultyTaskController.listUpdates);
router.post('/:id/updates', facultyTaskController.postUpdate);

// Extension flow
router.post('/:id/extension', facultyTaskController.requestExtension);
router.patch('/:id/extension', authorizeRole('ADMIN', 'HOD'), facultyTaskController.respondExtension);
router.delete('/:id/extension', facultyTaskController.cancelExtension);

// Mark-done (assignee or admin)
router.patch(
  '/:id/complete',
  assessmentUpload.single('document'),
  facultyTaskController.complete,
);

// Admin-only edits
router.patch('/:id', authorizeRole('ADMIN', 'HOD'), facultyTaskController.update);
router.patch('/:id/remark', authorizeRole('ADMIN', 'HOD'), facultyTaskController.setRemark);
router.patch('/:id/reopen', authorizeRole('ADMIN', 'HOD'), facultyTaskController.reopen);
// Delete — assigner or admin/HOD, at any status. Gated inside the handler.
router.delete('/:id', facultyTaskController.remove);

module.exports = router;
