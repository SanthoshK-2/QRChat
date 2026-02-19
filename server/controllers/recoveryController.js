const { Message, User } = require('../models');
const nodemailer = require('nodemailer');
const { Op } = require('sequelize');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendBackup = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: req.user.id },
          { receiverId: req.user.id }
        ]
      },
      order: [['createdAt', 'ASC']]
    });
    const payload = {
      account: { id: user.id, username: user.username, email: user.email },
      messages: messages.map(m => ({
        id: m.id,
        senderId: m.senderId,
        receiverId: m.receiverId,
        type: m.type,
        content: m.content,
        fileName: m.fileName,
        fileUrl: m.fileUrl,
        createdAt: m.createdAt
      }))
    };
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Your QR Chat Backup',
      text: 'Attached is your account chat/audio/video backup.',
      attachments: [
        {
          filename: 'backup.json',
          content: JSON.stringify(payload, null, 2)
        }
      ]
    };
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Backup sent' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.sendRecovery = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'QR Chat Account Recovery',
      text: 'Use this email as reference. Contact support if needed.'
    };
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Recovery email sent' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
};
