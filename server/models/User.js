const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
          isEmail: true
      }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  profilePic: {
    type: DataTypes.TEXT, // Base64 or URL
    allowNull: true,
  },
  bio: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  mode: {
    type: DataTypes.ENUM('local', 'global'),
    defaultValue: 'local',
  },
  uniqueCode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  isOnline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  showOnlineStatus: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  lastSeen: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  resetPasswordOTP: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  hooks: {
    beforeValidate: (user) => {
      if (!user.uniqueCode) {
        user.uniqueCode = Math.floor(100000 + Math.random() * 900000).toString();
      }
    },
    beforeCreate: async (user) => {
      // FIX: Only hash if it's NOT already a hash
      if (user.password && !user.password.startsWith('$2b$')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      // FIX: Only hash if it's NOT already a hash
      if (user.changed('password') && !user.password.startsWith('$2b$')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

User.prototype.matchPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = User;
