const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, searchUsers, forgotPassword, resetPassword, getUserByUniqueCode, uploadProfilePic, deleteProfilePic, getUserById, getAllUsers, deleteUser } = require('../controllers/authController');
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

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
        return cb(new Error('Invalid file type'), false);
    }
});

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/profile-pic', protect, upload.single('profilePic'), uploadProfilePic);
router.delete('/profile-pic', protect, deleteProfilePic);
router.get('/search', protect, searchUsers);
router.get('/find/:uniqueCode', protect, getUserByUniqueCode);
router.get('/user/:id', protect, getUserById); // New route
router.get('/all-users', getAllUsers);
router.delete('/user/:id', deleteUser);

module.exports = router;
