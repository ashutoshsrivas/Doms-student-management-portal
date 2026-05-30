const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requirePerm } = require('../permissions/service');
const { assessmentUpload } = require('../middleware/upload');
const announcementController = require('../controllers/announcementController');

// Public — no auth required
router.get('/public', announcementController.getPublicAnnouncements);

// Single announcement — requires auth to evaluate private-vs-public visibility
router.get('/:id', authenticateToken, announcementController.getAnnouncementById);

// List all announcements visible to the user
router.get('/', authenticateToken, announcementController.getAllAnnouncements);

// Create / update / delete / archive — gated by permission keys.
// Defaults seeded so ADMIN, HOD, PLACEMENT_COORDINATOR all have
// `announcements.create` etc. → behavior matches the prior role-only gate.
router.post('/',          authenticateToken, requirePerm('announcements.create'), assessmentUpload.single('file'), announcementController.createAnnouncement);
router.put('/:id',        authenticateToken, requirePerm('announcements.edit'),   assessmentUpload.single('file'), announcementController.updateAnnouncement);
router.delete('/:id',     authenticateToken, requirePerm('announcements.delete'), announcementController.deleteAnnouncement);
router.patch('/:id/archive', authenticateToken, requirePerm('announcements.edit'), announcementController.archiveAnnouncement);

module.exports = router;
