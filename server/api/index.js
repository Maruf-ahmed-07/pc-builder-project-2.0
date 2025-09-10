// Serverless function entry point (Vercel) - WARNING: Socket.io won't persist here.
const serverless = require('serverless-http');
const { app } = require('../app');

module.exports = (req, res) => {
  const handler = serverless(app);
  return handler(req, res);
};
