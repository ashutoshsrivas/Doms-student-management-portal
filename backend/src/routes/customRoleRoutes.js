const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requirePerm } = require('../permissions/service');
const c = require('../controllers/customRoleController');

// All custom-role management requires admin.manage_roles.
router.use(authenticateToken, requirePerm('admin.manage_roles'));

router.get('/',             c.list);
router.post('/',            c.create);
router.get('/:id',          c.get);
router.patch('/:id',        c.update);
router.delete('/:id',       c.remove);

router.post('/:id/assign',                  c.assign);
router.delete('/:id/assign/:userId',        c.unassign);

module.exports = router;
