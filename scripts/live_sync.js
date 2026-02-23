const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../server/.env') });
const axios = require('axios');
const { Sequelize, DataTypes } = require('sequelize');

// --- CONFIGURATION ---
const RENDER_API_URL = 'https://qrchat-1.onrender.com/api/sync';
const SYNC_KEY = 'chate-secure-sync-2024';

// --- LOCAL DB CONNECTION ---
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false
    }
);

// --- DEFINE MODELS FOR LOCAL SYNC ---
// Note: We define simplified versions just for storage, matching the DB schema
const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, primaryKey: true },
    username: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    password: { type: DataTypes.STRING }, // Include password for local login
    bio: { type: DataTypes.STRING },
    profilePic: { type: DataTypes.TEXT },
    mode: { type: DataTypes.STRING },
    uniqueCode: { type: DataTypes.STRING },
    isOnline: { type: DataTypes.BOOLEAN },
    showOnlineStatus: { type: DataTypes.BOOLEAN },
    lastSeen: { type: DataTypes.DATE },
    createdAt: { type: DataTypes.DATE },
    updatedAt: { type: DataTypes.DATE }
});

const Group = sequelize.define('Group', {
    id: { type: DataTypes.UUID, primaryKey: true },
    name: { type: DataTypes.STRING },
    description: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.UUID },
    profilePic: { type: DataTypes.TEXT }, // Changed from groupPic to match Model
    createdAt: { type: DataTypes.DATE },
    updatedAt: { type: DataTypes.DATE }
});

const GroupMember = sequelize.define('GroupMember', {
    id: { type: DataTypes.UUID, primaryKey: true },
    groupId: { type: DataTypes.UUID },
    userId: { type: DataTypes.UUID },
    role: { type: DataTypes.STRING },
    joinedAt: { type: DataTypes.DATE }
});

const Message = sequelize.define('Message', {
    id: { type: DataTypes.UUID, primaryKey: true },
    senderId: { type: DataTypes.UUID },
    receiverId: { type: DataTypes.UUID }, // Can be null for group messages
    groupId: { type: DataTypes.UUID },     // Can be null for direct messages
    content: { type: DataTypes.TEXT },
    type: { type: DataTypes.STRING },
    fileName: { type: DataTypes.STRING },  // Added
    fileUrl: { type: DataTypes.TEXT },     // Added
    status: { type: DataTypes.STRING },
    isRead: { type: DataTypes.BOOLEAN },
    isEdited: { type: DataTypes.BOOLEAN }, // Added
    deletedAt: { type: DataTypes.DATE },   // Added
    createdAt: { type: DataTypes.DATE },
    updatedAt: { type: DataTypes.DATE }
});

const Connection = sequelize.define('Connection', {
    id: { type: DataTypes.UUID, primaryKey: true },
    requesterId: { type: DataTypes.UUID },
    receiverId: { type: DataTypes.UUID },
    status: { type: DataTypes.STRING },
    createdAt: { type: DataTypes.DATE },
    updatedAt: { type: DataTypes.DATE }
});

const CallHistory = sequelize.define('CallHistory', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    callerId: { type: DataTypes.UUID },
    receiverId: { type: DataTypes.UUID },
    type: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING },
    duration: { type: DataTypes.INTEGER },
    startedAt: { type: DataTypes.DATE },
    endedAt: { type: DataTypes.DATE }
});

// --- MAIN SYNC FUNCTION ---
async function syncData() {
    console.log('--- STARTING REAL-TIME BI-DIRECTIONAL SYNC ---');
    console.log(`Cloud: ${RENDER_API_URL}`);
    console.log(`Local: ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);

    try {
        // Connect to Local MySQL
        await sequelize.authenticate();
        await sequelize.sync();

        // 1. PULL: Cloud -> Local
        console.log('\n[PULL] Checking Cloud data...');
        const response = await axios.get(`${RENDER_API_URL}/full`, {
            headers: { 'x-sync-key': SYNC_KEY }
        });
        const cloudData = response.data;
        
        // 2. SMART MERGE: Check if Local has more data than Cloud (Data Loss on Cloud)
        // OR if Unique Codes mismatch (indicating Cloud re-seed vs Local persistence)
        const localUsers = await User.findAll();
        const localMessages = await Message.findAll();
        const localConnections = await Connection.findAll();
        const localCallHistory = await CallHistory.findAll();
        
        console.log(`\n[STATUS] Cloud Users: ${cloudData.users.length} | Local Users: ${localUsers.length}`);
        console.log(`[STATUS] Cloud Connections: ${cloudData.connections.length} | Local Connections: ${localConnections.length}`);
        console.log(`[STATUS] Cloud Messages: ${cloudData.messages.length} | Local Messages: ${localMessages.length}`);
        console.log(`[STATUS] Cloud Calls: ${cloudData.callHistory?.length || 0} | Local Calls: ${localCallHistory.length}`);
        
        let dataIntegrityIssue = false;
        
        // Check for count mismatch
        if (cloudData.users.length < localUsers.length) {
            console.log('[CHECK] User count mismatch: Cloud has fewer users.');
            dataIntegrityIssue = true;
        }

        // Check for Connection mismatch
        if (cloudData.connections.length < localConnections.length) {
            console.log('[CHECK] Connection count mismatch: Cloud has fewer connections.');
            dataIntegrityIssue = true;
        }

        // Check for Message mismatch
        if (cloudData.messages.length < localMessages.length) {
            console.log('[CHECK] Message count mismatch: Cloud has fewer messages.');
            dataIntegrityIssue = true;
        }

        // Check for Call History mismatch
        if ((cloudData.callHistory?.length || 0) < localCallHistory.length) {
            console.log('[CHECK] Call history mismatch: Cloud has fewer calls.');
            dataIntegrityIssue = true;
        }

        // Check for Unique Code mismatch (Critical for login/identity)
        if (!dataIntegrityIssue && cloudData.users.length > 0) {
            for (const localUser of localUsers) {
                const cloudUser = cloudData.users.find(u => u.username === localUser.username);
                if (cloudUser && cloudUser.uniqueCode !== localUser.uniqueCode) {
                    console.log(`[CHECK] Mismatch detected for ${localUser.username}: Local(${localUser.uniqueCode}) vs Cloud(${cloudUser.uniqueCode})`);
                    dataIntegrityIssue = true;
                    break;
                }
                // Check if cloud user is missing password (if seeded without hash) or hash differs
                // Note: Can't easily check hash equality without knowing plain text, but uniqueCode is a strong enough signal.
            }
        }

        const cloudIsMissingData = dataIntegrityIssue || 
                                   (localMessages.length > 0 && cloudData.messages.length === 0) ||
                                   (localConnections.length > 0 && cloudData.connections.length === 0);

        if (cloudIsMissingData) {
            console.log('\n[PUSH] ⚠️  DETECTED DATA LOSS ON CLOUD (Render Restart?)');
            console.log('[PUSH] Initiating Full Restore from Local Database...');
            
            const payload = {
                users: localUsers,
                groups: await Group.findAll(),
                connections: localConnections,
                groupMembers: await GroupMember.findAll(),
                messages: localMessages,
                callHistory: localCallHistory
            };

            // Push to Render
            await axios.post('https://qrchat-1.onrender.com/api/sync/restore', payload, {
                headers: { 'x-sync-key': SYNC_KEY },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
            console.log('✅ [PUSH] SUCCESS: Cloud database restored from Local Backup!');
            console.log('   All users, chats, and connections are back online.');
            
            // Force Password Update for all users to ensure hash integrity
            console.log('[PUSH] Forcing password hash update for all users...');
            for (const user of localUsers) {
                // Correct URL: /api/sync/force-password (removed extra /restore)
                // RENDER_API_URL is https://qrchat-1.onrender.com/api/sync
                await axios.post(`${RENDER_API_URL}/force-password`, {
                    username: user.username,
                    passwordHash: user.password
                }, {
                    headers: { 'x-sync-key': SYNC_KEY }
                });
                console.log(`   -> Forced password update for: ${user.username}`);
            }

        } else {
            console.log('[PULL] Cloud appears healthy. Syncing changes to Local...');
            // Standard Pull: Cloud -> Local
            if (cloudData.users.length > 0) {
                for (const item of cloudData.users) await User.upsert(item);
                for (const item of cloudData.groups) await Group.upsert(item);
                for (const item of cloudData.connections) await Connection.upsert(item);
                for (const item of cloudData.groupMembers) await GroupMember.upsert(item);
                for (const item of cloudData.messages) await Message.upsert(item);
                if (cloudData.callHistory) {
                    for (const item of cloudData.callHistory) await CallHistory.upsert(item);
                }
                console.log('[PULL] Local database updated from Cloud.');
            }
        }

    } catch (error) {
        console.error('SYNC FAILED:', error.message);
    } finally {
        await sequelize.close();
    }
}

// Run immediately
syncData();
