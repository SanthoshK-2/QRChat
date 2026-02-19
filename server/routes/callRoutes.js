const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');
const { protect } = require('../middleware/authMiddleware');

router.post('/save', protect, callController.saveCall);
router.get('/', protect, callController.getCallHistory);

module.exports = router;
