const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  receiverId: {
    type: DataTypes.UUID,
    allowNull: true, // Nullable for group messages
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: true, // Nullable for direct messages
  },
  content: {
    type: DataTypes.TEXT, // Encrypted content
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM('text', 'image', 'file', 'audio', 'video'),
    defaultValue: 'text',
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fileUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  status: {
    type: DataTypes.ENUM('sent', 'delivered', 'read'),
    defaultValue: 'sent',
  },
  isEdited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  }
});

module.exports = Message;
