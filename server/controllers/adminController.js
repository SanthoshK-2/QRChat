const { UsageSession, CallHistory, User, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.getUsageByUser = async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : null;
    const where = {};
    if (since) {
      where.startedAt = { [Op.gte]: since };
    }
    const rows = await UsageSession.findAll({
      attributes: [
        'userId',
        [sequelize.fn('SUM', sequelize.col('durationSeconds')), 'totalSeconds'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'sessions']
      ],
      where,
      group: ['userId'],
      include: [{ model: User, as: 'User', attributes: ['id', 'username', 'email'] }]
    });
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error fetching usage' });
  }
};

exports.getCallDurations = async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : null;
    const where = {};
    if (since) {
      where.createdAt = { [Op.gte]: since };
    }
    const rows = await CallHistory.findAll({
      attributes: [
        'callerId',
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN type='audio' THEN duration ELSE 0 END")), 'audioSeconds'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN type='video' THEN duration ELSE 0 END")), 'videoSeconds'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalCalls']
      ],
      where,
      group: ['callerId'],
      include: [{ model: User, as: 'Caller', attributes: ['id', 'username', 'email'] }]
    });
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error fetching call durations' });
  }
};

exports.getUserDetail = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId, { attributes: ['id', 'username', 'email'] });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const usage = await UsageSession.findAll({
      where: { userId },
      order: [['startedAt', 'DESC']],
      limit: 50
    });
    const calls = await CallHistory.findAll({
      where: {
        [Op.or]: [{ callerId: userId }, { receiverId: userId }]
      },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    res.json({ user, usage, calls });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error fetching user detail' });
  }
};
