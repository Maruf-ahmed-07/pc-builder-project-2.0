const express = require('express');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Get current user's chat thread
router.get('/thread', protect, async (req, res) => {
  try {
    let messages = await ChatMessage.find({ user: req.user._id }).sort({ createdAt: 1 });
    if (messages.length === 0) {
      const welcome = await ChatMessage.create({
        user: req.user._id,
        sender: 'system',
        message: 'Hi! 👋 Welcome to Support. Ask us anything about products, orders, or builds and an agent will join shortly.',
        readByUser: true,
        readByAdmin: false
      });
      messages = [welcome];
    }
    res.json({ success: true, messages });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to load messages' });
  }
});

// User sends a message (REST alternative to socket)
router.post('/message', protect, async (req, res) => {
  try {
    const text = (req.body.text || '').trim();
    if (!text) return res.status(400).json({ success: false, message: 'Message required' });
    const msg = await ChatMessage.create({
      user: req.user._id,
      sender: 'user',
      message: text,
      readByUser: true,
      readByAdmin: false
    });
    res.json({ success: true, message: msg });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

// Admin: list user threads with last message + unread counts
router.get('/threads', protect, adminOnly, async (req, res) => {
  try {
    const pipeline = [
      { $sort: { createdAt: -1 } },
      { $group: { 
          _id: '$user',
          lastMessageAt: { $first: '$createdAt' },
          lastMessage: { $first: '$message' },
          lastSender: { $first: '$sender' },
          unreadForAdmin: { $sum: { $cond: [{ $and: [{ $eq: ['$sender', 'user'] }, { $eq: ['$readByAdmin', false] }] }, 1, 0] } },
          unreadForUser: { $sum: { $cond: [{ $and: [{ $eq: ['$sender', 'admin'] }, { $eq: ['$readByUser', false] }] }, 1, 0] } }
        } },
      { $sort: { lastMessageAt: -1 } },
      { $limit: 100 }
    ];

    const aggregated = await ChatMessage.aggregate(pipeline);
    const userIds = aggregated.map(a => a._id);
    const users = await User.find({ _id: { $in: userIds } }, 'name email');
    const userMap = users.reduce((acc,u)=>{ acc[u._id] = u; return acc; }, {});

    const threads = aggregated.map(t => ({
      user: userMap[t._id],
      lastMessageAt: t.lastMessageAt,
      lastMessage: t.lastMessage,
      lastSender: t.lastSender,
      unreadForAdmin: t.unreadForAdmin,
      unreadForUser: t.unreadForUser
    }));

    res.json({ success: true, threads });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Failed to load threads' });
  }
});

// Admin: get messages for a user thread
router.get('/thread/:userId', protect, adminOnly, async (req, res) => {
  try {
    let messages = await ChatMessage.find({ user: req.params.userId }).sort({ createdAt: 1 });
    if (messages.length === 0) {
      const welcome = await ChatMessage.create({
        user: req.params.userId,
        sender: 'system',
        message: 'User has not started the conversation yet.',
        readByUser: false,
        readByAdmin: true
      });
      messages = [welcome];
    }
    res.json({ success: true, messages });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to load messages' });
  }
});

// Admin sends a message to a user's thread
router.post('/message/:userId', protect, adminOnly, async (req, res) => {
  try {
    const text = (req.body.text || '').trim();
    if (!text) return res.status(400).json({ success: false, message: 'Message required' });
    const msg = await ChatMessage.create({
      user: req.params.userId,
      sender: 'admin',
      message: text,
      readByUser: false,
      readByAdmin: true
    });
    res.json({ success: true, message: msg });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

// Admin closes a chat thread (adds system message)
router.post('/close/:userId', protect, adminOnly, async (req, res) => {
  try {
    const closeMsg = await ChatMessage.create({
      user: req.params.userId,
      sender: 'system',
      message: 'This chat has been closed by support. You can start a new conversation anytime.',
      readByUser: false,
      readByAdmin: true
    });
    res.json({ success: true, message: closeMsg });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to close chat' });
  }
});

// Admin deletes (purges) a chat thread
router.delete('/thread/:userId', protect, adminOnly, async (req, res) => {
  try {
    await ChatMessage.deleteMany({ user: req.params.userId });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to delete thread' });
  }
});

// Mark messages read (user)
router.post('/read', protect, async (req, res) => {
  try {
    await ChatMessage.updateMany({ user: req.user._id, sender: 'admin', readByUser: false }, { $set: { readByUser: true } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to mark read' });
  }
});

// Admin mark read for a user thread
router.post('/read/:userId', protect, adminOnly, async (req, res) => {
  try {
    await ChatMessage.updateMany({ user: req.params.userId, sender: 'user', readByAdmin: false }, { $set: { readByAdmin: true } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to mark read' });
  }
});

module.exports = router;
