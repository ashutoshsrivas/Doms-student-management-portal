const express = require('express');
const router = express.Router();
const shareLinkController = require('../controllers/shareLinkController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// All admin-only.
router.use(authenticateToken, authorizeRole('ADMIN', 'HOD'));

router.get('/sections', shareLinkController.listSectionKeys);
router.get('/', shareLinkController.list);
router.post('/', shareLinkController.create);
router.delete('/:id', shareLinkController.remove);

module.exports = router;
