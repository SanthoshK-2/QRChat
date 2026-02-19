const { User, sequelize } = require('./models');
const { Op } = require('sequelize');

async function deleteDebugUsers() {
  try {
    await sequelize.authenticate();
    const count = await User.destroy({
      where: {
        username: {
            [Op.like]: 'debug%'
        }
      }
    });
    console.log(`Deleted ${count} debug users.`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

deleteDebugUsers();
