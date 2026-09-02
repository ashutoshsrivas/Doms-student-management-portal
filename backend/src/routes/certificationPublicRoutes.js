const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/certificationController');

// Public certificate verification — intentionally NO authentication so anyone
// (e.g. an employer scanning the QR) can confirm a certificate is genuine.
router.get('/:number', ctrl.verify);

module.exports = router;
