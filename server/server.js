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
// Only initialize socket.io if CHAT_MODE is not 'rest'
if (process.env.CHAT_MODE !== 'rest') {
  const corsOrigins = (process.env.CORS_ORIGINS && process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)) || (
    process.env.NODE_ENV === 'production'
      ? ['https://your-frontend-domain.com']
      : ['http://localhost:3000', 'http://localhost:3001']
  );
  const io = new Server(server, { cors: { origin: corsOrigins, credentials: true } });
  io.use((socket, next) => sessionMiddleware(socket.request, {}, next));
  const userSockets = new Map();
  const adminSockets = new Set();
  io.on('connection', async (socket) => {
    // If later you re-enable real-time, old logic can be restored here.
    socket.disconnect(); // Immediately disconnect when in REST-focused deployment to avoid misuse.
  });
  console.log('Socket.io initialized (CHAT_MODE != rest)');
} else {
  console.log('CHAT_MODE=rest -> Socket.io disabled');
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

