const { User, sequelize } = require('./models');

async function deleteUser() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    
    const count = await User.destroy({
      where: {
        username: 'santhosh'
      }
    });
    
    console.log(`Deleted ${count} users.`);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

deleteUser();
