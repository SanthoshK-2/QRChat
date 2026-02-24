const axios = require('axios');
const bcrypt = require('bcrypt');

const RENDER_API_URL = 'https://qrchat-1.onrender.com/api/sync';
const SYNC_KEY = 'chate-secure-sync-2024';

async function forceFixLogin() {
    console.log('--- FORCING PASSWORD FIX FOR USER: Kumar ---');
    
    // 1. Generate a BRAND NEW hash for 'vkdsanthosh2'
    // We do this LOCALLY to guarantee it is correct.
    const newHash = await bcrypt.hash('vkdsanthosh2', 10);
    console.log(`Generated New Hash: ${newHash}`);

    try {
        // 2. Force Update the Cloud DB with this EXACT hash
        console.log('Pushing new hash to Cloud...');
        await axios.post(`${RENDER_API_URL}/force-password`, {
            username: 'Kumar',
            passwordHash: newHash
        }, {
            headers: { 'x-sync-key': SYNC_KEY }
        });

        console.log('✅ SUCCESS: Password has been reset in the Cloud.');
        console.log('   You should be able to login as "Kumar" with "vkdsanthosh2" immediately.');

    } catch (error) {
        console.error('❌ FAILED:', error.message);
        if (error.response) {
            console.error('   Server Response:', error.response.data);
        }
    }
}

forceFixLogin();
