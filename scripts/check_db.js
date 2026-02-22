require('dotenv').config({ path: 'server/.env' });
const { Sequelize } = require('sequelize');

async function checkDb() {
    console.log('Checking database connection...');
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`User: ${process.env.DB_USER}`);
    console.log(`Database: ${process.env.DB_NAME}`);

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
        console.log('Connection has been established successfully.');
        
        const [results] = await sequelize.query("SELECT COUNT(*) as count FROM Users");
        console.log(`User Count: ${results[0].count}`);
        
        const [users] = await sequelize.query("SELECT id, username, email FROM Users");
        console.log('Users:', users);
        
    } catch (error) {
        console.error('Unable to connect to the database:', error.message);
    } finally {
        await sequelize.close();
    }
}

checkDb();
