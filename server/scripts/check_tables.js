const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function checkTables() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '2006',
        database: process.env.DB_NAME || 'chate'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database:', dbConfig.database);

        const [tables] = await connection.execute('SHOW TABLES');
        console.log('Tables found:', tables.map(t => Object.values(t)[0]));

        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkTables();
