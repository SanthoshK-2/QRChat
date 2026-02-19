const mysql = require('mysql2/promise');

const commonPasswords = [
    '',
    'root',
    'password',
    '123456',
    '1234',
    '12345678',
    'admin',
    'mysql',
    'admin',
    'rootroot',
    'toor',
    'pass',
    'password123',
    '123',
    'user',
    'qrchat',
    'app'
];

async function findPassword() {
    console.log('Testing MySQL passwords for user "root"...');
    
    for (const password of commonPasswords) {
        try {
            console.log(`Testing password: "${password}"`);
            const connection = await mysql.createConnection({
                host: 'localhost',
                user: 'root',
                password: password
            });
            console.log(`\nSUCCESS! Found working password: "${password}"`);
            await connection.end();
            process.exit(0);
        } catch (error) {
            if (error.code === 'ER_ACCESS_DENIED_ERROR') {
                continue;
            } else {
                console.error('Other error:', error.message);
            }
        }
    }
    
    console.log('\nFailed to find password for "root". Trying user "admin"...');
    // Try admin user
     for (const password of commonPasswords) {
        try {
            console.log(`Testing admin password: "${password}"`);
            const connection = await mysql.createConnection({
                host: 'localhost',
                user: 'admin',
                password: password
            });
            console.log(`\nSUCCESS! Found working password for admin: "${password}"`);
            await connection.end();
            process.exit(0);
        } catch (error) {
            if (error.code === 'ER_ACCESS_DENIED_ERROR') {
                continue;
            }
        }
    }

    console.error('\nCould not find a working password in the common list.');
    process.exit(1);
}

findPassword();