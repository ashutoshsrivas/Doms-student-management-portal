const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken);

// Specific paths first — MUST come before /:id.
router.get('/eligible-coordinators',
  authorizeRole('ADMIN', 'HOD'),
  classController.eligibleCoordinators);

// CR picker — reachable by any role that could coordinate a class, so a
// faculty coordinator can populate the picker. Actual save is still gated
// by isOwnCoordinator in the setCRs handler.
router.get('/eligible-crs',
  authorizeRole('ADMIN', 'HOD', 'FACULTY', 'CHAIR_HEAD', 'PLACEMENT_COORDINATOR', 'COORDINATOR'),
  classController.eligibleCRs);

// List classes (scoped inside the controller by role)
router.get('/', classController.list);

// Create — admin/HOD only
router.post('/', authorizeRole('ADMIN', 'HOD'), classController.create);

// Update / delete
router.patch('/:id', classController.update); // gated inside controller
router.delete('/:id', authorizeRole('ADMIN', 'HOD'), classController.remove);

// CRs
router.put('/:id/crs', classController.setCRs); // coordinator or admin

// Attendance
router.get('/:id/attendance', classController.listAttendance);
router.post('/:id/attendance', classController.submitAttendance);

// ATR — only admin/HOD or the class coordinator
router.patch('/:id/attendance/:attId/atr', classController.setATR);

module.exports = router;
