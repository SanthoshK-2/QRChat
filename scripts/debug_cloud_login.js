const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../server/.env') });

const RENDER_API_URL = 'https://qrchat-1.onrender.com/api';
const SYNC_KEY = 'chate-secure-sync-2024';

async function debugLogin() {
    console.log('--- DEBUGGING CLOUD LOGIN ---');
    const username = 'Kumar';
    const password = 'vkdsanthosh2';

    try {
        // 1. Try to Login
        console.log(`Attempting login for: ${username} / ${password}`);
        try {
            const loginRes = await axios.post(`${RENDER_API_URL}/auth/login`, {
                username,
                password
            });
            console.log('✅ LOGIN SUCCESS!');
            console.log('   Token:', loginRes.data.token ? 'Received' : 'Missing');
        } catch (e) {
            console.log('❌ LOGIN FAILED');
            if (e.response) {
                console.log('   Status:', e.response.status);
                console.log('   Message:', e.response.data.message);
            } else {
                console.log('   Error:', e.message);
            }
        }

        // 2. Fetch User Data to inspect Hash (via Sync Endpoint)
        console.log('\n--- INSPECTING CLOUD DATA ---');
        const syncRes = await axios.get(`${RENDER_API_URL}/sync/full`, {
            headers: { 'x-sync-key': SYNC_KEY }
        });
        
        const user = syncRes.data.users.find(u => u.username === username);
        if (user) {
            console.log(`User Found: ${user.username}`);
            console.log(`Stored Hash: ${user.password}`);
            console.log(`Hash Length: ${user.password.length}`);
            
            // Check if it looks like a valid bcrypt hash
            if (user.password.startsWith('$2b$')) {
                console.log('Format: Looks like a valid Bcrypt hash');
            } else {
                console.log('⚠️  WARNING: Password is NOT a bcrypt hash! It might be plain text.');
            }
        } else {
            console.log('❌ User "Kumar" NOT found in Cloud DB!');
        }

    } catch (error) {
        console.error('Debug Error:', error.message);
    }
}

debugLogin();
