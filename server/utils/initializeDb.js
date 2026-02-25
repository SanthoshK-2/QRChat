const mysql = require('mysql2/promise');
const sequelize = require('../config/database');
const { User } = require('../models');
const fs = require('fs');
const path = require('path');

// Helper to clean up excessive indexes causing "Too many keys specified"
const cleanupExcessiveIndexes = async () => {
    try {
        const queryInterface = sequelize.getQueryInterface();
        const tables = await queryInterface.showAllTables();
        
        for (const table of tables) {
            // Get all indexes for the table
            const [indexes] = await sequelize.query(`SHOW INDEX FROM \`${table}\``);
            
            // Group by column name to find duplicates
            const indexGroups = {};
            indexes.forEach(idx => {
                const key = idx.Column_name;
                if (!indexGroups[key]) indexGroups[key] = [];
                indexGroups[key].push(idx.Key_name);
            });

            // Drop duplicate indexes (keep the first one, drop others)
            for (const column in indexGroups) {
                const keyNames = indexGroups[column];
                if (keyNames.length > 1) {
                    console.log(`Cleaning up duplicate indexes on ${table}.${column}: ${keyNames.join(', ')}`);
                    // Keep the first one (usually the oldest or simplest name), drop the rest
                    // Skip 'PRIMARY'
                    for (let i = 1; i < keyNames.length; i++) {
                        const keyName = keyNames[i];
                        if (keyName === 'PRIMARY') continue;
                        try {
                            await sequelize.query(`DROP INDEX \`${keyName}\` ON \`${table}\``);
                            console.log(`Dropped index: ${keyName}`);
                        } catch (err) {
                            console.error(`Failed to drop index ${keyName}:`, err.message);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.warn('Index cleanup failed (non-fatal):', error.message);
    }
};

const initializeDb = async () => {
    try {
        // If DATABASE_URL is provided, skip manual database creation and rely on the connection string
        if (process.env.DATABASE_URL) {
            console.log('Using DATABASE_URL environment variable. Skipping manual database creation check.');
        } else if (sequelize.getDialect() === 'mysql') {
            // Ensure MySQL Database exists (Local/Manual config)
            const connection = await mysql.createConnection({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
            });
            await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
            await connection.end();
        }

        await sequelize.authenticate();
        console.log(`Database connected successfully (${sequelize.getDialect()})`);
        
        // Create uploads directory if not exists
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir);
        }
        
        // PRE-FIX: Clean up indexes before syncing to prevent "Too many keys" error
        if (sequelize.getDialect() === 'mysql') {
            await cleanupExcessiveIndexes();
        }

        // Sync models
        await sequelize.sync({ alter: true }); 
        console.log('Models synchronized');

        // Report User Count
        const userCount = await User.count();
        console.log(`\n--- DATABASE STATUS ---`);
        console.log(`Current User Count: ${userCount}`);
        if (userCount > 0) {
            console.log('Users are successfully stored in the database.');
        } else {
            console.log('Database is empty.');
        }
        
        // Auto-seed default user if not exists (Fixes "Invalid credentials" on fresh deploy)
        try {
            // Check if the specific admin/owner user exists
            const adminUser = await User.findOne({ 
                where: { email: 'santhoshkvkd222@gmail.com' } 
            });

            if (!adminUser) {
                console.log('Admin user missing (likely due to fresh deploy). Restoring...');
                
                await User.create({
                    id: '2f5c62ed-4fbc-40db-b34b-1ede753c571c', // FIX: Keep original ID
                    username: 'Santhosh@2006',
                    email: 'santhoshkvkd222@gmail.com',
                    password: 'vkdsanthosh2', // Will be hashed automatically
                    bio: 'God Bless yoU',
                    mode: 'global',
                    showOnlineStatus: true,
                    uniqueCode: '123456',
                    profilePic: '/uploads/1770291485365.jpeg',
                    isAdmin: true
                });
                console.log('✅ RESTORED USER: santhosh / santhoshkvkd222@gmail.com');
            } else {
                // Ensure isAdmin is true without overwriting other fields
                let changed = false;
                if (!adminUser.isAdmin) {
                    adminUser.isAdmin = true;
                    changed = true;
                }
                if (adminUser.username !== 'Santhosh@2006') {
                    adminUser.username = 'Santhosh@2006';
                    changed = true;
                }
                if (changed) {
                    await adminUser.save();
                    console.log('✅ Updated existing admin user (isAdmin/username)');
                } else {
                    console.log('Admin user already exists. Skipping auto-seed to prevent password overwrite.');
                }                
            }
        } catch (seedError) {
            console.error('Seeding check failed:', seedError.message);
        }
        
    } catch (error) {
        console.error('Database connection/sync failed:', error.message);
        console.warn('CRITICAL WARNING: Database initialization failed. Check your configuration.');
        // Allow process to continue even if DB fails, to show logs
        // process.exit(1); 
    }
};

module.exports = initializeDb;
