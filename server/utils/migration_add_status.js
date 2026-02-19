const sequelize = require('../config/database');

async function addColumn() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');
        
        // Check if column exists
        const [results] = await sequelize.query("SHOW COLUMNS FROM Users LIKE 'showOnlineStatus'");
        if (results.length === 0) {
            console.log('Adding showOnlineStatus column...');
            await sequelize.query("ALTER TABLE Users ADD COLUMN showOnlineStatus BOOLEAN DEFAULT true;");
            console.log('Column added successfully.');
        } else {
            console.log('Column showOnlineStatus already exists.');
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

addColumn();