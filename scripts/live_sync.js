require('dotenv').config({ path: '../server/.env' });
const axios = require('axios');
const { Sequelize, DataTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const RENDER_API_URL = 'https://qrchat-1.onrender.com/api/sync/users';
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

// Define User Model for Local Sync
const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, primaryKey: true },
    username: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    bio: { type: DataTypes.STRING },
    mode: { type: DataTypes.STRING },
    uniqueCode: { type: DataTypes.STRING },
    createdAt: { type: DataTypes.DATE }
}, { timestamps: false });

// --- MAIN SYNC FUNCTION ---
async function syncData() {
    console.log('--- STARTING REAL-TIME DATA SYNC ---');
    console.log(`Target: ${RENDER_API_URL}`);
    console.log(`Local DB: ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);

    try {
        // 1. Fetch from Render
        console.log('Fetching users from Render...');
        const response = await axios.get(RENDER_API_URL, {
            headers: { 'x-sync-key': SYNC_KEY }
        });
        const remoteUsers = response.data;
        console.log(`Fetched ${remoteUsers.length} users from Live Website.`);

        // 2. Update Local MySQL
        await sequelize.authenticate();
        console.log('Connected to Local MySQL.');
        
        // Ensure table exists (basic check)
        await sequelize.sync(); 

        let newCount = 0;
        let updateCount = 0;

        for (const rUser of remoteUsers) {
            const [localUser, created] = await User.findOrCreate({
                where: { id: rUser.id },
                defaults: rUser
            });

            if (created) {
                console.log(`[NEW] Added user: ${rUser.username} (${rUser.email})`);
                newCount++;
            } else {
                // Update existing if changed (optional, but good for bio updates)
                if (localUser.username !== rUser.username || localUser.bio !== rUser.bio) {
                    await localUser.update(rUser);
                    console.log(`[UPDATED] User: ${rUser.username}`);
                    updateCount++;
                }
            }
        }

        console.log(`--- SYNC COMPLETE ---`);
        console.log(`New Users: ${newCount}`);
        console.log(`Updated Users: ${updateCount}`);
        console.log(`Total Local Users: ${remoteUsers.length}`);

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
