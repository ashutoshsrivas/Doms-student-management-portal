const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { assessmentUpload } = require('../middleware/upload');
const announcementController = require('../controllers/announcementController');

// Public route - get all public announcements (no auth required)
router.get('/public', announcementController.getPublicAnnouncements);

// Get single announcement (requires auth to check permissions for private announcements)
router.get('/:id', authenticateToken, announcementController.getAnnouncementById);

// Protected routes - require authentication
// Get all announcements (public + private)
router.get('/', authenticateToken, announcementController.getAllAnnouncements);

// Create announcement (only Admin, HOD, Placement Coordinator)
router.post('/', authenticateToken, assessmentUpload.single('file'), announcementController.createAnnouncement);

// Update announcement
router.put('/:id', authenticateToken, assessmentUpload.single('file'), announcementController.updateAnnouncement);

// Delete announcement
router.delete('/:id', authenticateToken, announcementController.deleteAnnouncement);

// Archive announcement
router.patch('/:id/archive', authenticateToken, announcementController.archiveAnnouncement);

module.exports = router;
