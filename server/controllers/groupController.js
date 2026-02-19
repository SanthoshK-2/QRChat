const { Group, GroupMember, User, Message } = require('../models');
const { Op } = require('sequelize');

exports.createGroup = async (req, res) => {
    const { name, description, memberIds } = req.body; // memberIds is array of userIds
    const creatorId = req.user.id;

    try {
        const group = await Group.create({
            name,
            description,
            createdBy: creatorId
        });

        // Add creator as admin
        await GroupMember.create({
            groupId: group.id,
            userId: creatorId,
            role: 'admin'
        });

        // Add other members
        if (memberIds && memberIds.length > 0) {
            const members = memberIds.map(userId => ({
                groupId: group.id,
                userId,
                role: 'member'
            }));
            await GroupMember.bulkCreate(members);
        }

        // Fetch full group details
        const fullGroup = await Group.findByPk(group.id, {
            include: [
                { model: GroupMember, as: 'Members', include: [{ model: User, as: 'User', attributes: ['id', 'username', 'profilePic'] }] }
            ]
        });

        res.status(201).json(fullGroup);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getUserGroups = async (req, res) => {
    try {
        const memberships = await GroupMember.findAll({
            where: { userId: req.user.id },
            include: [{ 
                model: Group, 
                as: 'Group',
                include: [
                    { model: GroupMember, as: 'Members', include: [{ model: User, as: 'User', attributes: ['id', 'username', 'profilePic'] }] }
                ]
            }]
        });

        const groups = memberships.map(m => m.Group);
        res.json(groups);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateGroup = async (req, res) => {
    const { groupId } = req.params;
    const { name, description, profilePic } = req.body;
    const userId = req.user.id;

    try {
        const member = await GroupMember.findOne({ where: { groupId, userId } });
        if (!member) return res.status(403).json({ message: 'Not a member' });

        const group = await Group.findByPk(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        // Admin only for Name/ProfilePic? User said: "admin can allow the other user for customize the description... otherwise admin only... can edit Group Name and Group profile picture"
        // Let's implement strict rules based on request.
        // "admin can allow other user for customize description" -> implied permission setting. For now, assume Admin only for criticals.
        
        if (member.role !== 'admin') {
             // If simple member, check if allowed. For now, restrict Name/Pic to Admin.
             if (name || profilePic) {
                 return res.status(403).json({ message: 'Only admin can change Name or Profile Picture' });
             }
        }

        if (name) group.name = name;
        if (description) group.description = description;
        if (profilePic) group.profilePic = profilePic;

        await group.save();
        res.json(group);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.addMembers = async (req, res) => {
    const { groupId } = req.params;
    const { userIds } = req.body;
    const userId = req.user.id;

    try {
        const requester = await GroupMember.findOne({ where: { groupId, userId } });
        if (!requester || requester.role !== 'admin') {
            return res.status(403).json({ message: 'Only admin can add members' });
        }

        const newMembers = userIds.map(uid => ({
            groupId,
            userId: uid,
            role: 'member'
        }));

        await GroupMember.bulkCreate(newMembers, { ignoreDuplicates: true });
        
        // Fetch updated members
        const members = await GroupMember.findAll({
            where: { groupId },
            include: [{ model: User, as: 'User', attributes: ['id', 'username', 'profilePic'] }]
        });

        res.json(members);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
