// Clean server file that wraps app + socket.io (for traditional hosting)
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const ChatMessage = require('./models/ChatMessage');
const User = require('./models/User');
const { app, sessionMiddleware } = require('./app');

const PORT = process.env.PORT || 5000;

console.log('Environment loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: PORT,
  MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set'
});

const server = http.createServer(app);
const corsOrigins = (process.env.CORS_ORIGINS && process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)) || (
  process.env.NODE_ENV === 'production'
    ? ['https://your-frontend-domain.com']
    : ['http://localhost:3000', 'http://localhost:3001']
);
const io = new Server(server, { cors: { origin: corsOrigins, credentials: true } });

// Share session with socket.io
io.use((socket, next) => sessionMiddleware(socket.request, {}, next));

const userSockets = new Map();
const adminSockets = new Set();

io.on('connection', async (socket) => {
  try {
    const reqSession = socket.request.session;
    if (!reqSession || !reqSession.userId) {
      socket.emit('chat:error', 'Not authenticated');
      return socket.disconnect();
    }
    const userId = reqSession.userId.toString();
    const user = await User.findById(userId).select('role name');
    if (!user) {
      socket.emit('chat:error', 'User not found');
      return socket.disconnect();
    }
    const isAdmin = user.role === 'admin';

    socket.join(isAdmin ? 'admins' : `user:${userId}`);
    if (isAdmin) {
      adminSockets.add(socket.id);
    } else {
      if (!userSockets.has(userId)) userSockets.set(userId, new Set());
      userSockets.get(userId).add(socket.id);
    }
    io.to('admins').emit('chat:presence', { onlineUsers: Array.from(userSockets.keys()), onlineAdmins: adminSockets.size });

    socket.on('chat:message', async (data) => {
      if (!data || !data.text || typeof data.text !== 'string') return;
      let targetUserId = userId;
      if (isAdmin && data.userId) targetUserId = data.userId;
      const msg = await ChatMessage.create({
        user: targetUserId,
        sender: isAdmin ? 'admin' : 'user',
        message: data.text.trim(),
        readByUser: isAdmin ? true : false,
        readByAdmin: isAdmin ? false : true
      });
      const payload = { _id: msg._id, user: targetUserId, sender: msg.sender, message: msg.message, createdAt: msg.createdAt, readByUser: msg.readByUser, readByAdmin: msg.readByAdmin };
      if (isAdmin) {
        io.to(`user:${targetUserId}`).emit('chat:new', payload);
        io.to('admins').emit('chat:new', payload);
      } else {
        io.to(`user:${targetUserId}`).emit('chat:new', payload);
        io.to('admins').emit('chat:new', payload);
      }
    });

    socket.on('chat:close', async (targetUserId) => {
      if (!isAdmin || !targetUserId) return;
      try {
        const closeMsg = await ChatMessage.create({
          user: targetUserId,
          sender: 'system',
          message: 'This chat has been closed by support. You can start a new conversation anytime.',
          readByUser: false,
          readByAdmin: true
        });
        const payload = { _id: closeMsg._id, user: targetUserId, sender: 'system', message: closeMsg.message, createdAt: closeMsg.createdAt, readByUser: closeMsg.readByUser, readByAdmin: closeMsg.readByAdmin };
        io.to(`user:${targetUserId}`).emit('chat:new', payload);
        io.to('admins').emit('chat:new', payload);
        io.to('admins').emit('chat:closed', { user: targetUserId });
      } catch (_) {}
    });

    socket.on('chat:delete', async (targetUserId) => {
      if (!isAdmin || !targetUserId) return;
      try {
        await ChatMessage.deleteMany({ user: targetUserId });
        io.to(`user:${targetUserId}`).emit('chat:deleted', { user: targetUserId });
        io.to('admins').emit('chat:deleted', { user: targetUserId });
      } catch (_) {}
    });

    socket.on('chat:markReadUser', async () => {
      if (isAdmin) return;
      await ChatMessage.updateMany({ user: userId, sender: 'admin', readByUser: false }, { $set: { readByUser: true } });
    });

    socket.on('chat:markReadAdmin', async (targetUserId) => {
      if (!isAdmin || !targetUserId) return;
      await ChatMessage.updateMany({ user: targetUserId, sender: 'user', readByAdmin: false }, { $set: { readByAdmin: true } });
    });

    socket.on('chat:typing', (data) => {
      try {
        if (isAdmin) {
          const targetUserId = data && data.userId ? data.userId : null;
          if (targetUserId) io.to(`user:${targetUserId}`).emit('chat:typing', { user: targetUserId, from: 'admin', ts: Date.now() });
          io.to('admins').emit('chat:typing', { user: targetUserId || 'all', from: 'admin', ts: Date.now() });
        } else {
          io.to('admins').emit('chat:typing', { user: userId, from: 'user', ts: Date.now() });
          io.to(`user:${userId}`).emit('chat:typing', { user: userId, from: 'user', ts: Date.now() });
        }
      } catch (_) {}
    });

    socket.on('disconnect', () => {
      if (isAdmin) {
        adminSockets.delete(socket.id);
      } else if (userSockets.has(userId)) {
        const set = userSockets.get(userId);
        set.delete(socket.id);
        if (set.size === 0) userSockets.delete(userId);
      }
      io.to('admins').emit('chat:presence', { onlineUsers: Array.from(userSockets.keys()), onlineAdmins: adminSockets.size });
    });
  } catch (err) {
    console.error('Socket connection error', err);
    socket.emit('chat:error', 'Internal error');
    socket.disconnect();
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

