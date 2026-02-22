const { User, BlockList, sequelize } = require('../models');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const validator = require('validator');
const crypto = require('crypto');
const CryptoJS = require('crypto-js');

// Ensure we have a secret key for decryption
// CRITICAL: Hardcode to match client/src/config.js exactly to prevent ENV mismatches on Render
// The client uses "chate-secure-transport-key-2024" directly.
const APP_SECRET = "chate-secure-transport-key-2024";
const JWT_SECRET = process.env.JWT_SECRET || "chate-jwt-secret-fallback-2024";

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Helper to decrypt payload
const decryptPayload = (ciphertext) => {
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, APP_SECRET);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        console.error('Decryption failed with secret:', APP_SECRET ? '***' : 'undefined');
        return null;
    }
};

const fs = require('fs');
const path = require('path');

// Helper to log to file for Demo purposes
const logToDemoFile = (message) => {
    try {
        const logPath = path.join(__dirname, '../../DEMO_LOGS.txt');
        const timestamp = new Date().toLocaleString();
        fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
    } catch (e) {
        console.error('Failed to write to demo log:', e);
    }
};

exports.register = async (req, res) => {
    let { username, email, password, isEncrypted } = req.body;

    if (isEncrypted) {
        try {
            console.log('Decrypting password...');
            const decrypted = decryptPayload(password);
            if (!decrypted) {
                console.error('Decryption returned null/empty');
                return res.status(400).json({ message: 'Encryption error: Decryption failed' });
            }
            password = decrypted;
            console.log('Password decrypted successfully');
        } catch (e) {
            console.error('Decryption exception:', e);
            return res.status(400).json({ message: 'Encryption error: Exception' });
        }
    }

    try {
        console.log('Checking if user exists:', { username, email });
        
        const usernameExists = await User.findOne({ where: { username } });
        if (usernameExists) {
             return res.status(400).json({ message: 'This Username already registered, So Kindly Use Other Username' });
        }

        const emailExists = await User.findOne({ where: { email } });
        if (emailExists) {
             return res.status(400).json({ message: 'User with this email already exists' });
        }

        const user = await User.create({
            username,
            email,
            password,
            profilePic: null
        });

        if (user) {
             // DEMO LOGGING
             logToDemoFile(`NEW REGISTRATION: Username=${username}, Email=${email}, ID=${user.id}`);
             
             res.status(201).json({
                 id: user.id,
                 username: user.username,
                 email: user.email,
                 token: generateToken(user.id),
                 uniqueCode: user.uniqueCode,
                 profilePic: user.profilePic,
                 bio: user.bio,
                 mode: user.mode,
                 showOnlineStatus: user.showOnlineStatus
             });
        } else {
             res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
};

exports.login = async (req, res) => {
    let { username, password, isEncrypted } = req.body;
    
    if (isEncrypted) {
        const decrypted = decryptPayload(password);
        if (!decrypted) {
             console.error('Login Decryption failed');
             return res.status(400).json({ message: 'Encryption error: Login Decryption failed' });
        }
        password = decrypted;
    }

    try {
        console.log(`[LOGIN ATTEMPT] Username/Email: ${username}`);
        
        const user = await User.findOne({ 
            where: { 
                [Op.or]: [{ username: username }, { email: username }] 
            } 
        });

        if (!user) {
            console.warn(`[LOGIN FAILED] User not found: ${username}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await user.matchPassword(password);
        
        // --- DEBUG LOGGING (REMOVE IN PRODUCTION) ---
        if (!isMatch) {
            console.warn(`[LOGIN DEBUG] Password Mismatch for ${username}`);
            // Auto-fix: If stored password is plain text, fix it.
            if (!user.password.startsWith('$2b$')) {
                console.warn('[LOGIN FIX] Stored password is NOT hashed. Updating hash...');
                user.password = password; // Will be hashed by beforeUpdate hook
                await user.save();
                
                // Return successful login immediately after fix
                return res.json({
                     id: user.id,
                     username: user.username,
                     email: user.email,
                     token: generateToken(user.id),
                     uniqueCode: user.uniqueCode,
                     profilePic: user.profilePic,
                     bio: user.bio,
                     mode: user.mode,
                     showOnlineStatus: user.showOnlineStatus
                });
            }
        }
        // ---------------------------------------------

        if (isMatch) {
             console.log(`[LOGIN SUCCESS] User: ${user.username}`);
             // DEMO LOGGING
             logToDemoFile(`USER LOGIN: Username=${user.username} (${username})`);
             
             res.json({
                 id: user.id,
                 username: user.username,
                 email: user.email,
                 token: generateToken(user.id),
                 uniqueCode: user.uniqueCode,
                 profilePic: user.profilePic,
                 bio: user.bio,
                 mode: user.mode,
                 showOnlineStatus: user.showOnlineStatus
             });
        } else {
             console.warn(`[LOGIN FAILED] Password mismatch for user: ${username}`);
             res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
         console.error('[LOGIN ERROR]', error);
         res.status(500).json({ message: 'Server error' });
    }
};

exports.getProfile = async (req, res) => {
    const user = await User.findByPk(req.user.id);
    if (user) {
         res.json({
             id: user.id,
             username: user.username,
             email: user.email,
             uniqueCode: user.uniqueCode,
             profilePic: user.profilePic,
             bio: user.bio,
             mode: user.mode,
             showOnlineStatus: user.showOnlineStatus
         });
    } else {
         res.status(404).json({ message: 'User not found' });
    }
};

exports.updateProfile = async (req, res) => {
    const user = await User.findByPk(req.user.id);
    if (user) {
        // Allow updating bio even if empty string
        if (req.body.bio !== undefined) {
            user.bio = req.body.bio;
        }
        user.profilePic = req.body.profilePic || user.profilePic;
        if (req.body.password) {
            // Validate new password strength
            if (!validator.isStrongPassword(req.body.password, { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })) {
                return res.status(400).json({ message: 'Password too weak' });
            }
            user.password = req.body.password;
        }
        user.mode = req.body.mode || user.mode;
        if (req.body.showOnlineStatus !== undefined) {
            user.showOnlineStatus = req.body.showOnlineStatus;
        }
        
        await user.save();
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            uniqueCode: user.uniqueCode,
            profilePic: user.profilePic,
            bio: user.bio,
            mode: user.mode,
            showOnlineStatus: user.showOnlineStatus
        });
    } else {
         res.status(404).json({ message: 'User not found' });
    }
};

exports.uploadProfilePic = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const fileUrl = `/uploads/${req.file.filename}`;
        user.profilePic = fileUrl;
        await user.save();

        res.json({
            message: 'Profile picture updated',
            profilePic: fileUrl
        });
    } catch (error) {
        console.error('Profile Upload Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteProfilePic = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.profilePic = null;
        await user.save();

        res.json({
            message: 'Profile picture removed',
            profilePic: null
        });
    } catch (error) {
        console.error('Delete Profile Pic Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.searchUsers = async (req, res) => {
    const { query } = req.query;
    if (!query) return res.json([]);
    
    try {
        const users = await User.findAll({
            where: {
                username: { [Op.like]: `%${query}%` },
                mode: 'global',
                id: { [Op.ne]: req.user.id } // Exclude self
            },
            attributes: ['id', 'username', 'email', 'profilePic', 'uniqueCode', 'bio']
        });
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getUserByUniqueCode = async (req, res) => {
    const { uniqueCode } = req.params;
    try {
        const user = await User.findOne({ 
            where: { uniqueCode },
            attributes: ['id', 'username', 'email', 'profilePic', 'uniqueCode', 'bio']
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (user.id === req.user.id) {
             return res.status(400).json({ message: 'You cannot connect with yourself' });
        }

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: ['id', 'username', 'profilePic', 'isOnline', 'lastSeen', 'mode', 'showOnlineStatus', 'bio']
        });
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        let userData = user.toJSON();
        
        const isBlocked = await BlockList.findOne({
            where: {
                [Op.or]: [
                    { blockerId: req.user.id, blockedId: user.id },
                    { blockerId: user.id, blockedId: req.user.id }
                ]
            }
        });

        if (isBlocked || userData.showOnlineStatus === false) {
            userData.isOnline = false;
            userData.lastSeen = null;
        }
        
        res.json(userData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Forgot Password Implementation
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User with this email does not exist' });
        }

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        console.log("GENERATED OTP FOR " + email + ": " + otp); // Log OTP for manual check
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        // Save OTP to user
        user.resetPasswordOTP = otp;
        user.resetPasswordExpires = otpExpires;
        await user.save();

        // Setup Nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Assuming Gmail as requested
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'QR Chat Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}\n\nThis OTP is valid for 15 minutes.`
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'OTP sent to email' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error sending email' });
    }
};

exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'Please provide email, OTP, and new password' });
        }

        const user = await User.findOne({ 
            where: { 
                email,
                resetPasswordOTP: otp,
                resetPasswordExpires: { [Op.gt]: new Date() } // Check if not expired
            } 
        });
        
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        if (!validator.isStrongPassword(newPassword, { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })) {
            return res.status(400).json({ message: 'Password must be at least 8 chars long and contain uppercase, lowercase, number, and symbol' });
        }

        user.password = newPassword;
        user.resetPasswordOTP = null;
        user.resetPasswordExpires = null;
        await user.save();
        
        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Get All Users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({ attributes: ['id', 'username', 'email'] });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Delete User
exports.deleteUser = async (req, res) => {
    try {
        await User.destroy({ where: { id: req.params.id } });
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
