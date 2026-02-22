require('dotenv').config({ path: '../server/.env' });
const axios = require('axios');
const { Sequelize, DataTypes } = require('sequelize');

// --- CONFIGURATION ---
const RENDER_API_URL = 'https://qrchat-1.onrender.com/api/sync/full';
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
    bio: { type: DataTypes.STRING },
    mode: { type: DataTypes.STRING },
    uniqueCode: { type: DataTypes.STRING },
    isOnline: { type: DataTypes.BOOLEAN },
    lastSeen: { type: DataTypes.DATE },
    createdAt: { type: DataTypes.DATE },
    updatedAt: { type: DataTypes.DATE }
});

const Group = sequelize.define('Group', {
    id: { type: DataTypes.UUID, primaryKey: true },
    name: { type: DataTypes.STRING },
    description: { type: DataTypes.STRING },
    createdBy: { type: DataTypes.UUID },
    groupPic: { type: DataTypes.STRING },
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
    status: { type: DataTypes.STRING },
    isRead: { type: DataTypes.BOOLEAN },
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

// --- MAIN SYNC FUNCTION ---
async function syncData() {
    console.log('--- STARTING REAL-TIME FULL DATA SYNC ---');
    console.log(`Target: ${RENDER_API_URL}`);
    console.log(`Local DB: ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);

    try {
        // 1. Fetch Full Data from Render
        console.log('Fetching all data from Live Server...');
        const response = await axios.get(RENDER_API_URL, {
            headers: { 'x-sync-key': SYNC_KEY }
        });
        const { users, messages, groups, groupMembers, connections } = response.data;
        
        console.log(`FETCHED:`);
        console.log(`- Users: ${users.length}`);
        console.log(`- Groups: ${groups.length}`);
        console.log(`- Members: ${groupMembers.length}`);
        console.log(`- Messages: ${messages.length}`);
        console.log(`- Connections: ${connections.length}`);

        // 2. Connect to Local MySQL
        await sequelize.authenticate();
        console.log('Connected to Local MySQL.');
        
        // Sync tables (ensure they exist)
        // Note: In a real app we might not want to force sync, but for this demo tool it's safer
        await sequelize.sync(); 

        // 3. Insert Data in Dependency Order
        
        // A. USERS
        console.log('Syncing Users...');
        for (const item of users) {
            await User.upsert(item);
        }

        // B. GROUPS (Depend on Users for createdBy)
        console.log('Syncing Groups...');
        for (const item of groups) {
            await Group.upsert(item);
        }

        // C. CONNECTIONS (Depend on Users)
        console.log('Syncing Connections...');
        for (const item of connections) {
            await Connection.upsert(item);
        }

        // D. GROUP MEMBERS (Depend on Groups and Users)
        console.log('Syncing Group Members...');
        for (const item of groupMembers) {
            await GroupMember.upsert(item);
        }

        // E. MESSAGES (Depend on Users and Groups)
        console.log('Syncing Messages...');
        for (const item of messages) {
            await Message.upsert(item);
        }

        console.log(`--- FULL SYNC COMPLETE ---`);
        console.log('All live data is now mirrored in your local MySQL Workbench.');

    } catch (error) {
        console.error('SYNC FAILED:', error.message);
        if (error.response) {
            console.error('Server Response:', error.response.status, error.response.data);
        }
    } finally {
        await sequelize.close();
    }
}

// Run immediately
syncData();
