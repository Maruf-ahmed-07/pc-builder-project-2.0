const express = require('express');
const { body, validationResult } = require('express-validator');
const Build = require('../models/Build');
const { protect, optionalAuth } = require('../middleware/auth');
const router = express.Router();

router.delete('/builds/clear', protect, async (req, res) => {
  try {
    await Build.deleteMany({ isPublic: true });
    res.json({ message: 'All community builds cleared' });
  } catch (error) {
    console.error('Error clearing community builds:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/builds', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const filter = { isPublic: true };

    if (req.query.purpose) {
      filter.purpose = req.query.purpose;
    }

    if (req.query.minPrice || req.query.maxPrice) {
      filter.totalPrice = {};
      if (req.query.minPrice) filter.totalPrice.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) filter.totalPrice.$lte = parseFloat(req.query.maxPrice);
    }

    let sort = { createdAt: -1 };
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'popular':
          sort = { 'likes.length': -1, views: -1 };
          break;
        case 'price_low':
          sort = { totalPrice: 1 };
          break;
        case 'price_high':
          sort = { totalPrice: -1 };
          break;
        case 'newest':
          sort = { createdAt: -1 };
          break;
      }
    }
    const builds = await Build.find(filter)
      .populate('user', 'name avatar')
      .populate('components.cpu.product components.gpu.product components.motherboard.product components.ram.product', 'name brand model price images')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const transformedBuilds = builds.map(build => {
      let isLiked = false;
      if (req.user) {
        isLiked = build.likes.some(like => like.user.toString() === req.user.id);
      }
      return {
        ...build.toObject(),
        likes: build.likes.length,
        isLiked
      };
    });
    const total = await Build.countDocuments(filter);
    res.json({
      success: true,
      builds: transformedBuilds,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalBuilds: total
      }
    });
  } catch (error) {
    console.error('Get community builds error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


router.get('/builds/:id', optionalAuth, async (req, res) => {
  try {
    const build = await Build.findOne({ 
      _id: req.params.id, 
      isPublic: true 
    })
    .populate('user', 'name avatar')
    .populate('components.cpu.product components.gpu.product components.motherboard.product components.ram.product components.storage.product components.powerSupply.product components.case.product components.cooling.product components.accessories.product');
    
    if (!build) {
      return res.status(404).json({
        success: false,
        message: 'Build not found'
      });
    }

    let isLiked = false;
    if (req.user) {
      isLiked = build.likes.some(like => like.user.toString() === req.user.id);
    }

    build.views = (build.views || 0) + 1;
    await build.save();
    
    res.json({
      success: true,
      build: {
        ...build.toObject(),
        isLiked,
        likes: build.likes.length
      }
    });
  } catch (error) {
    console.error('Get build details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.post('/builds', protect, [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Build name must be between 1 and 100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    const { buildId, name, description, components, totalPrice, createdBy } = req.body;

    const originalBuild = await Build.findById(buildId);
    if (!originalBuild || originalBuild.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    originalBuild.isPublic = true;
    originalBuild.name = name;
    originalBuild.description = description;
    await originalBuild.save();
    res.json({
      success: true,
      message: 'Build shared to community successfully',
      build: originalBuild
    });
  } catch (error) {
    console.error('Share build to community error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.post('/builds/:id/like', protect, async (req, res) => {
  try {
    const build = await Build.findById(req.params.id);
    if (!build) {
      return res.status(404).json({
        success: false,
        message: 'Build not found'
      });
    }
    if (!build.isPublic) {
      return res.status(400).json({
        success: false,
        message: 'Cannot like private builds'
      });
    }
    const existingLike = build.likes.find(
      like => like.user.toString() === req.user.id
    );
    if (existingLike) {

      build.likes = build.likes.filter(
        like => like.user.toString() !== req.user.id
      );
    } else {

      build.likes.push({ user: req.user.id });
    }
    await build.save();
    res.json({
      success: true,
      message: existingLike ? 'Build unliked' : 'Build liked',
      likes: build.likes.length
    });
  } catch (error) {
    console.error('Like build error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


router.get('/shared/:shareUrl', async (req, res) => {
  try {
    const build = await Build.findOne({ shareUrl: req.params.shareUrl })
      .populate('user', 'name avatar')
      .populate('components.cpu.product components.gpu.product components.motherboard.product components.ram.product components.storage.product components.powerSupply.product components.case.product components.cooling.product components.accessories.product');
    if (!build) {
      return res.status(404).json({
        success: false,
        message: 'Build not found'
      });
    }

    build.views += 1;
    await build.save();
    res.json({
      success: true,
      build
    });
  } catch (error) {
    console.error('Get shared build error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
module.exports = router;
