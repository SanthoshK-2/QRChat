const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('hostname:port')) {
    console.log('Using DATABASE_URL from environment.');
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'mysql',
        logging: false,
        pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
    });
} else {
    if (process.env.DATABASE_URL) {
        console.warn('Ignoring invalid DATABASE_URL placeholder:', process.env.DATABASE_URL);
    }
    
    if (process.env.DB_HOST && process.env.DB_USER) {
        console.log('Using MySQL configuration from .env');
        sequelize = new Sequelize(
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
    } else {
        console.log('No MySQL configuration found. Falling back to SQLite (Zero-Config Mode).');
        sequelize = new Sequelize({
            dialect: 'sqlite',
            storage: './database.sqlite',
            logging: false
        });
    }
}

// Verify connection immediately
sequelize.authenticate()
    .then(() => {
        console.log(`Database connection has been established successfully (${sequelize.getDialect()}).`);
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
        console.warn('Falling back to SQLite due to connection failure.');
        // Emergency Fallback: If MySQL fails, switch to SQLite in memory to keep server alive
        sequelize = new Sequelize({
            dialect: 'sqlite',
            storage: './database.sqlite',
            logging: false
        });
    });

module.exports = sequelize;
