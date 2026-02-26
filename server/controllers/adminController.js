const { UsageSession, CallHistory, User, sequelize } = require('../models');
const { Op } = require('sequelize');

function rangeToWindow(range, startStr, endStr) {
  const now = new Date();
  let start = null;
  if (range === 'day') start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  else if (range === 'week') start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  else if (range === 'month') start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  else if (range === 'custom' && startStr && endStr) {
    start = new Date(startStr);
    const end = new Date(endStr);
    return { start, end };
  }
  return { start, end: now };
}

exports.getUsageByUser = async (req, res) => {
  try {
    const { range, start: startStr, end: endStr } = req.query;
    const { start, end } = rangeToWindow(range, startStr, endStr);
    const where = {};
    if (start) where.startedAt = { [Op.gte]: start };
    if (end) where.startedAt = { ...(where.startedAt || {}), [Op.lte]: end };
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
    const { range, start: startStr, end: endStr } = req.query;
    const { start, end } = rangeToWindow(range, startStr, endStr);
    const where = {};
    if (start) where.createdAt = { [Op.gte]: start };
    if (end) where.createdAt = { ...(where.createdAt || {}), [Op.lte]: end };
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

function toCsv(rows, headers, mapper) {
  const head = headers.join(',');
  const body = rows.map(mapper).join('\n');
  return head + '\n' + body + '\n';
}

exports.exportUsageCsv = async (req, res) => {
  try {
    const { range, start: startStr, end: endStr } = req.query;
    req.query.range = range; req.query.start = startStr; req.query.end = endStr;
    const { start, end } = rangeToWindow(range, startStr, endStr);
    const where = {};
    if (start) where.startedAt = { [Op.gte]: start };
    if (end) where.startedAt = { ...(where.startedAt || {}), [Op.lte]: end };
    const rows = await UsageSession.findAll({
      attributes: [
        'userId',
        [sequelize.fn('SUM', sequelize.col('durationSeconds')), 'totalSeconds'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'sessions']
      ],
      where,
      group: ['userId'],
      include: [{ model: User, as: 'User', attributes: ['username', 'email'] }]
    });
    const csv = toCsv(
      rows,
      ['username','email','total_seconds','sessions'],
      r => {
        const sec = r.get('totalSeconds') || 0;
        const s = r.get('sessions') || 0;
        const u = r.User || {};
        return [u.username, u.email, sec, s].join(',');
      }
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=\"usage.csv\"');
    res.send(csv);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Export failed' });
  }
};

exports.exportCallsCsv = async (req, res) => {
  try {
    const { range, start: startStr, end: endStr } = req.query;
    const { start, end } = rangeToWindow(range, startStr, endStr);
    const where = {};
    if (start) where.createdAt = { [Op.gte]: start };
    if (end) where.createdAt = { ...(where.createdAt || {}), [Op.lte]: end };
    const rows = await CallHistory.findAll({
      attributes: [
        'callerId',
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN type='audio' THEN duration ELSE 0 END")), 'audioSeconds'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN type='video' THEN duration ELSE 0 END")), 'videoSeconds'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalCalls']
      ],
      where,
      group: ['callerId'],
      include: [{ model: User, as: 'Caller', attributes: ['username', 'email'] }]
    });
    const csv = toCsv(
      rows,
      ['username','email','audio_seconds','video_seconds','total_calls'],
      r => {
        const a = r.get('audioSeconds') || 0;
        const v = r.get('videoSeconds') || 0;
        const t = r.get('totalCalls') || 0;
        const c = r.Caller || {};
        return [c.username, c.email, a, v, t].join(',');
      }
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="calls.csv"');
    res.send(csv);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Export failed' });
  }
};

exports.getOnline = async (req, res) => {
  try {
    const count = await User.count({ where: { isOnline: true } });
    res.json({ online: count });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error fetching online count' });
  }
};
