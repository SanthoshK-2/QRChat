const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Connection = sequelize.define('Connection', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  requesterId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  receiverId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
    defaultValue: 'pending',
  }
});

module.exports = Connection;
