const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const crypto = require('crypto'); // Use native crypto for UUID
require('dotenv').config({ path: '../.env' });

function uuidv4() {
    return crypto.randomUUID();
}

async function seedData() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '2006',
        database: process.env.DB_NAME || 'chate'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL for seeding.');

        // 1. Seed Users
        console.log('\n--- Seeding Users ---');
        
        // Default password "123456"
        const hashedPassword = await bcrypt.hash('123456', 10);
        
        const demoUsers = [
            {
                username: 'DemoUser1',
                email: 'demo1@example.com',
                password: hashedPassword,
                uniqueCode: '100001',
                isOnline: 1,
                lastSeen: new Date()
            },
            {
                username: 'DemoUser2',
                email: 'demo2@example.com',
                password: hashedPassword,
                uniqueCode: '100002',
                isOnline: 0,
                lastSeen: new Date(Date.now() - 3600000) // 1 hour ago
            },
            {
                username: 'AdminUser',
                email: 'admin@example.com',
                password: hashedPassword,
                uniqueCode: '999999',
                isOnline: 1,
                lastSeen: new Date()
            }
        ];

        const createdUserIds = [];

        for (const user of demoUsers) {
            // Check if user exists
            const [existing] = await connection.execute('SELECT id FROM Users WHERE email = ?', [user.email]);
            if (existing.length === 0) {
                const id = uuidv4();
                await connection.execute(
                    `INSERT INTO Users (id, username, email, password, uniqueCode, isOnline, lastSeen, createdAt, updatedAt) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                    [id, user.username, user.email, user.password, user.uniqueCode, user.isOnline, user.lastSeen]
                );
                console.log(`Created user: ${user.username}`);
                createdUserIds.push(id);
            } else {
                console.log(`User ${user.username} already exists.`);
                createdUserIds.push(existing[0].id);
            }
        }

        // 2. Seed Messages
        console.log('\n--- Seeding Messages ---');
        
        const messages = [
            { senderId: createdUserIds[0], receiverId: createdUserIds[1], content: 'U2FsdGVkX19/Hello (Encrypted)' },
            { senderId: createdUserIds[1], receiverId: createdUserIds[0], content: 'U2FsdGVkX19/Hi there (Encrypted)' },
            { senderId: createdUserIds[0], receiverId: createdUserIds[2], content: 'U2FsdGVkX19/Admin check (Encrypted)' }
        ];

        if (createdUserIds.length >= 2) {
             for (const msg of messages) {
                 if(msg.senderId && msg.receiverId) {
                     const id = uuidv4();
                     await connection.execute(
                        `INSERT INTO Messages (id, senderId, receiverId, content, createdAt, updatedAt) 
                         VALUES (?, ?, ?, ?, NOW(), NOW())`,
                        [id, msg.senderId, msg.receiverId, msg.content]
                     );
                     console.log(`Inserted message from ${msg.senderId} to ${msg.receiverId}`);
                 }
             }
        }

        console.log('\n--- Verification Instructions ---');
        console.log('Open MySQL Workbench and run the following queries:');
        console.log('SELECT * FROM Users;');
        console.log('SELECT * FROM Messages;');

        await connection.end();

    } catch (error) {
        console.error('Seeding Error:', error);
    }
}

seedData();
