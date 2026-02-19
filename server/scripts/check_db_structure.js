const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function checkStructure() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '2006',
        database: process.env.DB_NAME || 'chate'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL.');
        console.log(`Database: ${dbConfig.database}`);

        // Get Tables
        const [tables] = await connection.execute('SHOW TABLES');
        
        if (tables.length === 0) {
            console.log('No tables found!');
        } else {
            console.log('\n--- Verified Tables & Row Counts ---');
            for (const row of tables) {
                const tableName = Object.values(row)[0];
                const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM \`${tableName}\``);
                const count = countResult[0].count;
                console.log(`- ${tableName}: ${count} rows`);
            }
            console.log('\nTables definitely exist in the database.');
        }

        await connection.end();

    } catch (error) {
        console.error('Error:', error);
    }
}

checkStructure();
