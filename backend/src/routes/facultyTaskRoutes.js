const express = require('express');
const router = express.Router();
const facultyTaskController = require('../controllers/facultyTaskController');
const { authenticateToken } = require('../middleware/auth');
const { requirePerm } = require('../permissions/service');
const { assessmentUpload } = require('../middleware/upload');

router.use(authenticateToken);

// --- Admin-permission-gated routes (specific paths first, before any :id) -----
router.post('/',                requirePerm('tasks.assign'),                       facultyTaskController.create);
router.post('/bulk',            requirePerm('tasks.bulk_assign'),                  facultyTaskController.bulkCreate);
router.get('/summary',          requirePerm('tasks.view_all'),                     facultyTaskController.summary);
router.get('/report',           requirePerm('tasks.view_all'),                     facultyTaskController.report);
router.get('/pending-queue',    requirePerm('tasks.view_pending_queue'),           facultyTaskController.pendingQueue);
router.get('/performance-report', requirePerm('tasks.download_performance_report'), facultyTaskController.performanceReport);

// --- Authenticated user (gating inside the controller) -----------------------
router.get('/accuracy',             facultyTaskController.accuracy);
router.delete('/updates/:updateId', facultyTaskController.removeUpdate);

router.get('/',     facultyTaskController.list);
router.get('/:id',  facultyTaskController.get);

router.get('/:id/updates',  facultyTaskController.listUpdates);
router.post('/:id/updates', facultyTaskController.postUpdate);

// Extension flow
router.post('/:id/extension',                                          facultyTaskController.requestExtension);
router.patch('/:id/extension',  requirePerm('tasks.respond_extension'), facultyTaskController.respondExtension);
router.delete('/:id/extension',                                         facultyTaskController.cancelExtension);

// Mark-done (assignee or admin)
router.patch('/:id/complete', assessmentUpload.single('document'), facultyTaskController.complete);

// Admin-permission-gated edits
router.patch('/:id',         requirePerm('tasks.edit_any'),    facultyTaskController.update);
router.patch('/:id/remark',  requirePerm('tasks.remark'),      facultyTaskController.setRemark);
router.patch('/:id/reopen',  requirePerm('tasks.edit_any'),    facultyTaskController.reopen);
router.delete('/:id',        requirePerm('tasks.delete_any'),  facultyTaskController.remove);

module.exports = router;
