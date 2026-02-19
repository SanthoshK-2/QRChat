const mysql = require('mysql2/promise');

const passwords = [
    '',
    'root',
    'password',
    'admin',
    '123456',
    '12345678',
    'mysql',
    'qrchat'
];

async function testConnection() {
    console.log('Testing MySQL passwords for user "root"...');
    
    for (const password of passwords) {
        try {
            console.log(`Testing password: "${password}"`);
            const connection = await mysql.createConnection({
                host: 'localhost',
                user: 'root',
                password: password
            });
            console.log(`SUCCESS! Password is: "${password}"`);
            await connection.end();
            process.exit(0);
        } catch (error) {
            if (error.code === 'ER_ACCESS_DENIED_ERROR') {
                console.log(`Failed with password: "${password}"`);
            } else {
                console.log(`Other error with password "${password}": ${error.message}`);
            }
        }
    }
    
    console.log('All passwords failed.');
    process.exit(1);
}

testConnection();