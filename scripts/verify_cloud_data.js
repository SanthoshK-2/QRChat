const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../server/.env') });

const RENDER_API_URL = 'https://qrchat-1.onrender.com/api/sync';
const SYNC_KEY = 'chate-secure-sync-2024';

async function verifyCloudData() {
    try {
        console.log('Fetching data from Cloud...');
        const response = await axios.get(`${RENDER_API_URL}/full`, {
            headers: { 'x-sync-key': SYNC_KEY }
        });
        const data = response.data;

        console.log('\n--- CLOUD USERS ---');
        const userMap = {};
        data.users.forEach(u => {
            console.log(`${u.username} (${u.id})`);
            userMap[u.id] = u.username;
        });

        console.log('\n--- CLOUD CONNECTIONS ---');
        data.connections.forEach(c => {
            const reqName = userMap[c.requesterId] || `UNKNOWN(${c.requesterId})`;
            const recName = userMap[c.receiverId] || `UNKNOWN(${c.receiverId})`;
            console.log(`${reqName} <-> ${recName} [${c.status}] (ID: ${c.id})`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

verifyCloudData();
