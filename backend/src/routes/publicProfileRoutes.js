const express = require('express');
const router = express.Router();
const publicProfileController = require('../controllers/publicProfileController');

// PUBLIC — no auth middleware. Refuses non-student accounts in the controller.
router.get('/profile/:userId', publicProfileController.getPublicProfile);

module.exports = router;
