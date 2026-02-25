const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UsageSession = sequelize.define('UsageSession', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  startedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  durationSeconds: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

module.exports = UsageSession;
