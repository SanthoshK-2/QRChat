const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function fixDuplicateFKs() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '2006',
        database: process.env.DB_NAME || 'chate'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        // 1. Get all foreign keys for Messages table
        const [rows] = await connection.execute(`
            SELECT CONSTRAINT_NAME 
            FROM information_schema.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'messages' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        `, [dbConfig.database]);

        console.log(`Found ${rows.length} foreign keys on Messages table.`);

        // We want to keep only the ones that Sequelize usually uses or a single one for each column.
        // Usually Sequelize names them explicitly if configured, or auto-generates.
        // But here we have ibfk_1, ibfk_2...
        // Let's drop ALL of them. Sequelize will recreate the necessary ones on sync.
        // Wait, if we drop all, we might lose data? No, dropping FK constraints doesn't delete data.
        
        for (const row of rows) {
            const fkName = row.CONSTRAINT_NAME;
            console.log(`Dropping FK: ${fkName}`);
            try {
                await connection.execute(`ALTER TABLE Messages DROP FOREIGN KEY \`${fkName}\``);
            } catch (e) {
                console.error(`Failed to drop ${fkName}: ${e.message}`);
            }
        }

        // 2. Also check for duplicate indexes that might remain after dropping FKs
        // (MySQL often creates an index for each FK, and dropping FK might not always drop the index if it's shared)
        const [indexRows] = await connection.execute(`SHOW INDEX FROM Messages`);
        const indexes = new Set();
        indexRows.forEach(r => {
            if (r.Key_name !== 'PRIMARY') {
                indexes.add(r.Key_name);
            }
        });

        console.log(`Found ${indexes.size} indexes remaining.`);
        for (const idx of indexes) {
             console.log(`Dropping Index: ${idx}`);
             try {
                 await connection.execute(`DROP INDEX \`${idx}\` ON Messages`);
             } catch (e) {
                 // Ignore if it fails (e.g. if it's used by another constraint we missed, though we dropped all FKs)
                 console.log(`Note: ${e.message}`);
             }
        }

        console.log('Cleanup complete. Sequelize should recreate necessary constraints on restart.');
        await connection.end();

    } catch (error) {
        console.error('Error:', error);
    }
}

fixDuplicateFKs();
