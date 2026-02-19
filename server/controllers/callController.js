const { CallHistory, User } = require('../models');
const { Op } = require('sequelize');

exports.saveCall = async (req, res) => {
    try {
        const { callerId, receiverId, type, status, duration } = req.body;
        const call = await CallHistory.create({
            callerId,
            receiverId,
            type,
            status,
            duration,
            endedAt: new Date()
        });
        res.status(201).json(call);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error saving call history' });
    }
};

exports.getCallHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const calls = await CallHistory.findAll({
            where: {
                [Op.or]: [
                    { callerId: userId },
                    { receiverId: userId }
                ]
            },
            include: [
                { model: User, as: 'Caller', attributes: ['id', 'username', 'profilePic'] },
                { model: User, as: 'Receiver', attributes: ['id', 'username', 'profilePic'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(calls);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching call history' });
    }
};
