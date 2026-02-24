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
        // Since we don't have a bulk delete endpoint exposed for arbitrary IDs in syncRoutes,
        // we will use a TRICK:
        // We will PUSH the "validConnections" back to the server using /restore endpoint 
        // BUT the /restore endpoint usually ADDS. It doesn't replace.
        // 
        // So we actually need to ADD a cleanup endpoint to the server code FIRST.
        // We cannot delete from client side without a delete route.
        
        console.log('⚠️  Cannot delete directly from script without backend support.');
        console.log('   Please deploy the backend update first (which I will do next).');
        console.log('   IDs to delete:', duplicates.slice(0, 5), '...');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    }
}

cleanupDuplicateConnections();
