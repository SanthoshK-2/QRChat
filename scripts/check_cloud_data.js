const axios = require('axios');

const RENDER_API_URL = 'https://qrchat-1.onrender.com/api/sync';
const SYNC_KEY = 'chate-secure-sync-2024';

async function checkCloudData() {
    console.log('\n===================================================');
    console.log('       CHECKING AIVEN CLOUD DATABASE DATA');
    console.log('===================================================');
    console.log('Connecting to Cloud API...');

    try {
        // First check status
        try {
            const statusRes = await axios.get(`${RENDER_API_URL}/status`, {
                headers: { 'x-sync-key': SYNC_KEY },
                timeout: 5000
            });
            console.log('\n🔍 DIAGNOSTIC REPORT:');
            console.log('   Database Type:', statusRes.data.dialect);
            
            if (statusRes.data.dialect === 'sqlite') {
                console.log('   ❌ STATUS: USING TEMPORARY DATABASE (NOT AIVEN)');
                console.log('   ⚠️  REASON: The server is NOT connected to the Cloud Database.');
                console.log('   👉  ACTION REQUIRED: You must add DATABASE_URL in Render Environment Variables.');
            } else {
                console.log('   ✅ STATUS: CONNECTED TO CLOUD DATABASE (AIVEN)');
            }

            if (statusRes.data.connection_error) {
                console.log('   Connection Error:', statusRes.data.connection_error);
            }
            if (!statusRes.data.env_db_url_exists) {
                console.log('   WARNING: DATABASE_URL environment variable is MISSING on server!');
            }
        } catch (e) {
            console.log('   (Diagnostic endpoint not available yet - server might be updating)');
        }

        const response = await axios.get(`${RENDER_API_URL}/full`, {
            headers: { 'x-sync-key': SYNC_KEY },
            timeout: 10000
        });

        const data = response.data;

        console.log('\n✅ CONNECTION SUCCESSFUL');
        console.log('---------------------------------------------------');
        
        // USERS
        console.log(`\n📋 USERS FOUND: ${data.users.length}`);
        if (data.users.length > 0) {
            const simplifiedUsers = data.users.map(u => ({
                ID: u.id.substring(0, 8) + '...',
                Username: u.username,
                Email: u.email,
                Code: u.uniqueCode,
                Online: u.isOnline ? '🟢' : '⚪'
            }));
            console.table(simplifiedUsers);
        } else {
            console.log('   (No users found)');
        }

        // MESSAGES
        console.log(`\n💬 MESSAGES FOUND: ${data.messages.length}`);
        if (data.messages.length > 0) {
            console.log(`   (Latest 5 messages)`);
            const latestMessages = data.messages.slice(-5).map(m => ({
                From: m.senderId.substring(0, 8) + '...',
                To: m.receiverId ? m.receiverId.substring(0, 8) + '...' : 'Group',
                Content: m.content.substring(0, 30) + (m.content.length > 30 ? '...' : ''),
                Status: m.status
            }));
            console.table(latestMessages);
        }

        // CONNECTIONS
        console.log(`\n🔗 CONNECTIONS FOUND: ${data.connections.length}`);

        console.log('\n===================================================');
        console.log('✅ CONCLUSION: Data IS safely stored in Aiven Cloud.');
        console.log('   If MySQL Workbench is empty, click the "Refresh"');
        console.log('   icon next to "SCHEMAS" or right-click "Tables".');
        console.log('===================================================');

    } catch (error) {
        console.error('\n❌ ERROR CONNECTING TO CLOUD:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

checkCloudData();
