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

// Send a message (user or admin). Admin must provide userId.
router.post('/send', protect, async (req, res) => {
  try {
    const { text, userId } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text required' });
    }
    let targetUserId = req.user._id;
    let sender = 'user';
    if (req.user.role === 'admin') {
      if (!userId) return res.status(400).json({ success: false, message: 'userId required for admin message' });
      targetUserId = userId;
      sender = 'admin';
    }
    const msg = await ChatMessage.create({
      user: targetUserId,
      sender,
      message: text.trim(),
      readByUser: sender === 'admin' ? false : true,
      readByAdmin: sender === 'admin' ? true : false
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

// Presence approximation (users active in last 5 minutes)
router.get('/presence', protect, async (req, res) => {
  try {
    const since = new Date(Date.now() - 5 * 60 * 1000);
    const active = await ChatMessage.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$user', lastAt: { $max: '$createdAt' } } },
      { $limit: 200 }
    ]);
    res.json({ success: true, onlineUsers: active.map(a => a._id), onlineAdmins: 0 });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to load presence' });
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
