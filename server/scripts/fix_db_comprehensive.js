const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function fixDatabase() {
    console.log('Starting comprehensive database fix...');
    
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '2006',
        database: process.env.DB_NAME || 'chate'
    };

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log(`Connected to database: ${dbConfig.database}`);

        // 1. Get all tables
        const [tables] = await connection.execute('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        console.log(`Found tables: ${tableNames.join(', ')}`);

        // 2. Iterate tables and drop duplicate indexes
        for (const table of tableNames) {
            console.log(`\nProcessing table: ${table}`);
            const [indexes] = await connection.execute(`SHOW INDEX FROM \`${table}\``);
            
            // Identify indexes to drop
            // We specifically target indexes ending in _number (e.g., username_1, username_2)
            // Or just any non-primary index if we want to be aggressive (but safe to keep simple ones)
            // The error "Too many keys" is definitely caused by duplicates.
            
            const indexesToDrop = new Set();
            indexes.forEach(idx => {
                const name = idx.Key_name;
                if (name === 'PRIMARY') return;
                
                // Check for duplicate pattern (ending in _number)
                // e.g., username_1, email_15
                if (name.match(/_\d+$/)) {
                    indexesToDrop.add(name);
                }
                
                // Also checking for excessive number of indexes. 
                // If we have just 'username', we keep it. 
            });

            if (indexesToDrop.size > 0) {
                console.log(`Found ${indexesToDrop.size} duplicate indexes to drop in ${table}.`);
                for (const indexName of indexesToDrop) {
                    try {
                        await connection.execute(`DROP INDEX \`${indexName}\` ON \`${table}\``);
                        console.log(`Dropped index: ${indexName}`);
                    } catch (err) {
                        console.log(`Failed to drop ${indexName}: ${err.message}`);
                    }
                }
            } else {
                console.log(`No duplicate indexes found in ${table}.`);
            }
        }

        // 3. Specific fix for Messages table (receiverId nullable)
        // Based on previous error: "Column 'receiverId' cannot be NOT NULL"
        if (tableNames.includes('Messages') || tableNames.includes('messages')) {
            const tableName = tableNames.includes('Messages') ? 'Messages' : 'messages';
            console.log(`\nChecking ${tableName} structure...`);
            
            try {
                // Check if receiverId exists
                const [columns] = await connection.execute(`SHOW COLUMNS FROM \`${tableName}\` LIKE 'receiverId'`);
                if (columns.length > 0) {
                    const col = columns[0];
                    if (col.Null === 'NO') {
                        console.log(`Modifying receiverId to allow NULL in ${tableName}...`);
                        await connection.execute(`ALTER TABLE \`${tableName}\` MODIFY COLUMN receiverId CHAR(36) NULL`);
                        console.log('Done.');
                    } else {
                        console.log('receiverId already allows NULL.');
                    }
                }
            } catch (err) {
                console.error(`Error fixing ${tableName}: ${err.message}`);
            }
        }

        console.log('\nDatabase fix completed.');

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

fixDatabase();
