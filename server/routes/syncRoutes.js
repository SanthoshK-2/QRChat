const express = require('express');
const router = express.Router();
const { User, Message, Group, GroupMember, Connection } = require('../models');

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

// Endpoint for local script to fetch all data from Render DB
router.get('/full', syncAuth, async (req, res) => {
    try {
        const users = await User.findAll({
            // Include password so it can be synced to local DB for login
            attributes: ['id', 'username', 'email', 'password', 'createdAt', 'updatedAt', 'bio', 'profilePic', 'mode', 'uniqueCode', 'isOnline', 'showOnlineStatus', 'lastSeen']
        });
        
        const messages = await Message.findAll({
            order: [['createdAt', 'ASC']]
        });

        const groups = await Group.findAll();
        
        const groupMembers = await GroupMember.findAll();
        
        const connections = await Connection.findAll();

        res.json({
            users,
            messages,
            groups,
            groupMembers,
            connections
        });
    } catch (error) {
        console.error('Sync Error:', error);
        res.status(500).json({ message: 'Sync failed' });
    }
});

// Deprecated: kept for backward compatibility if script isn't updated
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
