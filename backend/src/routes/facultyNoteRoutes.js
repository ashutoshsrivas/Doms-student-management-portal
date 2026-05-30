const express = require('express');
const router = express.Router();
const facultyNoteController = require('../controllers/facultyNoteController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken, authorizeRole('ADMIN', 'HOD'));

router.post('/', facultyNoteController.create);
router.get('/', facultyNoteController.list);
router.patch('/:id', facultyNoteController.update);
router.delete('/:id', facultyNoteController.remove);

module.exports = router;
