const sequelize = require('./config/database');
const { QueryTypes } = require('sequelize');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected');
    await sequelize.query("ALTER TABLE Messages ADD COLUMN status ENUM('sent', 'delivered', 'read') DEFAULT 'sent';", { type: QueryTypes.RAW });
    console.log('Migration successful');
  } catch (error) {
    if (error.original && error.original.code === 'ER_DUP_FIELDNAME') {
        console.log('Column already exists');
    } else {
        console.error('Migration failed:', error);
    }
  } finally {
    await sequelize.close();
  }
}

migrate();
