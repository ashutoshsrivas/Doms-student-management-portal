const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/departmentController');
const { authenticateToken, authorizeRole, denyRawRoles } = require('../middleware/auth');
const { departmentUpload } = require('../middleware/upload');

// ---- Public: the cards on the landing page and the pages behind them ----
router.get('/', ctrl.publicList);

// ---- Curation ------------------------------------------------------------
// Every handler below checks the department itself: admin and HOD may touch
// any of them, a chair head only their own.
const staff = [
  authenticateToken,
  authorizeRole('ADMIN', 'HOD', 'CHAIR_HEAD', 'FACULTY'),
];
const admin = [
  authenticateToken,
  authorizeRole('ADMIN', 'HOD'),
  denyRawRoles('COORDINATOR'),
];

router.get('/categories', ...staff, ctrl.categories);
router.get('/manage', ...staff, ctrl.manageList);
router.get('/manage/:id', ...staff, ctrl.manageOne);
router.get('/chair-heads', ...admin, ctrl.chairHeads);

router.post('/', ...admin, ctrl.create);
router.patch('/:id', ...staff, ctrl.update);
router.delete('/:id', ...admin, ctrl.remove);

// A cover image, or the document behind one entry.
const uploadOrExplain = (req, res, next) => departmentUpload.single('file')(req, res, (err) => {
  if (!err) return next();
  const tooBig = err.code === 'LIMIT_FILE_SIZE';
  return res.status(400).json({ message: tooBig ? 'That file is too large' : (err.message || 'That file could not be read') });
});
router.post('/:id/upload', ...staff, uploadOrExplain, ctrl.upload);

router.post('/:id/entries', ...staff, ctrl.createEntry);
router.put('/:id/entries/order', ...staff, ctrl.reorderEntries);
router.patch('/:id/entries/:entryId', ...staff, ctrl.updateEntry);
router.delete('/:id/entries/:entryId', ...staff, ctrl.removeEntry);

// Last, so it never swallows /manage, /categories or /chair-heads.
router.get('/:slug', ctrl.publicOne);

module.exports = router;
