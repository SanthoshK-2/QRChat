const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' }); // Adjust path if running from server/scripts

async function fixIndexes() {
    console.log('Starting index cleanup...');
    
    // Config
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '2006',
        database: process.env.DB_NAME || 'chate'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        const [rows] = await connection.execute(`SHOW INDEX FROM users`);
        
        // Group indexes by Key_name
        const indexes = new Set();
        rows.forEach(row => {
            if (row.Key_name !== 'PRIMARY') {
                indexes.add(row.Key_name);
            }
        });

        console.log(`Found ${indexes.size} secondary indexes.`);

        for (const indexName of indexes) {
            console.log(`Dropping index: ${indexName}`);
            try {
                await connection.execute(`DROP INDEX \`${indexName}\` ON users`);
            } catch (e) {
                console.error(`Failed to drop ${indexName}: ${e.message}`);
            }
        }

        console.log('All secondary indexes dropped. Sequelize will recreate necessary ones.');
        await connection.end();

    } catch (error) {
        console.error('Error:', error);
    }
}

fixIndexes();
