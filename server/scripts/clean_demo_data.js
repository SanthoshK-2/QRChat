const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function cleanDemoData() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '2006',
        database: process.env.DB_NAME || 'chate'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL for cleanup.');

        // Emails to delete
        const emailsToDelete = ['demo1@example.com', 'demo2@example.com', 'admin@example.com'];
        const usernamePrefix = 'DemoUser';

        console.log(`\nDeleting users with emails: ${emailsToDelete.join(', ')}`);
        
        // Delete messages first to maintain referential integrity (if cascade not set, though usually handled)
        // But to be safe, we rely on ON DELETE CASCADE or manually delete
        // Let's find IDs first
        
        const [users] = await connection.query('SELECT id, username FROM Users WHERE email IN (?) OR username LIKE ?', [emailsToDelete, `${usernamePrefix}%`]);
        
        if (users.length > 0) {
            const ids = users.map(u => u.id);
            console.log(`Found ${users.length} users to delete:`, users.map(u => u.username).join(', '));

            // Delete Messages where these users are sender or receiver
            const [delMsgs] = await connection.query('DELETE FROM Messages WHERE senderId IN (?) OR receiverId IN (?)', [ids, ids]);
            console.log(`Deleted ${delMsgs.affectedRows} associated messages.`);

            // Delete Users
            const [delUsers] = await connection.query('DELETE FROM Users WHERE id IN (?)', [ids]);
            console.log(`Deleted ${delUsers.affectedRows} users.`);
        } else {
            console.log('No demo users found.');
        }

        await connection.end();
        console.log('Cleanup complete.');

    } catch (err) {
        console.error('Error during cleanup:', err);
        process.exit(1);
    }
}

cleanDemoData();
