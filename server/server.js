const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const http = require('http');
const { Server } = require('socket.io');
const ChatMessage = require('./models/ChatMessage');

const app = express();

app.set('trust proxy', 1);

console.log('Environment loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set'
});

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

app.use(helmet());

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX)
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'pc-builder-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000
  }
});

app.use(sessionMiddleware);

// Dynamic CORS origins via env (comma separated), fallback to sensible defaults
const corsOrigins = (process.env.CORS_ORIGINS && process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)) || (
  process.env.NODE_ENV === 'production'
    ? ['https://your-domain.com']
    : ['http://localhost:3000', 'http://localhost:3001']
);
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use('/uploads', express.static('public/uploads'));

console.log('Setting up routes...');
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/builds', require('./routes/builds'));
app.use('/api/community', require('./routes/community'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/benchmark', require('./routes/benchmark'));
app.use('/api/ai', require('./routes/ai'));
// Handle proxy-stripped AI route
app.use('/ai', require('./routes/ai'));

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'PC Builder API is running',
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Create HTTP server & attach socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    credentials: true
  }
});

// Share session with socket.io
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Map of userId -> socket ids
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
    // quick role check by lightweight query (avoid full populate)
    const User = require('./models/User');
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
      let targetUserId = userId; // default: user's own thread
      if (isAdmin && data.userId) {
        targetUserId = data.userId;
      }
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
        io.to(`user:${targetUserId}`).emit('chat:new', payload); // echo back to user thread
        io.to('admins').emit('chat:new', payload);
      }
    });

    // Admin closes (resets) a chat thread
    socket.on('chat:close', async (targetUserId) => {
      if (!isAdmin || !targetUserId) return;
      try {
        // Soft close: add a system message marking closure
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
        // Optional: purge old messages (uncomment to actually clear)
        // await ChatMessage.deleteMany({ user: targetUserId, sender: { $in: ['user','admin'] } });
        io.to('admins').emit('chat:closed', { user: targetUserId });
      } catch (e) {
        // ignore
      }
    });

    // Hard delete chat thread
    socket.on('chat:delete', async (targetUserId) => {
      if (!isAdmin || !targetUserId) return;
      try {
        await ChatMessage.deleteMany({ user: targetUserId });
        io.to(`user:${targetUserId}`).emit('chat:deleted', { user: targetUserId });
        io.to('admins').emit('chat:deleted', { user: targetUserId });
      } catch (e) {
        // ignore
      }
    });

    socket.on('chat:markReadUser', async () => {
      if (isAdmin) return; // user only
      await ChatMessage.updateMany({ user: userId, sender: 'admin', readByUser: false }, { $set: { readByUser: true } });
    });

    socket.on('chat:markReadAdmin', async (targetUserId) => {
      if (!isAdmin || !targetUserId) return;
      await ChatMessage.updateMany({ user: targetUserId, sender: 'user', readByAdmin: false }, { $set: { readByAdmin: true } });
    });

    // Typing indicator
    socket.on('chat:typing', (data) => {
      try {
        if (isAdmin) {
          const targetUserId = data && data.userId ? data.userId : null;
            if (targetUserId) {
              io.to(`user:${targetUserId}`).emit('chat:typing', { user: targetUserId, from: 'admin', ts: Date.now() });
            }
            io.to('admins').emit('chat:typing', { user: targetUserId || 'all', from: 'admin', ts: Date.now() });
        } else {
          io.to('admins').emit('chat:typing', { user: userId, from: 'user', ts: Date.now() });
          io.to(`user:${userId}`).emit('chat:typing', { user: userId, from: 'user', ts: Date.now() });
        }
      } catch (e) {
        // ignore typing errors
      }
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
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
