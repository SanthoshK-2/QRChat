const { Sequelize } = require('sequelize');
require('dotenv').config();

// Strictly enforce MySQL configuration
if (process.env.DB_DIALECT !== 'mysql') {
    console.warn("Warning: DB_DIALECT is not set to 'mysql'. Enforcing MySQL dialect.");
}

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false,
        pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
    }
);

// Verify connection immediately
sequelize.authenticate()
    .then(() => {
        console.log('MySQL Database connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the MySQL database:', err);
        process.exit(1); // Exit if we can't connect to MySQL, as it's mandatory
    });

module.exports = sequelize;
