const express = require('express');
const router = express.Router();
const studentProfileController = require('../controllers/studentProfileController');
const userController = require('../controllers/userController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { resumeUpload } = require('../middleware/upload');

// Protected routes - Student only
router.get(
  '/student-profile',
  authenticateToken,
  authorizeRole('STUDENT'),
  studentProfileController.getStudentProfile
);

router.put(
  '/student-profile',
  authenticateToken,
  authorizeRole('STUDENT'),
  studentProfileController.updateStudentProfile
);

router.post(
  '/student-profile/add-item',
  authenticateToken,
  authorizeRole('STUDENT'),
  studentProfileController.addArrayItem
);

router.post(
  '/student-profile/remove-item',
  authenticateToken,
  authorizeRole('STUDENT'),
  studentProfileController.removeArrayItem
);

router.post(
  '/student-profile/upload-resume',
  authenticateToken,
  authorizeRole('STUDENT'),
  resumeUpload.single('resume'),
  userController.uploadResume
);

router.post(
  '/student-profile/upload-certificate',
  authenticateToken,
  authorizeRole('STUDENT'),
  resumeUpload.single('certificate'),
  userController.uploadCertificateDocument
);

router.delete(
  '/student-profile/certificate/:documentId',
  authenticateToken,
  authorizeRole('STUDENT'),
  userController.deleteCertificateDocument
);

module.exports = router;
