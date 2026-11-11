const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/formController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { formMediaUpload } = require('../middleware/upload');

// Building and reading forms is administrative. COORDINATOR arrives aliased
// to ADMIN, so academic coordinators are covered by the ADMIN entry.
router.use(authenticateToken, authorizeRole('ADMIN', 'HOD'));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.patch('/:id/status', ctrl.setStatus);
router.delete('/:id', ctrl.remove);

router.get('/:id/responses', ctrl.responses);
router.get('/:id/responses.csv', ctrl.responsesCsv);

// A picture or clip for a question, an option, or the banner. Multer throws
// on a rejected file, so the reason is turned into a 400 rather than a 500.
const mediaOrExplain = (req, res, next) => {
  formMediaUpload.single('file')(req, res, (err) => {
    if (!err) return next();
    return res.status(400).json({
      message: err.code === 'LIMIT_FILE_SIZE'
        ? 'That file is larger than 80 MB.'
        : err.message || 'That file could not be accepted.',
    });
  });
};
router.post('/:id/media', mediaOrExplain, ctrl.uploadMedia);
// One turn of the rotating QR code.
router.get('/:id/qr-token', ctrl.qrToken);

router.put('/:id/security-point', ctrl.setSecurityPoint);
router.delete('/:id/security-point', ctrl.clearSecurityPoint);

module.exports = router;
