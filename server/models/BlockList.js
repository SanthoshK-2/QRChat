const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BlockList = sequelize.define('BlockList', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  blockerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  blockedId: {
    type: DataTypes.UUID,
    allowNull: false,
  }
});

module.exports = BlockList;
