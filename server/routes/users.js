const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const router = express.Router();
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const filter = {};

    if (req.query.role) {
      filter.role = req.query.role;
    }

    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await User.countDocuments(filter);
    res.json({
      success: true,
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Follow a user
router.post('/:id/follow', protect, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.user.id) {
      return res.status(400).json({ success:false, message:'Cannot follow yourself' });
    }
    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ success:false, message:'User not found' });
    const me = await User.findById(req.user.id);
    const isFollowing = me.following.some(u => u.toString() === targetId);
    if (isFollowing) {
      // Unfollow
      me.following = me.following.filter(u => u.toString() !== targetId);
      target.followers = target.followers.filter(u => u.toString() !== me._id.toString());
      await me.save(); await target.save();
      return res.json({ success:true, following:false, message:'Unfollowed user', counts: { myFollowing: me.following.length, targetFollowers: target.followers.length } });
    }
    me.following.push(targetId);
    target.followers.push(me._id);
    await me.save(); await target.save();
    res.json({ success:true, following:true, message:'Followed user', counts: { myFollowing: me.following.length, targetFollowers: target.followers.length } });
  } catch (err) {
    console.error('Follow user error:', err);
    res.status(500).json({ success:false, message:'Server error' });
  }
});

// Get list of users the current user follows
router.get('/me/following/list', protect, async (req,res) => {
  try {
    const me = await User.findById(req.user.id).populate('following','name avatar');
    res.json({ success:true, following: me.following });
  } catch (err) {
    console.error('Get following list error:', err);
    res.status(500).json({ success:false, message:'Server error' });
  }
});
module.exports = router;
