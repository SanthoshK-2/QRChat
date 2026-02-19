const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function cleanupDemoData() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '2006',
        database: process.env.DB_NAME || 'chate'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL for cleanup.');

        const demoEmails = ['demo1@example.com', 'demo2@example.com', 'admin@example.com'];
        
        // 1. Find Demo Users
        console.log(`\n--- Finding Demo Users (${demoEmails.join(', ')}) ---`);
        
        // Construct placeholder string for IN clause
        const placeholders = demoEmails.map(() => '?').join(',');
        const [users] = await connection.execute(
            `SELECT id, username, email FROM Users WHERE email IN (${placeholders})`,
            demoEmails
        );

        if (users.length === 0) {
            console.log('No demo users found to delete.');
        } else {
            const userIds = users.map(u => u.id);
            console.log(`Found ${users.length} demo users:`, users.map(u => u.username).join(', '));

            // 2. Delete Messages involving these users
            console.log('\n--- Deleting Associated Messages ---');
            const idPlaceholders = userIds.map(() => '?').join(',');
            
            // Delete where sender OR receiver is a demo user
            // Note: We need to pass the IDs twice (once for senderId, once for receiverId)
            const [msgResult] = await connection.execute(
                `DELETE FROM Messages WHERE senderId IN (${idPlaceholders}) OR receiverId IN (${idPlaceholders})`,
                [...userIds, ...userIds]
            );
            console.log(`Deleted ${msgResult.affectedRows} messages related to demo users.`);

            // 3. Delete the Users
            console.log('\n--- Deleting Demo Users ---');
            const [userResult] = await connection.execute(
                `DELETE FROM Users WHERE id IN (${idPlaceholders})`,
                userIds
            );
            console.log(`Deleted ${userResult.affectedRows} demo users.`);
        }

        // 4. Verify Remaining Data
        console.log('\n--- Remaining Users (Registered Only) ---');
        const [remainingUsers] = await connection.execute('SELECT id, username, email, isOnline FROM Users');
        console.table(remainingUsers);

        await connection.end();

    } catch (error) {
        console.error('Cleanup Error:', error);
    }
}

cleanupDemoData();
