const express = require('express');
const router = express.Router();
const sipRequirementController = require('../controllers/sipRequirementController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, sipRequirementController.postRequirement);
router.get('/:sessionId', authenticateToken, sipRequirementController.getRequirements);
router.delete('/:requirementId', authenticateToken, sipRequirementController.deleteRequirement);

module.exports = router;
