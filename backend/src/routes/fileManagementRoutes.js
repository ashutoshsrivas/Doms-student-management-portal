const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const multer = require('multer');
const ctrl = require('../controllers/fileManagementController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

const adminOnly = [authenticateToken, authorizeRole('ADMIN', 'HOD')];

router.get('/folders',        ...adminOnly, ctrl.listFolders);
router.get('/files',          ...adminOnly, ctrl.listFiles);
router.get('/unreferenced',   ...adminOnly, ctrl.listUnreferencedFiles);
router.get('/stats',          ...adminOnly, ctrl.getStats);
router.post('/upload',        ...adminOnly, upload.single('file'), ctrl.uploadFile);
router.post('/folders',       ...adminOnly, ctrl.createFolder);
router.patch('/files/rename', ...adminOnly, ctrl.renameFile);
router.delete('/files',       ...adminOnly, ctrl.deleteFile);
router.delete('/files/bulk',  ...adminOnly, ctrl.bulkDeleteFiles);
router.post('/download-zip', ...adminOnly, ctrl.downloadZip);

module.exports = router;
