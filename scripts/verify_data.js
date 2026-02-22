const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../server/.env') });
const { User, Connection, Message, sequelize } = require('../server/models');
const { Op } = require('sequelize');

(async () => {
    try {
        await sequelize.authenticate();
        console.log('--- LOCAL DATABASE CHECK ---');
        
        const username = 'Kumar';
        const user = await User.findOne({ where: { username } });
        
        if (user) {
            console.log(`User found: ${user.username} (${user.id})`);
            
            const connections = await Connection.findAll({
                where: {
                    [Op.or]: [
                        { requesterId: user.id },
                        { receiverId: user.id }
                    ]
                }
            });
            
            console.log(`Connections for ${username}: ${connections.length}`);
            connections.forEach(c => {
                console.log(`- Connection ${c.id}: Status=${c.status}, Requester=${c.requesterId}, Receiver=${c.receiverId}`);
            });

            const messages = await Message.count({
                where: {
                    [Op.or]: [
                        { senderId: user.id },
                        { receiverId: user.id }
                    ]
                }
            });
            console.log(`Messages for ${username}: ${messages}`);

        } else {
            console.log(`User ${username} not found locally.`);
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit(0);
    }
})();