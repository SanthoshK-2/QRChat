const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function viewData() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '2006',
        database: process.env.DB_NAME || 'chate'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL database.');

        // View Users
        console.log('\n--- Users Table ---');
        // Selecting specific fields to keep the output readable
        const [users] = await connection.execute('SELECT id, username, email, isOnline, lastSeen FROM Users');
        if (users.length === 0) {
            console.log('No users found.');
        } else {
            console.table(users);
        }

        // View Messages
        console.log('\n--- Messages Table (Last 10) ---');
        const [messages] = await connection.execute('SELECT id, senderId, receiverId, content, createdAt FROM Messages ORDER BY createdAt DESC LIMIT 10');
        if (messages.length === 0) {
            console.log('No messages found.');
        } else {
            // Truncate content for display if too long
            const formattedMessages = messages.map(m => ({
                ...m,
                content: m.content ? (m.content.length > 50 ? m.content.substring(0, 50) + '...' : m.content) : '[No Content]'
            }));
            console.table(formattedMessages);
        }

        // View BlockList (Since we were working on blocking)
        console.log('\n--- BlockList Table ---');
        try {
            const [blocks] = await connection.execute('SELECT * FROM BlockList');
             if (blocks.length === 0) {
                console.log('No active blocks found.');
            } else {
                console.table(blocks);
            }
        } catch (e) {
            console.log('BlockList table might not exist yet or error reading it.');
        }

        // View CallHistory
        console.log('\n--- CallHistories Table ---');
        try {
            const [calls] = await connection.execute('SELECT * FROM CallHistories ORDER BY createdAt DESC LIMIT 10');
             if (calls.length === 0) {
                console.log('No call history found.');
            } else {
                console.table(calls);
            }
        } catch (e) {
            console.log('CallHistories table might not exist yet or error reading it: ' + e.message);
        }

        await connection.end();
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

viewData();
