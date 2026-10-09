const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { contributionMediaUpload } = require('../middleware/upload');

router.use(authenticateToken);

// Own schedule — any non-student authenticated user
const OWN_ROLES = [
  'ADMIN', 'HOD', 'FACULTY', 'CHAIR_HEAD',
  'COORDINATOR', 'PLACEMENT_COORDINATOR',
  'TRAINER', 'MENTOR',
];

router.get('/me', authorizeRole(...OWN_ROLES), scheduleController.getMine);
router.put('/me', authorizeRole(...OWN_ROLES), scheduleController.replaceMine);

// Achievements — own list + CRUD. Update/delete gated by ownership OR
// admin/HOD inside the handler.
router.get('/achievements/me', authorizeRole(...OWN_ROLES), scheduleController.listMyAchievements);
router.post('/achievements/me', authorizeRole(...OWN_ROLES), scheduleController.addMyAchievement);
router.patch('/achievements/:id', authorizeRole(...OWN_ROLES), scheduleController.updateAchievement);
router.delete('/achievements/:id', authorizeRole(...OWN_ROLES), scheduleController.deleteAchievement);

// Photos/videos on a contribution — up to 10 files, 200 MB each.
router.post(
  '/achievements/:id/media',
  authorizeRole(...OWN_ROLES),
  contributionMediaUpload.array('files', 10),
  scheduleController.addAchievementMedia,
);
router.delete('/achievements/:id/media/:mediaId', authorizeRole(...OWN_ROLES), scheduleController.deleteAchievementMedia);

// Admin/HOD only
router.get('/users', authorizeRole('ADMIN', 'HOD'), scheduleController.listUsers);
router.get('/all', authorizeRole('ADMIN', 'HOD'), scheduleController.getAll);
router.get('/user/:userId', authorizeRole('ADMIN', 'HOD'), scheduleController.getForUser);

module.exports = router;
