require('dotenv').config({ path: '../server/.env' });
const { Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');

async function verifyCredentials(identifier, password) {
    console.log('--- CREDENTIAL VERIFICATION TOOL ---');
    console.log(`Checking user: ${identifier}`);

    const sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
            host: process.env.DB_HOST,
            dialect: 'mysql',
            logging: false
        }
    );

    try {
        await sequelize.authenticate();
        
        // Find user by username or email
        const [users] = await sequelize.query(
            `SELECT * FROM Users WHERE username = '${identifier}' OR email = '${identifier}'`
        );

        if (users.length === 0) {
            console.log('❌ RESULT: User NOT FOUND in local database.');
            console.log('   Note: If you registered on the live site, ensure you ran "start_sync.bat" to pull the data locally.');
        } else {
            const user = users[0];
            console.log(`✅ RESULT: User FOUND.`);
            console.log(`   ID: ${user.id}`);
            console.log(`   Username: ${user.username}`);
            console.log(`   Email: ${user.email}`);
            
            // Verify Password
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                console.log('✅ PASSWORD: CORRECT match.');
            } else {
                console.log('❌ PASSWORD: INCORRECT.');
                console.log('   The stored hash does not match the provided password.');
                console.log('   Tip: Passwords are case-sensitive.');
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

// Check the credentials from the screenshot
verifyCredentials('santhoshkvkd222@gmail.com', 'vkdsanthosh2');
