const axios = require('axios');

const RENDER_API_URL = 'https://qrchat-1.onrender.com/api/sync';
const SYNC_KEY = 'chate-secure-sync-2024';

async function fixAllConnections() {
    console.log('\n===================================================');
    console.log('       FIXING CONNECTIONS FOR ALL USERS');
    console.log('===================================================');

    try {
        // 1. Fetch All Users
        console.log('Fetching all users...');
        const response = await axios.get(`${RENDER_API_URL}/full`, {
            headers: { 'x-sync-key': SYNC_KEY },
            timeout: 10000
        });

        const users = response.data.users;
        if (!users || users.length === 0) {
            console.log('❌ No users found in Cloud DB.');
            return;
        }

        console.log(`✅ Found ${users.length} users: ${users.map(u => u.username).join(', ')}`);

        // 2. Create connections between EVERYONE
        const connections = [];
        
        for (let i = 0; i < users.length; i++) {
            for (let j = i + 1; j < users.length; j++) {
                const userA = users[i];
                const userB = users[j];

                // Create Connection A -> B
                connections.push({
                    requesterId: userA.id,
                    receiverId: userB.id,
                    status: 'accepted'
                });
                
                console.log(`   Prepared link: ${userA.username} <-> ${userB.username}`);
            }
        }

        // 3. Push Connections
        console.log(`\nPushing ${connections.length} connections to Cloud...`);
        
        await axios.post(`${RENDER_API_URL}/restore`, {
            connections: connections
        }, {
            headers: { 'x-sync-key': SYNC_KEY }
        });

        console.log('\n✅ SUCCESS: All users are now connected to each other.');
        console.log('   Everyone should appear in everyone else\'s Chat list.');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

fixAllConnections();
