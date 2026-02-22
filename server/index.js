const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const sequelize = require('./config/database');
const initializeDb = require('./utils/initializeDb');
const { User, Message, Group, GroupMember, BlockList } = require('./models');
const { Op } = require('sequelize');

const authRoutes = require('./routes/authRoutes');
const connectionRoutes = require('./routes/connectionRoutes');
const chatRoutes = require('./routes/chatRoutes');
const groupRoutes = require('./routes/groupRoutes');
const recoveryRoutes = require('./routes/recoveryRoutes');
const callRoutes = require('./routes/callRoutes');

const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: "*",
    methods: ["GET", "POST"]
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check Route
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        uptime: process.uptime(),
        paths: {
            cwd: process.cwd(),
            __dirname: __dirname,
            finalBuildPath: finalBuildPath,
            exists: finalBuildPath ? fs.existsSync(finalBuildPath) : false
        }
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/recovery', recoveryRoutes);
app.use('/api/calls', callRoutes);

const fs = require('fs');

// Extensive path resolution strategy
// We are on Render, so paths might be weird. Let's look everywhere.
// /opt/render/project/src is likely the root
const localPublicPath = path.join(__dirname, 'public'); // Standard Express Pattern

console.log('--- PATH DEBUG START ---');
console.log('__dirname:', __dirname);
console.log('localPublicPath:', localPublicPath, 'Exists:', fs.existsSync(localPublicPath));
if (fs.existsSync(localPublicPath)) {
    try {
        console.log('Server Public Contents:', fs.readdirSync(localPublicPath));
    } catch (e) { console.error(e); }
}
console.log('--- PATH DEBUG END ---');

let finalBuildPath = null;

// Priority 1: Standard server/public (The new build strategy)
if (fs.existsSync(path.join(localPublicPath, 'index.html'))) {
    finalBuildPath = localPublicPath;
}
// Priority 2: Fallback to client/dist (Direct access)
else if (fs.existsSync(path.join(__dirname, '../client/dist/index.html'))) {
    finalBuildPath = path.join(__dirname, '../client/dist');
}

if (!finalBuildPath) {
    console.error('CRITICAL: Could not find index.html in any expected location.');
    
    // Recursive search for index.html to find where it is hiding
    let foundPath = null;
    try {
        const findFile = (dir) => {
            if (foundPath) return;
            const files = fs.readdirSync(dir);
            for (const file of files) {
                if (file === 'node_modules' || file === '.git') continue;
                const fullPath = path.join(dir, file);
                try {
                    const stat = fs.statSync(fullPath);
                    if (stat.isDirectory()) {
                        findFile(fullPath);
                    } else if (file === 'index.html') {
                        foundPath = dir; // Found the directory containing index.html
                        console.log('FOUND index.html at:', foundPath);
                        return;
                    }
                } catch (e) {}
            }
        };
        findFile(path.join(__dirname, '..')); // Search from root
    } catch (e) { console.error('Search failed:', e); }

    if (foundPath) {
        finalBuildPath = foundPath;
        console.log('Recovered using recursive search:', finalBuildPath);
    } else {
        // Absolute Hail Mary
        finalBuildPath = path.join(__dirname, '../client/dist');
    }
} else {
    console.log('SUCCESS: Serving static files from:', finalBuildPath);
}

app.use(express.static(finalBuildPath, {
    setHeaders: (res, path) => {
        if (path.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

app.use((req, res) => {
    // Only handle GET requests for HTML/SPA
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        const indexFile = path.join(finalBuildPath, 'index.html');
        if (fs.existsSync(indexFile)) {
            res.sendFile(indexFile);
        } else {
            console.error('Frontend build not found at:', finalBuildPath);
            // List contents of final path for debug
            let contents = 'Cannot read directory';
            try { contents = JSON.stringify(fs.readdirSync(finalBuildPath)); } catch(e) {}
            
            res.status(404).send(`
                <div style="font-family: sans-serif; padding: 20px;">
                    <h1>404 - Frontend Not Found</h1>
                    <p>The server is running, but the React frontend build is missing.</p>
                    <p><strong>Debug Info:</strong></p>
                    <ul>
                        <li>Final Path Checked: ${finalBuildPath}</li>
                        <li>Directory Contents: ${contents}</li>
                        <li>Server Dir: ${__dirname}</li>
                    </ul>
                </div>
            `);
        }
    } else {
        // API 404
        res.status(404).json({ message: 'API Route not found' });
    }
});

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

app.set('io', io);

const onlineUsers = new Map(); 

const broadcastStatus = async (userId, isOnline) => {
    try {
        const blocks = await BlockList.findAll({
            where: {
                [Op.or]: [
                    { blockerId: userId },
                    { blockedId: userId }
                ]
            }
        });
        
        const blockedUserIds = new Set();
        blocks.forEach(b => {
            if (b.blockerId === userId) blockedUserIds.add(b.blockedId);
            else blockedUserIds.add(b.blockerId);
        });

        for (const [targetUserId, targetSocketId] of onlineUsers.entries()) {
            // Don't send status to self (optional, but safe)
            if (targetUserId === userId) continue;

            if (!blockedUserIds.has(targetUserId)) {
                io.to(targetSocketId).emit('user_status', { userId, isOnline });
            }
        }
    } catch (e) {
        console.error('Broadcast Error:', e);
    }
};

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on('join_room', async (userId) => {
    if (!userId) return;
    socket.join(userId); 
    onlineUsers.set(userId, socket.id);
    try {
        const user = await User.findByPk(userId);
        if (user) {
            await user.update({ isOnline: true, lastSeen: new Date(), socketId: socket.id });
            if (user.showOnlineStatus) {
                // Selective broadcast
                await broadcastStatus(userId, true);
            }

            // Sync: Deliver all pending messages for this user
            const pendingMessages = await Message.findAll({
                where: {
                    receiverId: userId,
                    status: 'sent'
                }
            });

            if (pendingMessages.length > 0) {
                await Message.update({ status: 'delivered' }, {
                    where: {
                        receiverId: userId,
                        status: 'sent'
                    }
                });

                // Notify senders that messages are delivered
                pendingMessages.forEach(msg => {
                    io.to(msg.senderId).emit('message_status_update', { messageId: msg.id, status: 'delivered' });
                });
            }
        }
    } catch (e) {
        console.error(e);
    }
  });

  socket.on('join_group', (groupId) => {
      socket.join(groupId);
      console.log(`User ${socket.id} joined group ${groupId}`);
  });

  socket.on('send_message', async (data) => {
    try {
      if (!data.groupId && data.receiverId) {
        // Check for block in BOTH directions
        const isBlocked = await BlockList.findOne({
          where: {
            [Op.or]: [
              { blockerId: data.receiverId, blockedId: data.senderId }, // Receiver blocked Sender
              { blockerId: data.senderId, blockedId: data.receiverId }  // Sender blocked Receiver
            ]
          }
        });
        
        if (isBlocked) {
            console.log(`Message blocked between ${data.senderId} and ${data.receiverId}`);
            return;
        }
      }

      const message = await Message.create({ ...data, status: 'sent' });
      // Fetch sender info to append
      const fullMessage = await Message.findByPk(message.id, {
          include: [{ model: User, as: 'Sender', attributes: ['id', 'username', 'profilePic'] }]
      });

      if (data.groupId) {
          io.to(data.groupId).emit('receive_message', fullMessage);
      } else {
          io.to(data.receiverId).emit('receive_message', fullMessage);
          io.to(data.senderId).emit('message_sent', fullMessage);
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('message_delivered', async ({ messageId, senderId }) => {
      try {
          const message = await Message.findByPk(messageId);
          if (message && message.status === 'sent') {
              await message.update({ status: 'delivered' });
              io.to(senderId).emit('message_status_update', { messageId, status: 'delivered' });
          }
      } catch (err) { console.error(err); }
  });

  socket.on('message_read', async ({ messageId, senderId }) => {
      try {
          const message = await Message.findByPk(messageId);
          if (message && message.status !== 'read') {
              await message.update({ status: 'read', isRead: true });
              io.to(senderId).emit('message_status_update', { messageId, status: 'read' });
          }
      } catch (err) { console.error(err); }
  });

  socket.on('mark_all_read', async ({ senderId, receiverId }) => {
      try {
          // Mark all messages from senderId to receiverId as read
          await Message.update(
              { status: 'read', isRead: true },
              { where: { senderId: senderId, receiverId: receiverId, status: ['sent', 'delivered'] } }
          );
          // Notify sender (senderId) that receiver (receiverId) read them
          // Wait, who is triggering this? The receiver triggers it.
          // So receiverId is the one reading. senderId is the one who sent the messages.
          io.to(senderId).emit('all_messages_read', { receiverId }); 
      } catch (err) { console.error(err); }
  });

  socket.on('edit_message', (updatedMessage) => {
      if (updatedMessage.groupId) {
          io.to(updatedMessage.groupId).emit('message_updated', updatedMessage);
      } else {
          io.to(updatedMessage.receiverId).emit('message_updated', updatedMessage);
          io.to(updatedMessage.senderId).emit('message_updated', updatedMessage);
      }
  });

  socket.on('delete_message', (data) => { // data: { messageId, groupId, senderId, receiverId }
      if (data.groupId) {
          io.to(data.groupId).emit('message_deleted', data.messageId);
      } else {
          io.to(data.receiverId).emit('message_deleted', data.messageId);
          io.to(data.senderId).emit('message_deleted', data.messageId);
      }
  });
  
  socket.on('send_connection_request', (data) => {
      // Use data.to as receiverId (Client sends { to: targetUserId, ... })
      io.to(data.to).emit('connection_request', data); 
  });
  
  socket.on('accept_connection_request', (data) => {
      io.to(data.to).emit('connection_accepted', data);
  });

  // WebRTC Signaling
  socket.on('call_user', (data) => {
    // If it's a group call, we need to handle it differently or broadcast
    if (data.isGroup) {
         socket.to(data.groupId).emit('call_group', {
            signal: data.signalData,
            from: data.from,
            name: data.name,
            type: data.type,
            groupId: data.groupId
        });
    } else {
        io.to(data.userToCall).emit('call_user', { 
            signal: data.signalData, 
            from: data.from, 
            name: data.name,
            type: data.type 
        });
    }
  });

  socket.on('answer_call', (data) => {
    io.to(data.to).emit('call_accepted', data.signal);
  });
  
  socket.on('ice_candidate', (data) => {
      io.to(data.to).emit('ice_candidate', data.candidate);
  });
  
  socket.on('end_call', (data) => {
      io.to(data.to).emit('end_call');
  });

  socket.on('disconnect', async () => {
    let userId = null;
    for (const [uid, sid] of onlineUsers.entries()) {
        if (sid === socket.id) {
            userId = uid;
            break;
        }
    }
    
    if (userId) {
        onlineUsers.delete(userId);
        try {
            const user = await User.findByPk(userId);
            if (user) {
                await user.update({ isOnline: false, lastSeen: new Date() });
                if (user.showOnlineStatus) {
                    // Selective broadcast
                    await broadcastStatus(userId, false);
                }
            }
        } catch (e) {
            console.error(e);
        }
    }
  });

  // Typing indicators
  socket.on('typing', async (data) => {
      // data: { receiverId }
      let senderId = null;
      for (const [uid, sid] of onlineUsers.entries()) {
        if (sid === socket.id) {
            senderId = uid;
            break;
        }
      }
      if (senderId && data.receiverId) {
          // Check Block
          const isBlocked = await BlockList.findOne({
            where: {
                [Op.or]: [
                    { blockerId: data.receiverId, blockedId: senderId },
                    { blockerId: senderId, blockedId: data.receiverId }
                ]
            }
          });
          if (isBlocked) return;

          io.to(data.receiverId).emit('user_typing', { senderId });
      }
  });

  socket.on('stop_typing', async (data) => {
      let senderId = null;
      for (const [uid, sid] of onlineUsers.entries()) {
        if (sid === socket.id) {
            senderId = uid;
            break;
        }
      }
      if (senderId && data.receiverId) {
           // Check Block
           const isBlocked = await BlockList.findOne({
            where: {
                [Op.or]: [
                    { blockerId: data.receiverId, blockedId: senderId },
                    { blockerId: senderId, blockedId: data.receiverId }
                ]
            }
          });
          if (isBlocked) return;

          io.to(data.receiverId).emit('user_stop_typing', { senderId });
      }
  });

  socket.on('recording_audio', async (data) => {
      let senderId = null;
      for (const [uid, sid] of onlineUsers.entries()) {
        if (sid === socket.id) {
            senderId = uid;
            break;
        }
      }
      if (senderId && data.receiverId) {
          // Check Block
          const isBlocked = await BlockList.findOne({
            where: {
                [Op.or]: [
                    { blockerId: data.receiverId, blockedId: senderId },
                    { blockerId: senderId, blockedId: data.receiverId }
                ]
            }
          });
          if (isBlocked) return;

          io.to(data.receiverId).emit('user_recording', { senderId });
      }
  });

  socket.on('stop_recording_audio', async (data) => {
      let senderId = null;
      for (const [uid, sid] of onlineUsers.entries()) {
        if (sid === socket.id) {
            senderId = uid;
            break;
        }
      }
      if (senderId && data.receiverId) {
          // Check Block
          const isBlocked = await BlockList.findOne({
            where: {
                [Op.or]: [
                    { blockerId: data.receiverId, blockedId: senderId },
                    { blockerId: senderId, blockedId: data.receiverId }
                ]
            }
          });
          if (isBlocked) return;

          io.to(data.receiverId).emit('user_stop_recording', { senderId });
      }
  });
});

const PORT = process.env.PORT || 5001;

// Start server regardless of DB status to ensure static files are served
const startServer = () => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Static files path: ${finalBuildPath}`);
    });
};

initializeDb().then(async () => {
    try {
        // alter: true can cause ER_TOO_MANY_KEYS in some MySQL versions/configs if run repeatedly
        // Switching to standard sync() which creates if not exists, but doesn't alter.
        await sequelize.sync({ alter: false });
        console.log('Database synced successfully');
    } catch (err) {
        console.error('Sequelize Sync Error (Non-fatal):', err);
    }
    startServer();
}).catch(err => {
    console.error('Initialization Error:', err);
    // Even if init fails completely, try to start server for debug
    startServer();
});
