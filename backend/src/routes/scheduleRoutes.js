const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

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

// Admin/HOD only
router.get('/users', authorizeRole('ADMIN', 'HOD'), scheduleController.listUsers);
router.get('/all', authorizeRole('ADMIN', 'HOD'), scheduleController.getAll);
router.get('/user/:userId', authorizeRole('ADMIN', 'HOD'), scheduleController.getForUser);

module.exports = router;
