const express = require('express');
const router = express.Router();
const facultyTaskController = require('../controllers/facultyTaskController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { assessmentUpload } = require('../middleware/upload');

router.use(authenticateToken);

// Admin-only: create, list-summary, edit, reopen, delete
router.post('/', authorizeRole('ADMIN'), facultyTaskController.create);
router.get('/summary', authorizeRole('ADMIN'), facultyTaskController.summary);
router.patch('/:id', authorizeRole('ADMIN'), facultyTaskController.update);
router.patch('/:id/reopen', authorizeRole('ADMIN'), facultyTaskController.reopen);
router.delete('/:id', authorizeRole('ADMIN'), facultyTaskController.remove);

// Any authenticated user: list (filtered by role inside controller), get one,
// complete-with-optional-document.
router.get('/', facultyTaskController.list);
router.get('/:id', facultyTaskController.get);
router.patch(
  '/:id/complete',
  assessmentUpload.single('document'),
  facultyTaskController.complete,
);

module.exports = router;
