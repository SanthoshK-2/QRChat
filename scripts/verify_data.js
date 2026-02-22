const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../server/.env') });
const { User, Connection, Message, sequelize } = require('../server/models');

(async () => {
    try {
        await sequelize.authenticate();
        console.log('--- LOCAL DATABASE COUNTS ---');
        console.log('Users:', await User.count());
        console.log('Connections:', await Connection.count());
        console.log('Messages:', await Message.count());
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit(0);
    }
})();