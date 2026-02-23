const { Sequelize, DataTypes, Op } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../server/.env') });

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

const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, primaryKey: true },
    username: { type: DataTypes.STRING },
}, { timestamps: false });

const Connection = sequelize.define('Connection', {
    id: { type: DataTypes.UUID, primaryKey: true },
    requesterId: { type: DataTypes.UUID },
    receiverId: { type: DataTypes.UUID },
    status: { type: DataTypes.STRING },
}, { timestamps: false });

Connection.belongsTo(User, { as: 'Requester', foreignKey: 'requesterId' });
Connection.belongsTo(User, { as: 'Receiver', foreignKey: 'receiverId' });

async function checkConnections() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        const users = await User.findAll();
        console.log('--- USERS ---');
        users.forEach(u => console.log(`${u.username} (${u.id})`));

        const connections = await Connection.findAll({
            include: [
                { model: User, as: 'Requester' },
                { model: User, as: 'Receiver' }
            ]
        });

        console.log('\n--- CONNECTIONS ---');
        if (connections.length === 0) {
            console.log('No connections found in DB!');
        } else {
            connections.forEach(c => {
                const reqName = c.Requester ? c.Requester.username : 'Unknown';
                const recName = c.Receiver ? c.Receiver.username : 'Unknown';
                console.log(`${reqName} <-> ${recName} [${c.status}] (ID: ${c.id})`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkConnections();
