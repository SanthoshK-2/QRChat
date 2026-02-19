const { CallHistory, User, sequelize } = require('../models');
const { Op } = require('sequelize');

// Hardcode for script execution reliability in this env
const DB_CONFIG = {
    username: 'root',
    password: '2006',
    database: 'chate',
    host: 'localhost',
    dialect: 'mysql'
};

// Manually configure sequelize if env vars failed
if (!process.env.DB_USER) {
    sequelize.connectionManager.config = { ...sequelize.connectionManager.config, ...DB_CONFIG };
    sequelize.options = { ...sequelize.options, ...DB_CONFIG };
    sequelize.config = { ...sequelize.config, ...DB_CONFIG };
}

async function seedCallHistory() {
    try {
        console.log('Starting seed...');
        
        // Find some users to link
        const users = await User.findAll({ limit: 2 });
        if (users.length < 2) {
            console.log('Not enough users to seed call history.');
            return;
        }

        const caller = users[0];
        const receiver = users[1];

        console.log(`Creating dummy call from ${caller.username} to ${receiver.username}`);

        await CallHistory.create({
            callerId: caller.id,
            receiverId: receiver.id,
            type: 'audio',
            status: 'completed',
            duration: 120, // 2 minutes
            startedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
            endedAt: new Date(Date.now() - 1000 * 60 * 58)
        });
        
        await CallHistory.create({
            callerId: receiver.id,
            receiverId: caller.id,
            type: 'video',
            status: 'missed',
            duration: 0,
            startedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
            endedAt: new Date(Date.now() - 1000 * 60 * 30)
        });

        console.log('Seed completed successfully.');
    } catch (e) {
        console.error('Seed failed:', e);
    } finally {
        // We don't close connection as it might be managed by sequelize instance
        // but for a script we can just exit
        process.exit(0);
    }
}

seedCallHistory();