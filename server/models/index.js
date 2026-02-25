const { sequelize } = require('./User'); // pulls configured instance
const User = require('./User');
const Connection = require('./Connection');
const Message = require('./Message');
const Group = require('./Group');
const GroupMember = require('./GroupMember');
const BlockList = require('./BlockList');
const MuteList = require('./MuteList');
const Otp = require('./Otp');
const CallHistory = require('./CallHistory');
const UsageSession = require('./UsageSession');

// User <-> Connection
User.hasMany(Connection, { foreignKey: 'requesterId', as: 'SentRequests' });
User.hasMany(Connection, { foreignKey: 'receiverId', as: 'ReceivedRequests' });

Connection.belongsTo(User, { foreignKey: 'requesterId', as: 'Requester' });
Connection.belongsTo(User, { foreignKey: 'receiverId', as: 'Receiver' });

// User <-> Message
User.hasMany(Message, { foreignKey: 'senderId', as: 'SentMessages' });
User.hasMany(Message, { foreignKey: 'receiverId', as: 'ReceivedMessages' });

Message.belongsTo(User, { foreignKey: 'senderId', as: 'Sender' });
Message.belongsTo(User, { foreignKey: 'receiverId', as: 'Receiver' });

// Group Associations
Group.belongsTo(User, { foreignKey: 'createdBy', as: 'Creator' });
User.hasMany(Group, { foreignKey: 'createdBy', as: 'CreatedGroups' });

Group.hasMany(GroupMember, { foreignKey: 'groupId', as: 'Members' });
GroupMember.belongsTo(Group, { foreignKey: 'groupId', as: 'Group' });

User.hasMany(GroupMember, { foreignKey: 'userId', as: 'GroupMemberships' });
GroupMember.belongsTo(User, { foreignKey: 'userId', as: 'User' });

Group.hasMany(Message, { foreignKey: 'groupId', as: 'Messages' });
Message.belongsTo(Group, { foreignKey: 'groupId', as: 'Group' });

// Call History
User.hasMany(CallHistory, { foreignKey: 'callerId', as: 'CallsMade' });
User.hasMany(CallHistory, { foreignKey: 'receiverId', as: 'CallsReceived' });
CallHistory.belongsTo(User, { foreignKey: 'callerId', as: 'Caller' });
CallHistory.belongsTo(User, { foreignKey: 'receiverId', as: 'Receiver' });

// Usage Sessions
User.hasMany(UsageSession, { foreignKey: 'userId', as: 'UsageSessions' });
UsageSession.belongsTo(User, { foreignKey: 'userId', as: 'User' });

module.exports = {
  sequelize,
  User,
  Connection,
  Message,
  Group,
  GroupMember,
  BlockList,
  MuteList,
  Otp,
  CallHistory,
  UsageSession
};
