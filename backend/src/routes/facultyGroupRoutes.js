const express = require('express');
const router = express.Router();
const facultyGroupController = require('../controllers/facultyGroupController');
const { authenticateToken, authorizeRole, denyRawRoles } = require('../middleware/auth');

// Groups management is admin-only.
// Coordinators are excluded: faculty-task administration is admin/HOD only.
router.use(authenticateToken, authorizeRole('ADMIN', 'HOD'), denyRawRoles('COORDINATOR'));

router.get('/', facultyGroupController.list);
router.post('/', facultyGroupController.create);
router.get('/:id', facultyGroupController.get);
router.patch('/:id', facultyGroupController.update);
router.delete('/:id', facultyGroupController.remove);

router.post('/:id/members', facultyGroupController.addMember);
router.delete('/:id/members/:userId', facultyGroupController.removeMember);

module.exports = router;
