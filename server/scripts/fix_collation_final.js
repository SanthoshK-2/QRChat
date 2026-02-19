const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function fixCollationFinal() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '2006',
        database: process.env.DB_NAME || 'chate'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        // 1. Drop FKs on Messages
        const [rows] = await connection.execute(`
            SELECT CONSTRAINT_NAME 
            FROM information_schema.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'messages' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        `, [dbConfig.database]);

        for (const row of rows) {
            try {
                await connection.execute(`ALTER TABLE Messages DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``);
                console.log(`Dropped FK: ${row.CONSTRAINT_NAME}`);
            } catch (e) {
                console.log(`Note: ${e.message}`);
            }
        }

        // 2. Fix Collation
        console.log('Fixing collation for receiverId...');
        await connection.execute(`
            ALTER TABLE Messages 
            MODIFY receiverId CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL
        `);
        
        console.log('Fixing collation for groupId...');
        await connection.execute(`
            ALTER TABLE Messages 
            MODIFY groupId CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL
        `);

        console.log('Done. Collation fixed.');
        await connection.end();

    } catch (error) {
        console.error('Error:', error);
    }
}

fixCollationFinal();
