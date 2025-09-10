const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Build express app (no server.listen or socket.io here)
const app = express();
app.set('trust proxy', 1);

// Lazy connect Mongo only once (avoid re-init in serverless cold starts)
if (!global._mongoConnected) {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).then(() => {
    global._mongoConnected = true;
    console.log('MongoDB connected (app.js)');
  }).catch(err => console.error('MongoDB connection error:', err));
}

app.use(helmet());

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '100')
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (process.env.LOG_REQUESTS === 'true') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  }
  next();
});

// Session store (in-memory fallback if no Mongo URI, but not recommended for prod)
let store;
if (process.env.MONGODB_URI) {
  store = MongoStore.create({ mongoUrl: process.env.MONGODB_URI, collectionName: 'sessions' });
}

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'pc-builder-secret-key',
  resave: false,
  saveUninitialized: false,
  store,
  cookie: {
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAMESITE || 'none',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000
  }
});
app.use(sessionMiddleware);

// CORS
const corsOrigins = (process.env.CORS_ORIGINS && process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)) || (
  process.env.NODE_ENV === 'production'
    ? ['https://your-frontend-domain.com']
    : ['http://localhost:3000', 'http://localhost:3001']
);
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Routes
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
app.use('/ai', require('./routes/ai')); // proxy-stripped fallback

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'PC Builder API is running', ts: Date.now() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

app.use('*', (req, res) => res.status(404).json({ message: 'Route not found' }));

module.exports = { app, sessionMiddleware };
