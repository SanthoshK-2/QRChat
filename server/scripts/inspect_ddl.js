const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function inspectDDL() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '2006',
        database: process.env.DB_NAME || 'chate'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        const [usersDDL] = await connection.execute(`SHOW CREATE TABLE Users`);
        console.log('\n--- Users Table DDL ---');
        console.log(usersDDL[0]['Create Table']);

        const [messagesDDL] = await connection.execute(`SHOW CREATE TABLE Messages`);
        console.log('\n--- Messages Table DDL ---');
        console.log(messagesDDL[0]['Create Table']);

        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

inspectDDL();
