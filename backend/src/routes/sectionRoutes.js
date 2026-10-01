const express = require('express');
const router = express.Router();
const sectionController = require('../controllers/sectionController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { excelUpload } = require('../middleware/upload');

// ADMIN/HOD only; COORDINATOR arrives here as an ADMIN alias.
router.use(authenticateToken, authorizeRole('ADMIN', 'HOD'));

// Specific paths before /:id
router.get('/students', sectionController.students);
router.get('/template', sectionController.template);
router.post('/assign', sectionController.assign);
router.post('/import', excelUpload.single('file'), sectionController.importExcel);

router.get('/', sectionController.list);
router.post('/', sectionController.create);
router.patch('/:id', sectionController.update);
router.delete('/:id', sectionController.remove);

module.exports = router;
