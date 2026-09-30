const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/gradeController');
const { authenticateToken } = require('../middleware/auth');
const { excelUpload } = require('../middleware/upload');

router.use(authenticateToken);

// Student: own grades + average
router.get('/me', gradeController.myGrades);

// Staff: grading lists (students are refused inside the controller)
router.get('/sheets', gradeController.listSheets);
router.post('/sheets', gradeController.createSheet);
router.get('/sheets/:id', gradeController.getSheet);
router.patch('/sheets/:id', gradeController.updateSheet);
router.delete('/sheets/:id', gradeController.deleteSheet);

router.get('/sheets/:id/students', gradeController.sheetStudents);
router.post('/sheets/:id/grades', gradeController.saveGrades);
router.get('/sheets/:id/template', gradeController.template);
router.post('/sheets/:id/upload', excelUpload.single('file'), gradeController.uploadGrades);

router.delete('/:gradeId', gradeController.deleteGrade);

module.exports = router;
