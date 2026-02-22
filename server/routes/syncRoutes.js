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

// Endpoint for local script to PUSH data back to Render (Restore/Bi-directional Sync)
router.post('/restore', syncAuth, async (req, res) => {
    try {
        const { users, messages, groups, groupMembers, connections } = req.body;
        
        console.log('--- RESTORE REQUEST RECEIVED ---');
        
        if (users && users.length > 0) {
            console.log(`Restoring ${users.length} users...`);
            await User.bulkCreate(users, { updateOnDuplicate: ['username', 'email', 'bio', 'mode', 'isOnline', 'lastSeen'] });
        }

        if (groups && groups.length > 0) {
            console.log(`Restoring ${groups.length} groups...`);
            await Group.bulkCreate(groups, { updateOnDuplicate: ['name', 'description', 'profilePic'] });
        }

        if (groupMembers && groupMembers.length > 0) {
            console.log(`Restoring ${groupMembers.length} group members...`);
            await GroupMember.bulkCreate(groupMembers, { ignoreDuplicates: true });
        }

        if (connections && connections.length > 0) {
            console.log(`Restoring ${connections.length} connections...`);
            await Connection.bulkCreate(connections, { updateOnDuplicate: ['status'] });
        }

        if (messages && messages.length > 0) {
            console.log(`Restoring ${messages.length} messages...`);
            await Message.bulkCreate(messages, { updateOnDuplicate: ['status', 'isRead', 'isEdited', 'deletedAt'] });
        }

        console.log('--- RESTORE COMPLETE ---');
        res.json({ message: 'Data restored successfully' });

    } catch (error) {
        console.error('Restore Error:', error);
        res.status(500).json({ message: 'Restore failed', error: error.message });
    }
});

// Endpoint for local script to PUSH data to Render DB (Bi-directional Sync)
router.post('/restore', syncAuth, async (req, res) => {
    try {
        const { users, groups, connections, messages, groupMembers } = req.body;
        
        console.log('[RESTORE] Received data to restore...');

        // 1. Restore Users
        if (users && users.length > 0) {
            for (const u of users) {
                // Skip if exists
                const exists = await User.findByPk(u.id);
                if (!exists) {
                    await User.create(u); // Password should already be hashed in the backup
                    console.log(`[RESTORE] Restored User: ${u.username}`);
                }
            }
        }

        // 2. Restore Groups
        if (groups && groups.length > 0) {
            for (const g of groups) {
                const exists = await Group.findByPk(g.id);
                if (!exists) await Group.create(g);
            }
        }

        // 3. Restore Connections
        if (connections && connections.length > 0) {
            for (const c of connections) {
                const exists = await Connection.findByPk(c.id);
                if (!exists) await Connection.create(c);
            }
        }

        // 4. Restore Group Members
        if (groupMembers && groupMembers.length > 0) {
            for (const gm of groupMembers) {
                const exists = await GroupMember.findByPk(gm.id);
                if (!exists) await GroupMember.create(gm);
            }
        }

        // 5. Restore Messages
        if (messages && messages.length > 0) {
            for (const m of messages) {
                const exists = await Message.findByPk(m.id);
                if (!exists) await Message.create(m);
            }
        }

        res.json({ message: 'Data restored successfully' });
    } catch (error) {
        console.error('Restore Error:', error);
        res.status(500).json({ message: 'Restore failed', error: error.message });
    }
});

// Endpoint for local script to PUSH data back to Render (Restore)
router.post('/restore', syncAuth, async (req, res) => {
    try {
        const { users, messages, groups, groupMembers, connections } = req.body;
        
        console.log(`[RESTORE] Received restore request. Users: ${users?.length || 0}`);

        // 1. Restore Users
        if (users && users.length > 0) {
            for (const u of users) {
                // Upsert users to preserve IDs
                await User.upsert(u);
            }
        }

        // 2. Restore Groups
        if (groups && groups.length > 0) {
            for (const g of groups) {
                await Group.upsert(g);
            }
        }

        // 3. Restore Connections
        if (connections && connections.length > 0) {
            for (const c of connections) {
                await Connection.upsert(c);
            }
        }

        // 4. Restore GroupMembers
        if (groupMembers && groupMembers.length > 0) {
            for (const gm of groupMembers) {
                await GroupMember.upsert(gm);
            }
        }

        // 5. Restore Messages
        if (messages && messages.length > 0) {
            for (const m of messages) {
                await Message.upsert(m);
            }
        }

        res.json({ message: 'Data restored successfully' });
    } catch (error) {
        console.error('Restore Error:', error);
        res.status(500).json({ message: 'Restore failed', error: error.message });
    }
});

module.exports = router;
