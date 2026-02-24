const axios = require('axios');

const RENDER_API_URL = 'https://qrchat-1.onrender.com/api/sync';
const SYNC_KEY = 'chate-secure-sync-2024';

async function cleanupDuplicateConnections() {
    console.log('\n===================================================');
    console.log('       CLEANING UP DUPLICATE CONNECTIONS');
    console.log('===================================================');

    try {
        // 1. Fetch All Connections directly from Sync API
        console.log('Fetching all connections from Cloud DB...');
        const response = await axios.get(`${RENDER_API_URL}/full`, {
            headers: { 'x-sync-key': SYNC_KEY },
            timeout: 10000
        });

        const connections = response.data.connections;
        if (!connections || connections.length === 0) {
            console.log('❌ No connections found to clean.');
            return;
        }

        console.log(`✅ Found ${connections.length} total connections.`);

        // 2. Identify Duplicates
        // We will keep the FIRST occurrence of any pair {A, B}
        // Since the relationship is bidirectional in concept but stored as requester->receiver,
        // we need to be careful.
        // Usually, we want ONE record per pair if the logic handles bidirectional query (OR requester OR receiver).
        // Let's normalize keys to sorted(id1, id2).join('_') to find unique pairs.
        
        const uniquePairs = new Set();
        const duplicates = [];
        const validConnections = [];

        connections.forEach(conn => {
            const pairKey = [conn.requesterId, conn.receiverId].sort().join('_');
            
            if (uniquePairs.has(pairKey)) {
                // This is a duplicate (or redundant reverse link)
                duplicates.push(conn.id);
            } else {
                uniquePairs.add(pairKey);
                validConnections.push(conn);
            }
        });

        console.log(`   Unique Pairs: ${validConnections.length}`);
        console.log(`   Duplicates to Remove: ${duplicates.length}`);

        if (duplicates.length === 0) {
            console.log('✅ No duplicates found. Database is clean.');
            return;
        }

        // 3. Delete Duplicates
        console.log(`\nSending cleanup request for ${duplicates.length} IDs...`);
        
        await axios.post(`${RENDER_API_URL}/restore`, {
            delete_connections: duplicates
        }, {
            headers: { 'x-sync-key': SYNC_KEY }
        });

        console.log('✅ CLEANUP COMPLETE. Duplicates removed.');
        console.log('   The Chat list should now show unique users only.');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    }
}

cleanupDuplicateConnections();
