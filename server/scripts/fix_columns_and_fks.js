const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function fixColumnsAndFKs() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '2006',
        database: process.env.DB_NAME || 'chate'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        // 1. Drop ALL Foreign Keys on Messages
        const [rows] = await connection.execute(`
            SELECT CONSTRAINT_NAME 
            FROM information_schema.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'messages' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        `, [dbConfig.database]);

        for (const row of rows) {
            const fkName = row.CONSTRAINT_NAME;
            console.log(`Dropping FK: ${fkName}`);
            try {
                await connection.execute(`ALTER TABLE Messages DROP FOREIGN KEY \`${fkName}\``);
            } catch (e) {
                console.error(`Failed to drop ${fkName}: ${e.message}`);
            }
        }

        // 2. Modify receiverId to be NULLable
        // We also need to ensure the type matches Users.id (CHAR(36) or VARCHAR(255))
        // Let's check Users.id type first
        const [userColumns] = await connection.execute(`SHOW COLUMNS FROM Users LIKE 'id'`);
        const idType = userColumns[0].Type;
        console.log(`Users.id type is: ${idType}`);

        console.log(`Modifying receiverId to ${idType} NULL...`);
        try {
            await connection.execute(`ALTER TABLE Messages MODIFY receiverId ${idType} NULL`);
            console.log('receiverId is now NULLable.');
        } catch (e) {
            console.error(`Failed to modify receiverId: ${e.message}`);
        }

         console.log(`Modifying groupId to ${idType} NULL...`);
        try {
            await connection.execute(`ALTER TABLE Messages MODIFY groupId ${idType} NULL`);
            console.log('groupId is now NULLable.');
        } catch (e) {
             // groupId might point to Groups table, check its type if needed, but assuming UUID same as User
            console.error(`Failed to modify groupId: ${e.message}`);
        }

        console.log('Fix complete.');
        await connection.end();

    } catch (error) {
        console.error('Error:', error);
    }
}

fixColumnsAndFKs();
