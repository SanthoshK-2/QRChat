const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function fixMySQLIssues() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '2006',
        database: process.env.DB_NAME || 'chate'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        // 1. Fix Collation for receiverId, senderId, groupId to match Users.id (utf8mb4_bin)
        console.log('--- Fixing Collation ---');
        
        // Ensure Users.id is indeed utf8mb4_bin (it should be, but let's be sure)
        // Actually, let's just force Messages columns to utf8mb4_bin which is standard for UUIDs in Sequelize often.
        const colsToFix = ['receiverId', 'senderId', 'groupId'];
        
        for (const col of colsToFix) {
             console.log(`Modifying ${col} to CHAR(36) utf8mb4_bin NULL...`);
             try {
                 // We must drop FK first if it exists? We dropped them before, but Sequelize might have re-added.
                 // Let's drop FKs for these columns just in case.
                 // But wait, if we modify column, MySQL might complain if FK exists.
                 // Let's find and drop FKs for these columns first.
                 const [fks] = await connection.execute(`
                    SELECT CONSTRAINT_NAME 
                    FROM information_schema.KEY_COLUMN_USAGE 
                    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'messages' AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL
                 `, [dbConfig.database, col]);
                 
                 for (const fk of fks) {
                     console.log(`Dropping FK ${fk.CONSTRAINT_NAME} for ${col}...`);
                     await connection.execute(`ALTER TABLE Messages DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
                 }

                 // Now modify
                 await connection.execute(`ALTER TABLE Messages MODIFY \`${col}\` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL`);
                 console.log(`${col} updated.`);
             } catch (e) {
                 console.error(`Failed to fix ${col}: ${e.message}`);
             }
        }

        // 2. Ensure Users table doesn't have duplicate indexes (just a quick check/cleanup)
        console.log('\n--- Cleaning Users Indexes ---');
        const [userIndexes] = await connection.execute(`SHOW INDEX FROM Users`);
        const duplicateIndexes = new Set();
        userIndexes.forEach(row => {
            // Drop anything that looks like a duplicate (ending in _2, _3, etc) or isn't the main ones
            if (row.Key_name.match(/_\d+$/)) {
                duplicateIndexes.add(row.Key_name);
            }
        });
        
        for (const idx of duplicateIndexes) {
             console.log(`Dropping duplicate index: ${idx}`);
             try {
                 await connection.execute(`DROP INDEX \`${idx}\` ON Users`);
             } catch (e) {
                 console.log(`Skipped ${idx}: ${e.message}`);
             }
        }

        console.log('\nDone. Restart server now.');
        await connection.end();

    } catch (error) {
        console.error('Error:', error);
    }
}

fixMySQLIssues();
