const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/formController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

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

router.put('/:id/security-point', ctrl.setSecurityPoint);
router.delete('/:id/security-point', ctrl.clearSecurityPoint);

module.exports = router;
