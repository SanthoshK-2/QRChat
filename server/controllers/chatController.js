const { Message, User } = require('../models');
const { Op } = require('sequelize');

exports.getMessages = async (req, res) => {
    const { otherUserId } = req.params;
    
    try {
        const messages = await Message.findAll({
            where: {
                [Op.or]: [
                    { senderId: req.user.id, receiverId: otherUserId },
                    { senderId: otherUserId, receiverId: req.user.id }
                ],
                deletedAt: null
            },
            include: [{ model: User, as: 'Sender', attributes: ['id', 'username', 'profilePic'] }],
            order: [['createdAt', 'ASC']]
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getGroupMessages = async (req, res) => {
    const { groupId } = req.params;
    
    try {
        const messages = await Message.findAll({
            where: { groupId, deletedAt: null },
            include: [{ model: User, as: 'Sender', attributes: ['id', 'username', 'profilePic'] }],
            order: [['createdAt', 'ASC']]
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.editMessage = async (req, res) => {
    const { messageId } = req.params;
    const { content, type, fileName, fileUrl } = req.body;
    
    try {
        const message = await Message.findByPk(messageId);
        if (!message) return res.status(404).json({ message: 'Message not found' });
        
        if (message.senderId !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        
        // Check 5 minute rule
        const fiveMinutes = 5 * 60 * 1000;
        if (new Date() - new Date(message.createdAt) > fiveMinutes) {
             return res.status(400).json({ message: 'Edit time expired (5 mins)' });
        }
        
        if (typeof content === 'string') {
            message.content = content;
        }
        if (type) {
            message.type = type;
        }
        if (fileName) {
            message.fileName = fileName;
        }
        if (fileUrl) {
            message.fileUrl = fileUrl;
        }
        message.isEdited = true;
        await message.save();
        
        res.json(message);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteMessage = async (req, res) => {
    const { messageId } = req.params;
    
    try {
        const message = await Message.findByPk(messageId);
        if (!message) return res.status(404).json({ message: 'Message not found' });
        
        if (message.senderId !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const fiveMinutes = 5 * 60 * 1000;
        if (new Date() - new Date(message.createdAt) > fiveMinutes) {
             return res.status(400).json({ message: 'Delete time expired (5 mins)' });
        }
        
        message.deletedAt = new Date();
        await message.save();
        
        res.json({ message: 'Message deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
        fileName: req.file.originalname,
        fileUrl: fileUrl,
        type: req.file.mimetype.startsWith('image') ? 'image' : (req.file.mimetype.startsWith('audio') ? 'audio' : (req.file.mimetype.startsWith('video') ? 'video' : 'file'))
    });
};
