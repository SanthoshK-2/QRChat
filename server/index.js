const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const sequelize = require('./config/database');
const initializeDb = require('./utils/initializeDb');
const { User, Message, Group, GroupMember, BlockList, CallHistory } = require('./models');
const { Op } = require('sequelize');

const authRoutes = require('./routes/authRoutes');
const connectionRoutes = require('./routes/connectionRoutes');
const chatRoutes = require('./routes/chatRoutes');
const groupRoutes = require('./routes/groupRoutes');
const recoveryRoutes = require('./routes/recoveryRoutes');
const callRoutes = require('./routes/callRoutes');
const syncRoutes = require('./routes/syncRoutes');
const adminRoutes = require('./routes/adminRoutes');
const iceRoutes = require('./routes/iceRoutes');

const app = express();
const server = http.createServer(app);

// Required for express-rate-limit and proxies like Render to correctly read X-Forwarded-For
// Use "one proxy hop" to satisfy express-rate-limit validation (avoids permissive=true)
app.set('trust proxy', 1);

const allowList = (() => {
    const envList = (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    const defaults = ['https://qrchat-1.onrender.com'];
    return [...new Set([...envList, ...defaults])];
})();
const corsOptions = {
    origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        const ok = allowList.some(a => origin === a);
        cb(ok ? null : new Error('Not allowed by CORS'), ok);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: false
};
app.use(cors(process.env.NODE_ENV === 'production' ? corsOptions : { origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'] }));

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(express.json({ limit: '1mb' }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false });
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: true, legacyHeaders: false });

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/recovery', authLimiter);
// Ensure uploads dir exists to prevent 500 on profile picture upload
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
try { if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir); } catch {}
app.use('/uploads', express.static(uploadsDir));

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

app.get('/api/diag', async (req, res) => {
    try {
        await sequelize.authenticate();
        const qi = sequelize.getQueryInterface();
        const tables = await qi.showAllTables();
        res.json({
            db: {
                dialect: sequelize.getDialect()
            },
            tables
        });
    } catch (e) {
        res.status(500).json({ message: 'diag failed', error: e.message });
    }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/recovery', recoveryRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ice', iceRoutes);

// Standard Express Pattern: server/public is the only place we care about now
const localPublicPath = path.join(__dirname, 'public'); 

if (process.env.NODE_ENV !== 'production') {
    console.log('--- PATH DEBUG START ---');
    console.log('__dirname:', __dirname);
    console.log('CWD:', process.cwd());
    const appSecret = process.env.APP_SECRET || "chate-secure-transport-key-2024";
    console.log(`[DEBUG] APP_SECRET starts with: ${appSecret.substring(0, 5)}... ends with: ...${appSecret.substring(appSecret.length - 3)}`);
}

// Robust Path Selection Strategy
let finalBuildPath = null;
const possiblePaths = [
    localPublicPath,                                      // 1. server/public (Primary)
    path.join(__dirname, '../client/dist'),               // 2. ../client/dist (Fallback if copy failed)
    path.join(process.cwd(), 'client/dist'),              // 3. root/client/dist (If CWD is root)
    path.join(process.cwd(), 'server/public'),            // 4. root/server/public (Explicit)
    '/opt/render/project/src/server/public',              // 5. Absolute Render Path
    '/opt/render/project/src/client/dist'                 // 6. Absolute Render Client Path
];

for (const p of possiblePaths) {
    if (process.env.NODE_ENV !== 'production') console.log(`Checking path: ${p}`);
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
        if (process.env.NODE_ENV !== 'production') console.log(`FOUND VALID FRONTEND AT: ${p}`);
        finalBuildPath = p;
        break;
    }
}

if (!finalBuildPath) {
    console.error('CRITICAL: Could not find index.html in ANY expected location.');
    // Default to localPublicPath so we at least have a path to show 404 for
    finalBuildPath = localPublicPath;
} else {
    if (process.env.NODE_ENV !== 'production') console.log(`SUCCESS: Serving static files from: ${finalBuildPath}`);
}

if (process.env.NODE_ENV !== 'production') console.log('--- PATH DEBUG END ---');

// Safety Check: Ensure we aren't serving source code
try {
    if (finalBuildPath && fs.existsSync(path.join(finalBuildPath, 'index.html'))) {
        const indexContent = fs.readFileSync(path.join(finalBuildPath, 'index.html'), 'utf8');
        if (indexContent.includes('src/main.jsx')) {
            console.error('DANGER: Detected source HTML file! Refusing to serve.');
            finalBuildPath = null;
        }
    }
} catch (e) { console.error('Error reading index.html:', e); }

// Serve static assets with correct MIME types
app.use(express.static(finalBuildPath, {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// app.use(express.static(finalBuildPath, { ... })); // Removed duplicate block

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
            try { 
                contents = JSON.stringify(fs.readdirSync(finalBuildPath)); 
            } catch(e) {
                contents = `Cannot read directory (${e.code}): ${e.message}`;
            }
            
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
const activeSessions = new Map(); // userId -> UsageSession id

const emitAdminOnline = async () => {
    try {
        const count = await User.count({ where: { isOnline: true } });
        io.to('admins').emit('admin_online_update', { online: count });
    } catch {}
};

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
  // Active call sessions in memory: key is sorted pair "a|b"
  const makeKey = (a, b) => [a, b].sort().join('|');

  socket.on('admin_join', () => {
    socket.join('admins');
    emitAdminOnline();
  });

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
            emitAdminOnline();

        // Start usage session if none active
        if (!activeSessions.has(userId)) {
            const { UsageSession } = require('./models');
            const session = await UsageSession.create({ userId, startedAt: new Date() });
            activeSessions.set(userId, session.id);
            io.to('admins').emit('admin_usage_update');
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

  socket.on('call_user', (data) => {
    // Track initiated call
    try {
      const key = makeKey(data.from, data.userToCall);
      activeCalls.set(key, {
        callerId: data.from,
        receiverId: data.userToCall,
        type: data.type || 'audio',
        startedAt: new Date(),
        accepted: false
      });
    } catch {}
  });

  socket.on('answer_call', (data) => {
    io.to(data.to).emit('call_accepted', data.signal);
    // Mark as accepted and reset start time to now for accurate duration
    try {
      // data.to is the callerId; socket is callee
      // We need both ids; find from rooms or payload we tracked
      for (const [key, val] of activeCalls.entries()) {
        if ((val.callerId === data.to && val.receiverId) || key.includes(data.to)) {
          val.accepted = true;
          val.startedAt = new Date();
          activeCalls.set(key, val);
          break;
        }
      }
    } catch {}
  });
  
  socket.on('ice_candidate', (data) => {
      io.to(data.to).emit('ice_candidate', data.candidate);
  });
  
  // Explicit reject event to improve UX and avoid lingering peers
  socket.on('reject_call', (data) => {
      // data: { to }
      io.to(data.to).emit('call_rejected');
      // Persist rejected
      try {
        const key = makeKey(socket.userId || '', data.to);
        const entry = (() => {
          for (const [k, v] of activeCalls.entries()) {
            if (k.includes(data.to)) return { key: k, val: v };
          }
          return null;
        })();
        if (entry && entry.val) {
          CallHistory.create({
            callerId: entry.val.callerId,
            receiverId: entry.val.receiverId,
            type: entry.val.type,
            status: 'rejected',
            duration: 0,
            endedAt: new Date()
          }).catch(() => {});
          activeCalls.delete(entry.key);
          io.to('admins').emit('admin_calls_update');
        }
      } catch {}
  });
  
  socket.on('end_call', async (data) => {
      const { to, duration } = data;
      io.to(to).emit('call_ended');
      // Also notify the caller (self) to update history
      socket.emit('call_ended');
      // Persist completion/missed on server as a fallback
      try {
        const key = makeKey(socket.userId || '', to);
        let storedKey = null; let info = null;
        for (const [k, v] of activeCalls.entries()) {
          if ((v.callerId === to && v.receiverId) || k.includes(to)) {
            storedKey = k; info = v; break;
          }
        }
        if (info) {
          const end = new Date();
          const dur = typeof duration === 'number'
            ? Math.max(0, Math.floor(duration))
            : (info.startedAt ? Math.max(0, Math.floor((end - info.startedAt) / 1000)) : 0);
          const status = info.accepted ? 'completed' : 'missed';
          CallHistory.create({
            callerId: info.callerId,
            receiverId: info.receiverId,
            type: info.type,
            status,
            duration: dur,
            endedAt: end
          }).catch(() => {});
          if (storedKey) activeCalls.delete(storedKey);
          io.to('admins').emit('admin_calls_update');
        }
      } catch {}
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
                emitAdminOnline();
            }
            // Close usage session if active
            if (activeSessions.has(userId)) {
                const { UsageSession } = require('./models');
                const id = activeSessions.get(userId);
                const session = await UsageSession.findByPk(id);
                if (session && !session.endedAt) {
                    const end = new Date();
                    const duration = Math.max(0, Math.floor((end - session.startedAt) / 1000));
                    session.endedAt = end;
                    session.durationSeconds = duration;
                    await session.save();
                }
                activeSessions.delete(userId);
                io.to('admins').emit('admin_usage_update');
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
