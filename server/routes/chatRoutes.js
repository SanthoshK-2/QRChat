const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

router.get('/:otherUserId', protect, chatController.getMessages);
router.get('/group/:groupId', protect, chatController.getGroupMessages);
router.post('/upload', protect, upload.single('file'), chatController.uploadFile);
router.put('/:messageId', protect, chatController.editMessage);
router.delete('/:messageId', protect, chatController.deleteMessage);

module.exports = router;
