const express = require('express');
const router = express.Router();
const facultyNoteController = require('../controllers/facultyNoteController');
const { authenticateToken } = require('../middleware/auth');
const { requirePerm } = require('../permissions/service');

// Faculty notes piggy-back on tasks.view_all — they're admin-only insights
// tied to the same faculty management surface. If an org later wants to split
// them out, add a dedicated permission key (e.g. notes.view) to the catalog.
router.use(authenticateToken, requirePerm('tasks.view_all'));

router.post('/',           facultyNoteController.create);
router.get('/',            facultyNoteController.list);
router.patch('/:id',       facultyNoteController.update);
router.delete('/:id',      facultyNoteController.remove);

module.exports = router;
