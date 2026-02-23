const { User, Connection, Message, BlockList, MuteList } = require('../models');
const { Op } = require('sequelize');

// Block User
exports.blockUser = async (req, res) => {
    const { userId } = req.body;
    try {
        const exists = await BlockList.findOne({ where: { blockerId: req.user.id, blockedId: userId } });
        if (!exists) {
            await BlockList.create({ blockerId: req.user.id, blockedId: userId });
            
            // Notify the blocked user
            const io = req.app.get('io');
            if (io) {
                // We need to find the socketId of the blocked user to emit to them
                // But we can just emit to the user's room (userId) since we join it in index.js
                io.to(userId).emit('blocking_update', { 
                    type: 'block', 
                    blockerId: req.user.id,
                    blockedId: userId 
                });
            }
        }
        res.json({ message: 'User blocked' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Unblock User
exports.unblockUser = async (req, res) => {
    const { userId } = req.body;
    try {
        await BlockList.destroy({ where: { blockerId: req.user.id, blockedId: userId } });
        
        // Notify the unblocked user
        const io = req.app.get('io');
        if (io) {
            io.to(userId).emit('blocking_update', { 
                type: 'unblock', 
                blockerId: req.user.id,
                blockedId: userId 
            });
        }
        
        res.json({ message: 'User unblocked' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Mute User
exports.muteUser = async (req, res) => {
    const { userId, duration } = req.body;
    try {
        let muteExpiration = null;
        if (duration) {
            const now = new Date();
            if (duration === '1_hour') muteExpiration = new Date(now.getTime() + 60 * 60 * 1000);
            else if (duration === '1_day') muteExpiration = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            else if (duration === '1_week') muteExpiration = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            else if (duration === '1_month') muteExpiration = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        }

        const exists = await MuteList.findOne({ where: { userId: req.user.id, mutedUserId: userId } });
        if (!exists) {
            await MuteList.create({ userId: req.user.id, mutedUserId: userId, muteExpiration });
        } else {
            // Update expiration if already muted
            exists.muteExpiration = muteExpiration;
            await exists.save();
        }
        res.json({ message: 'User muted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Unmute User
exports.unmuteUser = async (req, res) => {
    const { userId } = req.body;
    try {
        await MuteList.destroy({ where: { userId: req.user.id, mutedUserId: userId } });
        res.json({ message: 'User unmuted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get Block/Mute Status
exports.getConnectionStatus = async (req, res) => {
    const { userId } = req.params;
    try {
        const isBlocked = await BlockList.findOne({ where: { blockerId: req.user.id, blockedId: userId } });
        const isBlockedByPartner = await BlockList.findOne({ where: { blockerId: userId, blockedId: req.user.id } });
        const isMuted = await MuteList.findOne({ where: { userId: req.user.id, mutedUserId: userId } });
        res.json({
            isBlocked: !!isBlocked,
            isBlockedByPartner: !!isBlockedByPartner,
            isMuted: !!isMuted
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Send Request
exports.sendRequest = async (req, res) => {
    const { targetCode, targetId } = req.body; // Unique code OR ID of the receiver
    const senderId = req.user.id;

    try {
        let receiver;
        if (targetCode) {
            receiver = await User.findOne({ where: { uniqueCode: targetCode } });
        } else if (targetId) {
            receiver = await User.findByPk(targetId);
        }

        if (!receiver) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (receiver.id === senderId) {
             return res.status(400).json({ message: 'Cannot connect with yourself' });
        }

        // Check if connection already exists
        const existingConnection = await Connection.findOne({
            where: {
                [Op.or]: [
                    { requesterId: senderId, receiverId: receiver.id },
                    { requesterId: receiver.id, receiverId: senderId }
                ]
            }
        });

        if (existingConnection) {
            if (existingConnection.status === 'pending') {
                 return res.status(400).json({ message: 'Request already pending' });
            }
             return res.status(400).json({ message: 'Already connected' });
        }

        const connection = await Connection.create({
            requesterId: senderId,
            receiverId: receiver.id,
            status: 'pending'
        });

        res.status(201).json(connection);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Accept Request
exports.acceptRequest = async (req, res) => {
    const { connectionId, status } = req.body; // status can be 'accepted' or 'rejected'
    
    try {
        const connection = await Connection.findByPk(connectionId);
        if (!connection) return res.status(404).json({ message: 'Connection not found' });
        
        if (connection.receiverId !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (status === 'rejected') {
            await connection.destroy();
            return res.json({ message: 'Request rejected' });
        }

        connection.status = 'accepted';
        await connection.save();

        res.json(connection);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get Connections
exports.getConnections = async (req, res) => {
    try {
        // Fetch blocked users (Wrap in try-catch to be robust against missing table)
        let blockedUserIds = new Set();
        try {
            const blocks = await BlockList.findAll({
                where: {
                    [Op.or]: [
                        { blockerId: req.user.id },
                        { blockedId: req.user.id }
                    ]
                }
            });
            blocks.forEach(b => {
                if (b.blockerId === req.user.id) blockedUserIds.add(b.blockedId);
                else blockedUserIds.add(b.blockerId);
            });
        } catch (blockError) {
            console.error('Error fetching block list (ignoring):', blockError.message);
        }

        const connections = await Connection.findAll({
            where: {
                [Op.or]: [
                    { requesterId: req.user.id },
                    { receiverId: req.user.id }
                ]
                // TEMPORARY DEBUG: Removed status: 'accepted' filter to see all connections
                // status: 'accepted' 
            },
            include: [
                { model: User, as: 'Requester', attributes: ['id', 'username', 'profilePic', 'uniqueCode', 'isOnline', 'lastSeen'] },
                { model: User, as: 'Receiver', attributes: ['id', 'username', 'profilePic', 'uniqueCode', 'isOnline', 'lastSeen'] }
            ]
        });
        
        const formatted = await Promise.all(connections.map(async c => {
            const isRequester = c.requesterId === req.user.id;
            const otherUser = isRequester ? c.Receiver : c.Requester;
            
            // Safety check if otherUser is null (should not happen if referential integrity holds)
            if (!otherUser) return null;

            // Mask Online Status if blocked
            let userObj = otherUser.toJSON();
            if (blockedUserIds.has(otherUser.id)) {
                userObj.isOnline = false;
                userObj.lastSeen = null; 
            }

            // Fetch last message
            let lastMessage = null;
            try {
                lastMessage = await Message.findOne({
                    where: {
                        [Op.or]: [
                            { senderId: req.user.id, receiverId: otherUser.id },
                            { senderId: otherUser.id, receiverId: req.user.id }
                        ],
                        deletedAt: null
                    },
                    order: [['createdAt', 'DESC']],
                    limit: 1
                });
            } catch (err) {
                console.error('Error fetching last message:', err);
            }

            // Count unread messages
            let unreadCount = 0;
            try {
                unreadCount = await Message.count({
                    where: {
                        senderId: otherUser.id,
                        receiverId: req.user.id,
                        status: { [Op.ne]: 'read' }
                    }
                });
            } catch (err) {
                console.error('Error counting unread messages:', err);
            }

            return {
                connectionId: c.id,
                user: userObj,
                status: c.status, // Return status for debug
                lastMessage: lastMessage ? lastMessage.content : null,
                lastMessageAt: lastMessage ? lastMessage.createdAt : null,
                lastMessageType: lastMessage ? lastMessage.type : null,
                unreadCount: unreadCount
            };
        }));
        
        // Filter out nulls and sort
        const validFormatted = formatted.filter(item => item !== null);

        // Sort by last message date (descending)
        validFormatted.sort((a, b) => {
            if (!a.lastMessageAt) return 1;
            if (!b.lastMessageAt) return -1;
            return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
        });

        res.json(validFormatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get Pending Requests
exports.getPendingRequests = async (req, res) => {
    try {
        const requests = await Connection.findAll({
            where: {
                receiverId: req.user.id,
                status: 'pending'
            },
            include: [
                { model: User, as: 'Requester', attributes: ['id', 'username', 'profilePic', 'uniqueCode'] }
            ]
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Connect via Unique Code (Auto-Accept for Global, Request for Local)
exports.connectByCode = async (req, res) => {
    const { uniqueCode } = req.body;
    const senderId = req.user.id;

    try {
        const targetUser = await User.findOne({ where: { uniqueCode } });
        if (!targetUser) return res.status(404).json({ message: 'User not found' });
        if (targetUser.id === senderId) return res.status(400).json({ message: 'Cannot connect with yourself' });

        // Check if connection exists
        let connection = await Connection.findOne({
            where: {
                [Op.or]: [
                    { requesterId: senderId, receiverId: targetUser.id },
                    { requesterId: targetUser.id, receiverId: senderId }
                ]
            }
        });

        if (connection) {
            if (connection.status === 'accepted') {
                 // Already connected
            } else if (connection.status === 'pending') {
                 // Already pending
            } else {
                 // Should not happen with current logic, but handle rejected if we allow re-request
                 connection.status = 'pending'; // Reset to pending if rejected previously? Or just error.
                 // For now, let's assume we can re-request
            }
        } else {
            // Check target user mode
            // Global mode: Auto-accept
            // Local mode: Manual accept (Pending)
            const status = targetUser.mode === 'global' ? 'accepted' : 'pending';
            
            connection = await Connection.create({
                requesterId: senderId,
                receiverId: targetUser.id,
                status: status
            });
        }
        
        if (connection.status === 'accepted') {
            res.json({
                id: targetUser.id,
                username: targetUser.username,
                profilePic: targetUser.profilePic,
                status: 'accepted'
            });
        } else {
             // For Local mode (pending), we notify the user
             res.json({
                id: targetUser.id,
                username: targetUser.username,
                profilePic: targetUser.profilePic,
                status: 'pending',
                message: 'Connection request sent. Waiting for approval.'
            });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
