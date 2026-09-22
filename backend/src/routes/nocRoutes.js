const express = require('express');
const router = express.Router();
const nocController = require('../controllers/nocController');
const { authenticateToken } = require('../middleware/auth');
const { resumeUpload } = require('../middleware/upload');

router.use(authenticateToken);

// Student: own NOC
router.get('/me', nocController.getMine);
router.post('/upload', resumeUpload.single('noc'), nocController.upload);

// Staff (every role except STUDENT — gated in the controller)
router.get('/', nocController.list);
router.patch('/:id/issue-date', nocController.setIssueDate);

module.exports = router;
