const express = require('express');
const router = express.Router();
const facultyGroupController = require('../controllers/facultyGroupController');
const { authenticateToken } = require('../middleware/auth');
const { requirePerm } = require('../permissions/service');

router.use(authenticateToken);

router.get('/',                             requirePerm('groups.view'),            facultyGroupController.list);
router.post('/',                            requirePerm('groups.create'),          facultyGroupController.create);
router.get('/:id',                          requirePerm('groups.view'),            facultyGroupController.get);
router.patch('/:id',                        requirePerm('groups.edit'),            facultyGroupController.update);
router.delete('/:id',                       requirePerm('groups.delete'),          facultyGroupController.remove);

router.post('/:id/members',                 requirePerm('groups.manage_members'),  facultyGroupController.addMember);
router.delete('/:id/members/:userId',       requirePerm('groups.manage_members'),  facultyGroupController.removeMember);

module.exports = router;
