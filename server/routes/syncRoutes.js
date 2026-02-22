const express = require('express');
const router = express.Router();
const { User } = require('../models');

// Secure middleware - simple protection for this sync endpoint
const syncAuth = (req, res, next) => {
    const syncKey = req.headers['x-sync-key'];
    // Hardcoded key for simplicity in this specific project context
    if (syncKey === 'chate-secure-sync-2024') {
        next();
    } else {
        res.status(403).json({ message: 'Unauthorized sync access' });
    }
};

// Endpoint for local script to fetch all users from Render DB
router.get('/users', syncAuth, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'createdAt', 'bio', 'mode', 'uniqueCode']
        });
        res.json(users);
    } catch (error) {
        console.error('Sync Error:', error);
        res.status(500).json({ message: 'Sync failed' });
    }
});

module.exports = router;
