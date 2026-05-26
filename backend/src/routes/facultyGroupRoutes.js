const express = require('express');
const router = express.Router();
const facultyGroupController = require('../controllers/facultyGroupController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Groups management is admin-only.
router.use(authenticateToken, authorizeRole('ADMIN'));

router.get('/', facultyGroupController.list);
router.post('/', facultyGroupController.create);
router.get('/:id', facultyGroupController.get);
router.patch('/:id', facultyGroupController.update);
router.delete('/:id', facultyGroupController.remove);

router.post('/:id/members', facultyGroupController.addMember);
router.delete('/:id/members/:userId', facultyGroupController.removeMember);

module.exports = router;
