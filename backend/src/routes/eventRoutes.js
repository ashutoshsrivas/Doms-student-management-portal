const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticateToken } = require('../middleware/auth');
const { eventMediaUpload, eventReportUpload } = require('../middleware/upload');

router.use(authenticateToken);

// Admin-only report (must be before /:id so express matches "report"
// as the literal path, not as an :id value).
router.get('/report', eventController.report);

// Read — any authenticated user
router.get('/', eventController.list);
router.get('/:id', eventController.get);

// Create — role check inside the controller (CREATOR_ROLES)
router.post('/', eventMediaUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), eventController.create);

// Update / delete — creator or admin (checked in controller)
router.patch('/:id', eventMediaUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), eventController.update);
router.delete('/:id', eventController.remove);

// Post-event report — creator uploads, creator + admin can view (handled by
// scrub in the list/get responses); creator + admin can also delete it.
router.post('/:id/report', eventReportUpload.single('report'), eventController.uploadReport);
router.delete('/:id/report', eventController.removeReport);

module.exports = router;
