const express = require('express');
const router = express.Router();
const { User, Message, Group, GroupMember, Connection, CallHistory } = require('../models');

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

        const callHistory = await CallHistory.findAll();

        res.json({
            users,
            messages,
            groups,
            groupMembers,
            connections,
            callHistory
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

// Endpoint for local script to PUSH data back to Render (Restore/Bi-directional Sync)
router.post('/restore', syncAuth, async (req, res) => {
    try {
        const { users, messages, groups, groupMembers, connections, callHistory } = req.body;
        
        console.log('--- RESTORE REQUEST RECEIVED ---');
        
        if (users && users.length > 0) {
            console.log(`Restoring ${users.length} users...`);
            // Update password and uniqueCode to ensure credentials and IDs persist
            // hooks: false is CRITICAL to prevent re-hashing of already hashed passwords
            for (const u of users) {
                // Log password length for debug
                if (u.username === 'Kumar') {
                    console.log(`[DEBUG] Restoring Kumar. Password Length: ${u.password ? u.password.length : 'NULL'}`);
                    console.log(`[DEBUG] Hash Preview: ${u.password ? u.password.substring(0, 10) + '...' : 'NULL'}`);
                }
            }
            
            await User.bulkCreate(users, { 
                updateOnDuplicate: ['id', 'username', 'email', 'password', 'uniqueCode', 'bio', 'profilePic', 'mode', 'isOnline', 'lastSeen'],
                hooks: false 
            });
        }

        if (groups && groups.length > 0) {
            console.log(`Restoring ${groups.length} groups...`);
            await Group.bulkCreate(groups, { 
                updateOnDuplicate: ['id', 'name', 'description', 'profilePic'],
                hooks: false
            });
        }

        if (groupMembers && groupMembers.length > 0) {
            console.log(`Restoring ${groupMembers.length} group members...`);
            await GroupMember.bulkCreate(groupMembers, { 
                ignoreDuplicates: true,
                hooks: false
            });
        }

        if (connections && connections.length > 0) {
            console.log(`Restoring ${connections.length} connections...`);
            await Connection.bulkCreate(connections, { 
                updateOnDuplicate: ['status'],
                hooks: false
            });
        }

        if (messages && messages.length > 0) {
            console.log(`Restoring ${messages.length} messages...`);
            await Message.bulkCreate(messages, { 
                updateOnDuplicate: ['status', 'isRead', 'isEdited', 'deletedAt', 'content'],
                hooks: false
            });
        }

        if (callHistory && callHistory.length > 0) {
            console.log(`Restoring ${callHistory.length} calls...`);
            await CallHistory.bulkCreate(callHistory, { 
                updateOnDuplicate: ['status', 'duration', 'endedAt'],
                hooks: false
            });
        }

        console.log('--- RESTORE COMPLETE ---');
        res.json({ message: 'Data restored successfully' });

    } catch (error) {
        console.error('Restore Error:', error);
        res.status(500).json({ message: 'Restore failed', error: error.message });
    }
});

// Force Password Update Endpoint (Bypasses hooks completely)
router.post('/force-password', syncAuth, async (req, res) => {
    try {
        const { username, passwordHash } = req.body;
        console.log(`[FORCE UPDATE] Setting password for ${username}`);
        
        // Direct SQL update to ensure no hooks interfere
        // This sets the password column EXACTLY to the provided hash string
        await User.update(
            { password: passwordHash },
            { 
                where: { username: username }, 
                hooks: false,
                silent: true 
            }
        );
        
        res.json({ message: 'Password force updated' });
    } catch (error) {
        console.error('Force Update Error:', error);
        res.status(500).json({ message: 'Force update failed' });
    }
});

module.exports = router;
