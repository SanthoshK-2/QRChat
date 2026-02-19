const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MuteList = sequelize.define('MuteList', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  mutedUserId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  muteExpiration: {
    type: DataTypes.DATE,
    allowNull: true,
  }
});

module.exports = MuteList;
