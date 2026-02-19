const express = require('express');
const router = express.Router();
const { sendBackup, sendRecovery } = require('../controllers/recoveryController');
const { protect } = require('../middleware/authMiddleware');

router.post('/backup', protect, sendBackup);
router.post('/recover', protect, sendRecovery);

module.exports = router;
