const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/certificationController');
const { authenticateToken } = require('../middleware/auth');
const { upload, excelUpload } = require('../middleware/upload');

router.use(authenticateToken);

// Specific paths first — MUST come before /:id.
router.get('/my', ctrl.myCertificates);                     // student: own certificates
router.get('/recipients', ctrl.recipients);                 // admin: student picker
router.get('/session-template', ctrl.sessionTemplate);      // admin: xlsx of a session's students
router.get('/student/:studentId', ctrl.studentCertificates); // staff or self
router.delete('/assignments/:assignmentId', ctrl.revokeAssignment);

// Certification templates (management, gated in controller to ADMIN/HOD).
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/template', upload.single('image'), ctrl.uploadTemplate);
router.get('/:id/template-image', ctrl.templateImage); // same-origin image proxy
router.post('/:id/assign', ctrl.assign);
router.post('/:id/assign-excel', excelUpload.single('file'), ctrl.assignExcel);
router.get('/:id/assignments', ctrl.listAssignments);

module.exports = router;
