const express = require('express');
const router = express.Router();
const shareLinkController = require('../controllers/shareLinkController');

// PUBLIC — no auth. Resolves a share-link token to a filtered profile.
// The token controls which sections are visible, so admins manage what
// gets exposed per-recipient.
router.get('/share/:token', shareLinkController.resolveToken);

module.exports = router;
