const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let sequelize;

// --- CLOUD PERSISTENCE LOGIC ---
// Check if running on Render with a mounted persistent disk
const RENDER_DISK_PATH = '/var/data'; // Standard Render disk mount point
const PERSISTENT_DB_PATH = path.join(RENDER_DISK_PATH, 'chate_persistent.sqlite');

// Check if a valid DATABASE_URL is provided (e.g. Aiven MySQL, Clever Cloud, etc.)
// Exclude default placeholder if present
const isValidDbUrl = process.env.DATABASE_URL && 
                     !process.env.DATABASE_URL.includes('hostname:port') &&
                     !process.env.DATABASE_URL.includes('your-db-url');

if (isValidDbUrl) {
    let rawUrl = process.env.DATABASE_URL;
    // Standardize URL: handle mysqls:// and strip problematic query parameters like ssl-mode
    // which cause warnings or errors in newer mysql2 driver versions.
    let normalizedUrl = rawUrl.replace(/^mysqls:\/\//i, 'mysql://');
    
    // Clean up query parameters: Sequelize passes URL query params to the driver,
    // and mysql2 warns about 'ssl-mode'. We handle SSL explicitly in dialectOptions.
    try {
        const urlObj = new URL(normalizedUrl);
        // Explicitly remove any ssl-related query params that might trigger driver warnings
        const paramsToRemove = ['ssl-mode', 'sslmode', 'ssl'];
        paramsToRemove.forEach(p => urlObj.searchParams.delete(p));
        normalizedUrl = urlObj.toString();
    } catch (e) {
        // Fallback if URL parsing fails for some reason
        normalizedUrl = normalizedUrl.split('?')[0]; 
    }

    console.log('✅ Using CLOUD DATABASE (MySQL/PostgreSQL) from DATABASE_URL.');
    console.log('   Data will persist even if laptop is off.');
    sequelize = new Sequelize(normalizedUrl, {
        dialect: normalizedUrl.startsWith('postgres') ? 'postgres' : 'mysql',
        logging: false,
        dialectOptions: {
            // Only add SSL if it's NOT a localhost connection
            ...(normalizedUrl.includes('localhost') || normalizedUrl.includes('127.0.0.1') ? {} : {
                ssl: {
                    require: true,
                    rejectUnauthorized: false
                }
            })
        },
        pool: { max: 10, min: 2, acquire: 30000, idle: 10000 }
    });
} else if (fs.existsSync(RENDER_DISK_PATH)) {
    // If Render Persistent Disk is detected
    console.log('✅ RENDER PERSISTENT DISK DETECTED.');
    console.log(`   Using Persistent SQLite Database at: ${PERSISTENT_DB_PATH}`);
    console.log('   Data will persist even if laptop is off.');
    
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: PERSISTENT_DB_PATH,
        logging: false
    });
} else {
    // Fallback logic
    if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_HOST !== 'localhost') {
        console.log('Using Remote MySQL configuration from .env');
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
        console.warn('⚠️  NO CLOUD DATABASE CONFIGURED.');
        console.warn('   Using Ephemeral SQLite. Data will be lost on restart unless synced from laptop.');
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
        console.log(`✅ Database connection established successfully (${sequelize.getDialect()}).`);
    })
    .catch(err => {
        console.error('❌ Unable to connect to the database:', err);
        console.warn('⚠️  Falling back to Ephemeral SQLite due to connection failure.');
        
        // --- FALLBACK LOGIC ---
        // Save error for API diagnosis
        const connectionError = err.message;
        
        sequelize = new Sequelize({
            dialect: 'sqlite',
            storage: './database.sqlite',
            logging: false
        });
        
        // Attach error to the NEW instance so we can read it later
        sequelize.connectionError = connectionError;
        sequelize.isFallback = true;
    });

module.exports = sequelize;
