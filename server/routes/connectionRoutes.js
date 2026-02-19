const express = require('express');
const router = express.Router();
const { sendRequest, acceptRequest, getConnections, getPendingRequests, connectByCode, blockUser, unblockUser, muteUser, unmuteUser, getConnectionStatus } = require('../controllers/connectionController');
const { protect } = require('../middleware/authMiddleware');

router.post('/request', protect, sendRequest);
router.post('/respond', protect, acceptRequest);
router.get('/', protect, getConnections);
router.get('/pending', protect, getPendingRequests);
router.post('/connect-by-code', protect, connectByCode);
router.post('/block', protect, blockUser);
router.post('/unblock', protect, unblockUser);
router.post('/mute', protect, muteUser);
router.post('/unmute', protect, unmuteUser);
router.get('/status/:userId', protect, getConnectionStatus);

module.exports = router;
