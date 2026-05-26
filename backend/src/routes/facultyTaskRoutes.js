const express = require('express');
const router = express.Router();
const facultyTaskController = require('../controllers/facultyTaskController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { assessmentUpload } = require('../middleware/upload');

router.use(authenticateToken);

// Admin-only: create, bulk-create, list-summary, report, edit, reopen,
// delete, remark
router.post('/', authorizeRole('ADMIN'), facultyTaskController.create);
router.post('/bulk', authorizeRole('ADMIN'), facultyTaskController.bulkCreate);
router.get('/summary', authorizeRole('ADMIN'), facultyTaskController.summary);
router.get('/report', authorizeRole('ADMIN'), facultyTaskController.report);
router.patch('/:id', authorizeRole('ADMIN'), facultyTaskController.update);
router.patch('/:id/remark', authorizeRole('ADMIN'), facultyTaskController.setRemark);
router.patch('/:id/reopen', authorizeRole('ADMIN'), facultyTaskController.reopen);
router.delete('/:id', authorizeRole('ADMIN'), facultyTaskController.remove);

// Any authenticated user (gated inside the controller):
//   - list own (or all if admin)
//   - get one own (or any if admin)
//   - complete with optional doc
//   - accuracy for self (or any user if admin)
router.get('/accuracy', facultyTaskController.accuracy);
router.get('/', facultyTaskController.list);
router.get('/:id', facultyTaskController.get);
router.patch(
  '/:id/complete',
  assessmentUpload.single('document'),
  facultyTaskController.complete,
);

module.exports = router;
