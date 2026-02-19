const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Group = sequelize.define('Group', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  profilePic: {
    type: DataTypes.TEXT, // Base64 or URL
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
  }
});

module.exports = Group;
