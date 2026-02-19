const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function inspectCollation() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '2006',
        database: process.env.DB_NAME || 'chate'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        console.log('--- Users.id ---');
        const [userCols] = await connection.execute(`SHOW FULL COLUMNS FROM Users WHERE Field = 'id'`);
        console.log(userCols[0]);

        console.log('--- Messages.receiverId ---');
        const [msgCols] = await connection.execute(`SHOW FULL COLUMNS FROM Messages WHERE Field = 'receiverId'`);
        console.log(msgCols[0]);

        console.log('--- Messages.senderId ---');
        const [senderCols] = await connection.execute(`SHOW FULL COLUMNS FROM Messages WHERE Field = 'senderId'`);
        console.log(senderCols[0]);

        await connection.end();

    } catch (error) {
        console.error('Error:', error);
    }
}

inspectCollation();
