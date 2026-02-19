const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CallHistory = sequelize.define('CallHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  callerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  receiverId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('audio', 'video'),
    defaultValue: 'audio'
  },
  status: {
    type: DataTypes.ENUM('missed', 'completed', 'rejected'),
    defaultValue: 'completed'
  },
  duration: {
    type: DataTypes.INTEGER, // in seconds
    defaultValue: 0
  },
  startedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  endedAt: {
    type: DataTypes.DATE
  }
});

module.exports = CallHistory;
