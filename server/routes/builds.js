const express = require('express');
const { body, validationResult } = require('express-validator');
const Build = require('../models/Build');
const Product = require('../models/Product');
const { protect, optionalAuth } = require('../middleware/auth');
const router = express.Router();

router.post('/', protect, [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Build name must be between 1 and 100 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
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
    const buildData = {
      ...req.body,
      user: req.user.id
    };
    const build = await Build.create(buildData);

    if (req.body.components && Object.keys(req.body.components).length > 0) {
      try {
        build.calculateTotalPrice();
        build.checkCompatibility();
        await build.save();
      } catch (error) {
        console.log('Warning: Could not calculate price or compatibility:', error.message);
      }
    }
    res.status(201).json({
      success: true,
      message: 'Build created successfully',
      build
    });
  } catch (error) {
    console.error('Create build error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


router.get('/user', protect, async (req, res) => {
  console.log('GET /api/builds/user called by user:', req.user?.id);
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const builds = await Build.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Build.countDocuments({ user: req.user.id });
    console.log(`Found ${builds.length} builds for user ${req.user.id}`);
    res.json({
      success: true,
      builds,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalBuilds: total
      }
    });
  } catch (error) {
    console.error('Get user builds error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});



router.get('/:id', protect, async (req, res) => {
  console.log('GET /api/builds/:id called with ID:', req.params.id);

  try {
    const build = await Build.findById(req.params.id)
      .populate('user', 'name avatar')
      .populate('components.cpu.product components.gpu.product components.motherboard.product components.ram.product components.storage.product components.powerSupply.product components.case.product components.cooling.product components.accessories.product');
    if (!build) {
      return res.status(404).json({
        success: false,
        message: 'Build not found'
      });
    }

    if (build.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - you can only view your own builds'
      });
    }
    res.json({
      success: true,
      build
    });
  } catch (error) {
    console.error('Get build error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


router.put('/:id', protect, async (req, res) => {
  try {
    const build = await Build.findById(req.params.id);
    if (!build) {
      return res.status(404).json({
        success: false,
        message: 'Build not found'
      });
    }

    if (build.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    Object.assign(build, req.body);

    await build.calculateTotalPrice();
    await build.checkCompatibility();
    res.json({
      success: true,
      message: 'Build updated successfully',
      build
    });
  } catch (error) {
    console.error('Update build error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


router.delete('/:id', protect, async (req, res) => {
  try {
    const build = await Build.findById(req.params.id);
    if (!build) {
      return res.status(404).json({
        success: false,
        message: 'Build not found'
      });
    }

    if (build.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    await build.deleteOne();
    res.json({
      success: true,
      message: 'Build deleted successfully'
    });
  } catch (error) {
    console.error('Delete build error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});


router.post('/check-compatibility', async (req, res) => {
  try {
    const { components } = req.body;
    const issues = [];
    const warnings = [];
    if (components.cpu && components.motherboard) {
      const cpu = await Product.findById(components.cpu.product);
      const motherboard = await Product.findById(components.motherboard.product);
      if (cpu && motherboard) {
        if (cpu.compatibility?.socket !== motherboard.compatibility?.socket) {
          issues.push('CPU and motherboard socket compatibility issue');
        }
      }
    }
    if (components.ram && components.motherboard) {
      const ram = await Product.findById(components.ram.product);
      const motherboard = await Product.findById(components.motherboard.product);
      if (ram && motherboard) {
        if (ram.compatibility?.memoryType !== motherboard.compatibility?.memoryType) {
          issues.push('RAM and motherboard memory type compatibility issue');
        }
      }
    }
    if (components.powerSupply) {
      let totalWattage = 0;
      for (const [key, component] of Object.entries(components)) {
        if (component.product) {
          const product = await Product.findById(component.product);
          if (product && product.compatibility?.powerRequirement) {
            totalWattage += product.compatibility.powerRequirement * (component.quantity || 1);
          }
        }
      }
      const psu = await Product.findById(components.powerSupply.product);
      if (psu && psu.specifications?.get('wattage')) {
        const psuWattage = parseInt(psu.specifications.get('wattage'));
        if (totalWattage > psuWattage * 0.8) {
          warnings.push('Power supply might be insufficient for this build');
        }
      }
    }
    res.json({
      success: true,
      compatibility: {
        isCompatible: issues.length === 0,
        issues,
        warnings
      }
    });
  } catch (error) {
    console.error('Check compatibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
module.exports = router;
