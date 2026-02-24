const axios = require('axios');

const BASE_URL = 'https://qrchat-1.onrender.com';
const API_URL = `${BASE_URL}/api`;

async function verifyDeployment() {
    console.log('===================================================');
    console.log('       VERIFYING DEPLOYED APPLICATION');
    console.log('       Target: ' + BASE_URL);
    console.log('===================================================');

    try {
        // 1. Verify Server is Running
        console.log('\n1. Checking Server Status...');
        try {
            await axios.get(BASE_URL);
            console.log('   ✅ Server is ONLINE (HTTP 200 OK)');
        } catch (e) {
            console.log('   ⚠️  Server might be starting up (HTTP ' + (e.response?.status || 'Error') + ')');
        }

        // 2. Verify Login (Kumar)
        console.log('\n2. Verifying Login for user "Kumar"...');
        let token = '';
        let userId = '';
        try {
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                username: 'Kumar',
                password: 'vkdsanthosh2'
            });
            token = loginRes.data.token;
            userId = loginRes.data.id;
            console.log('   ✅ Login SUCCESS');
            console.log('   ✅ Token Received');
        } catch (e) {
            console.error('   ❌ Login FAILED:', e.response?.data?.message || e.message);
            return; // Cannot proceed without login
        }

        // 3. Verify Chat Connections
        console.log('\n3. Verifying Chat Connections (Connected Users)...');
        try {
            const connRes = await axios.get(`${API_URL}/connections`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const connections = connRes.data;
            if (connections.length > 0) {
                console.log(`   ✅ Found ${connections.length} Connected Users:`);
                connections.forEach(c => {
                    const otherUser = c.requester.id === userId ? c.receiver : c.requester;
                    console.log(`      - ${otherUser.username} (Status: ${c.status})`);
                });
            } else {
                console.log('   ❌ No connections found! Chat list will be empty.');
            }
        } catch (e) {
            console.error('   ❌ Failed to fetch connections:', e.message);
        }

        // 4. Verify Data Persistence (Sync Check)
        console.log('\n4. Verifying Data Persistence (Cloud DB)...');
        try {
            const syncRes = await axios.get(`${API_URL}/sync/full`, {
                headers: { 'x-sync-key': 'chate-secure-sync-2024' }
            });
            console.log(`   ✅ Cloud DB contains ${syncRes.data.users.length} Users`);
            console.log(`   ✅ Cloud DB contains ${syncRes.data.messages.length} Messages`);
        } catch (e) {
            console.error('   ❌ Failed to check Cloud DB:', e.message);
        }

        console.log('\n===================================================');
        console.log('   CONCLUSION:');
        console.log('   If all checks passed, the application is ready.');
        console.log('===================================================');

    } catch (error) {
        console.error('Unexpected Error:', error.message);
    }
}

verifyDeployment();
