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

    // Category / purpose (featured handled separately via featuredOnly flag)
    if (req.query.category) {
      const cat = String(req.query.category).toLowerCase();
      if (cat && cat !== 'all') {
        const purposeMap = {
          gaming: 'Gaming',
          workstation: 'Workstation',
          budget: 'Budget',
          highend: 'High-End',
          office: 'Office',
          server: 'Server'
        };
        if (purposeMap[cat]) {
          filter.purpose = purposeMap[cat];
        }
      }
    } else if (req.query.purpose) {
      filter.purpose = req.query.purpose;
    }

    if (req.query.featuredOnly === 'true') {
      filter.featured = true;
      // Featured filter should ignore any purpose/category restriction
      if (filter.purpose) delete filter.purpose;
    }

    if (req.query.minPrice || req.query.maxPrice) {
      filter.totalPrice = {};
      if (req.query.minPrice) filter.totalPrice.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) filter.totalPrice.$lte = parseFloat(req.query.maxPrice);
    }

  let sort = { createdAt: -1 };
  const requestedSort = req.query.sort;
  if (requestedSort === 'price_low') sort = { totalPrice: 1 };
  else if (requestedSort === 'price_high') sort = { totalPrice: -1 };
  else if (requestedSort === 'newest') sort = { createdAt: -1 };
  // 'popular' handled separately (in-memory) to sort by likes then comments
    // Filter by followed users if requested and user is authenticated
    if (req.query.followingOnly === 'true' && req.user && req.user.following && req.user.following.length) {
      filter.user = { $in: req.user.following };
    } else if (req.query.followingOnly === 'true') {
      // If requested but no following, return empty set quickly
      return res.json({ success:true, builds: [], pagination: { currentPage: page, totalPages: 0, totalBuilds: 0 } });
    }

    let builds;
    if (requestedSort === 'popular') {
      // Aggregation to compute counts and sort server-side
      const pipeline = [
        { $match: filter },
        { $addFields: {
            likesCount: { $size: { $ifNull: [ '$likes', [] ] } },
            commentsCount: { $size: { $ifNull: [ '$comments', [] ] } }
        }},
        { $sort: { likesCount: -1, commentsCount: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: { _id:1 } }
      ];
      const orderedIds = await Build.aggregate(pipeline);
      const idList = orderedIds.map(d => d._id);
      // Fetch populated docs for those IDs
      const docs = await Build.find({ _id: { $in: idList } })
        .populate('user', 'name avatar')
        .populate(
          'components.cpu.product components.gpu.product components.motherboard.product components.ram.product components.storage.product components.powerSupply.product components.case.product components.cooling.product components.accessories.product',
          'name brand model price images'
        );
      // Preserve aggregation order
      const docMap = new Map(docs.map(d => [d._id.toString(), d]));
      builds = idList.map(id => docMap.get(id.toString())).filter(Boolean);
    } else {
      builds = await Build.find(filter)
        .populate('user', 'name avatar')
        .populate(
          'components.cpu.product components.gpu.product components.motherboard.product components.ram.product components.storage.product components.powerSupply.product components.case.product components.cooling.product components.accessories.product',
          'name brand model price images'
        )
        .sort(sort)
        .skip(skip)
        .limit(limit);
    }
    if (process.env.NODE_ENV !== 'production' && req.query.featuredOnly === 'true') {
      console.log('[community] featuredOnly filter active. Returned builds:', builds.length);
    }

  if (process.env.NODE_ENV !== 'production' && requestedSort === 'popular') {
    console.log('[community] popular order:', builds.map(b => ({ id: b._id.toString(), likes: b.likes?.length || 0, comments: b.comments?.length || 0, createdAt: b.createdAt }))); 
  }

  const transformedBuilds = builds.map(build => {
      let isLiked = false;
      let isFollowingUser = false;
      if (req.user) {
        isLiked = build.likes.some(like => like.user.toString() === req.user.id);
        if (req.user.following && Array.isArray(req.user.following)) {
          isFollowingUser = req.user.following.some(f => f.toString() === build.user._id.toString());
        }
      }
      return {
        ...build.toObject(),
    likes: build.likes.length, // keep for backward compatibility
    likesCount: build.likes.length,
    commentsCount: (build.comments && build.comments.length) || 0,
    isLiked,
    isFollowingUser,
    commentCount: (build.comments && build.comments.length) || 0
      };
    });
  const total = requestedSort === 'popular' ? await Build.countDocuments(filter) : await Build.countDocuments(filter);
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
  .populate('components.cpu.product components.gpu.product components.motherboard.product components.ram.product components.storage.product components.powerSupply.product components.case.product components.cooling.product components.accessories.product')
  .populate('comments.user','name avatar');
    
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
  likes: build.likes.length,
  commentCount: (build.comments && build.comments.length) || 0
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

// Unified handler for adding a comment (supports multiple route patterns for backward compatibility)
const addCommentValidators = [
  body('comment').trim().isLength({ min:1, max:500 }).withMessage('Comment must be 1-500 characters')
];

const addCommentHandler = async (req, res) => {
  console.log(`[Community] POST comment route hit: ${req.originalUrl}`);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success:false, message:'Validation failed', errors: errors.array() });
    }
    const build = await Build.findOne({ _id: req.params.id, isPublic: true });
    if (!build) {
      return res.status(404).json({ success:false, message:'Build not found' });
    }
    if (build.user.toString() === req.user.id) {
      return res.status(403).json({ success:false, message:'You cannot comment on your own build' });
    }
    build.comments.push({ user: req.user.id, comment: req.body.comment });
    await build.save();
    const populated = await build.populate({ path: 'comments.user', select:'name avatar' });
    const newComment = populated.comments[populated.comments.length - 1];
    return res.status(201).json({ success:true, comment: newComment, commentCount: populated.comments.length });
  } catch (error) {
    console.error('Add comment error:', error);
    return res.status(500).json({ success:false, message:'Server error' });
  }
};

// Primary comments route
router.post('/builds/:id/comments', protect, addCommentValidators, addCommentHandler);
// Alias (singular) to avoid 404 if frontend used singular path accidentally
router.post('/builds/:id/comment', protect, addCommentValidators, addCommentHandler);

// Development debug: list community routes
if (process.env.NODE_ENV !== 'production') {
  router.get('/_debug/routes', (req, res) => {
    const layerStack = (router.stack || []).filter(l => l.route).map(l => {
      const methods = Object.keys(l.route.methods).filter(m => l.route.methods[m]).join(',');
      return { path: l.route.path, methods };
    });
    res.json({ success:true, routes: layerStack });
  });
}

// Get comments for a public build (paginated)
router.get('/builds/:id/comments', optionalAuth, async (req,res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const build = await Build.findOne({ _id: req.params.id, isPublic: true })
      .populate({ path:'comments.user', select:'name avatar' });
    if (!build) {
      return res.status(404).json({ success:false, message:'Build not found' });
    }
    // Sort newest first
    const sorted = [...build.comments].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    const paged = sorted.slice(skip, skip + limit);
    res.json({
      success:true,
      comments: paged,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(sorted.length / limit),
        totalComments: sorted.length,
        hasNext: skip + limit < sorted.length
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ success:false, message:'Server error' });
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
