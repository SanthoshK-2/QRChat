const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function showTables() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '2006',
        database: process.env.DB_NAME || 'chate'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log(`Connected to database: ${dbConfig.database}`);

        console.log('\n--- Listing Tables ---');
        const [tables] = await connection.execute('SHOW TABLES');
        
        if (tables.length === 0) {
            console.log('No tables found!');
        } else {
            // The key in the result object depends on the database name, usually "Tables_in_chate"
            const key = `Tables_in_${dbConfig.database}`;
            tables.forEach((table, index) => {
                console.log(`${index + 1}. ${table[key] || Object.values(table)[0]}`);
            });
            console.log(`\nTotal: ${tables.length} tables found.`);
        }

        await connection.end();

    } catch (error) {
        console.error('Error:', error);
    }
}

showTables();
