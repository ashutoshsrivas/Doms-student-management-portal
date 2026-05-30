const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requirePerm } = require('../permissions/service');
const c = require('../controllers/permissionAdminController');

// All permission-management endpoints require admin.manage_roles
router.use(authenticateToken, requirePerm('admin.manage_roles'));

router.get('/', c.listPermissions);
router.patch('/role/:roleName/:permissionKey', c.setRoleDefault);
router.get('/users', c.listUsers);
router.get('/user/:userId', c.getUserPermissions);
router.patch('/user/:userId/:permissionKey', c.setUserOverride);

module.exports = router;
