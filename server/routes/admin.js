const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Product = require('../models/Product');
const Build = require('../models/Build');
const Order = require('../models/Order');
const Contact = require('../models/Contact');
const { protect, adminOnly } = require('../middleware/auth');
const router = express.Router();

router.use(protect);
router.use(adminOnly);
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalBuilds,
      totalOrders,
      pendingOrders,
      openContacts,
      recentOrders,
      topProducts
    ] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Build.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Contact.countDocuments({ status: 'Open' }),
      Order.find().populate('user', 'name').sort({ createdAt: -1 }).limit(5),
      Product.aggregate([
        { $match: { isActive: true } },
        { $sort: { price: -1 } },
        { $limit: 5 },
        { $project: { name: 1, brand: 1, price: 1 } }
      ])
    ]);

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth },
          status: { $in: ['delivered', 'shipped'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      const dayRevenue = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: date, $lt: nextDate },
            status: { $in: ['delivered', 'shipped'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' }
          }
        }
      ]);
      last7Days.push({
        date: date.toISOString().split('T')[0],
        revenue: dayRevenue[0]?.total || 0
      });
    }

    const topCategories = await Order.aggregate([
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);
    res.json({
      success: true,
      stats: {
        totalUsers,
        totalProducts,
        totalBuilds,
        totalOrders,
        pendingOrders,
        openContacts,
        monthlyRevenue: monthlyRevenue[0]?.total || 0
      },
      recentOrders,
      topProducts,
      revenueChart: last7Days,
      topCategories
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
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
    console.error('Admin get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.put('/users/:id', [
  body('role').optional().isIn(['user', 'admin']).withMessage('Valid role is required'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
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
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (req.body.role !== undefined) {
      user.role = req.body.role;
    }
    if (req.body.isActive !== undefined) {
      user.isActive = req.body.isActive;
    }
    await user.save();
    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.get('/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { brand: { $regex: req.query.search, $options: 'i' } },
        { model: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Product.countDocuments(filter);
    res.json({
      success: true,
      products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalProducts: total
      }
    });
  } catch (error) {
    console.error('Admin get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.post('/products', [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Product name is required'),
  body('description').trim().isLength({ min: 1, max: 2000 }).withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('category').isIn(['CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'Power Supply', 'Case', 'Cooling', 'Accessories']).withMessage('Valid category is required'),
  body('brand').trim().notEmpty().withMessage('Brand is required'),
  body('model').trim().notEmpty().withMessage('Model is required'),
  body('stock').isInt({ min: 0 }).withMessage('Valid stock quantity is required'),
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
    const product = await Product.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Admin create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.put('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    Object.assign(product, req.body);
    await product.save();
    res.json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Admin update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    await product.deleteOne();
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.get('/orders', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }
    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .populate('items.product', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Order.countDocuments(filter);
    res.json({
      success: true,
      orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalOrders: total
      }
    });
  } catch (error) {
    console.error('Admin get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.put('/orders/:id/status', [
  body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Valid status is required'),
  body('note').optional().trim(),
  body('trackingNumber').optional().trim(),
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
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (req.body.trackingNumber) {
      order.trackingNumber = req.body.trackingNumber;
    }

    order.status = req.body.status;

    if (req.body.status === 'delivered') {
      order.deliveredAt = new Date();
    }
    await order.save();
    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Admin update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.get('/contacts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }
    const contacts = await Contact.find(filter)
      .populate('user', 'name email')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Contact.countDocuments(filter);
    res.json({
      success: true,
      contacts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalContacts: total
      }
    });
  } catch (error) {
    console.error('Admin get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.post('/contacts/:id/response', [
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Response message is required'),
  body('isInternal').optional().isBoolean(),
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
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    contact.responses.push({
      message: req.body.message,
      respondedBy: req.user.id,
      isInternal: req.body.isInternal || false
    });

    if (contact.status === 'Open') {
      contact.status = 'In Progress';
    }
    await contact.save();
    await contact.populate('responses.respondedBy', 'name');
    res.status(201).json({
      success: true,
      message: 'Response added successfully',
      contact
    });
  } catch (error) {
    console.error('Admin respond to contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.put('/contacts/:id/status', [
  body('status').isIn(['Open', 'In Progress', 'Resolved', 'Closed']).withMessage('Valid status is required'),
  body('assignedTo').optional().isMongoId(),
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
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }
    contact.status = req.body.status;
    if (req.body.assignedTo) {
      contact.assignedTo = req.body.assignedTo;
    }
    await contact.save();
    res.json({
      success: true,
      message: 'Contact status updated successfully',
      contact
    });
  } catch (error) {
    console.error('Admin update contact status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.get('/builds', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.isPublic !== undefined) {
      filter.isPublic = req.query.isPublic === 'true';
    }
    if (req.query.featured !== undefined) {
      filter.featured = req.query.featured === 'true';
    }
    const builds = await Build.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Build.countDocuments(filter);
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
    console.error('Admin get builds error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.put('/builds/:id/featured', async (req, res) => {
  try {
    const build = await Build.findById(req.params.id);
    if (!build) {
      return res.status(404).json({
        success: false,
        message: 'Build not found'
      });
    }
    build.featured = !build.featured;
    await build.save();
    res.json({
      success: true,
      message: `Build ${build.featured ? 'featured' : 'unfeatured'} successfully`,
      build
    });
  } catch (error) {
    console.error('Admin toggle build featured error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.delete('/builds/:buildId/comments/:commentId', async (req, res) => {
  try {
    const build = await Build.findById(req.params.buildId);
    if (!build) {
      return res.status(404).json({
        success: false,
        message: 'Build not found'
      });
    }
    build.comments = build.comments.filter(
      comment => comment._id.toString() !== req.params.commentId
    );
    await build.save();
    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete build comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.get('/analytics', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const userRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    const orderTrends = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    const productPerformance = await Order.aggregate([
      { $unwind: '$items' },
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product._id',
          name: { $first: '$product.name' },
          brand: { $first: '$product.brand' },
          category: { $first: '$product.category' },
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    const userActivity = await Build.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$user',
          buildsCreated: { $sum: 1 },
          publicBuilds: { $sum: { $cond: ['$isPublic', 1, 0] } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userName: '$user.name',
          userEmail: '$user.email',
          buildsCreated: 1,
          publicBuilds: 1
        }
      },
      { $sort: { buildsCreated: -1 } },
      { $limit: 10 }
    ]);
    res.json({
      success: true,
      analytics: {
        userRegistrations,
        orderTrends,
        productPerformance,
        userActivity
      }
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.get('/inventory', async (req, res) => {
  try {

    const lowStock = await Product.find({
      stock: { $lt: 10 },
      isActive: true
    }).select('name brand stock category price');

    const outOfStock = await Product.find({
      stock: 0,
      isActive: true
    }).select('name brand category price');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const topSelling = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          name: '$product.name',
          brand: '$product.brand',
          category: '$product.category',
          stock: '$product.stock',
          totalSold: 1
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    const categoryInventory = await Product.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: '$category',
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          lowStockCount: {
            $sum: { $cond: [{ $lt: ['$stock', 10] }, 1, 0] }
          },
          outOfStockCount: {
            $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] }
          },
          totalValue: { $sum: { $multiply: ['$stock', '$price'] } }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);
    res.json({
      success: true,
      inventory: {
        lowStock,
        outOfStock,
        topSelling,
        categoryInventory,
        summary: {
          lowStockCount: lowStock.length,
          outOfStockCount: outOfStock.length,
          totalProducts: await Product.countDocuments({ isActive: true })
        }
      }
    });
  } catch (error) {
    console.error('Admin inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.put('/products/bulk-price-update', [
  body('products').isArray().withMessage('Products array is required'),
  body('products.*.id').isMongoId().withMessage('Valid product ID is required'),
  body('products.*.price').isFloat({ min: 0 }).withMessage('Valid price is required'),
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
    const { products } = req.body;
    const updateResults = [];
    for (const productUpdate of products) {
      try {
        const product = await Product.findById(productUpdate.id);
        if (product) {
          const oldPrice = product.price;
          product.price = productUpdate.price;
          if (productUpdate.discountPrice) {
            product.discountPrice = productUpdate.discountPrice;
          }
          await product.save();
          updateResults.push({
            id: product._id,
            name: product.name,
            oldPrice,
            newPrice: product.price,
            success: true
          });
        }
      } catch (error) {
        updateResults.push({
          id: productUpdate.id,
          success: false,
          error: error.message
        });
      }
    }
    res.json({
      success: true,
      message: 'Bulk price update completed',
      results: updateResults
    });
  } catch (error) {
    console.error('Admin bulk price update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;
    let filter = {};
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    let data;
    let filename;
    switch (type) {
      case 'orders':
        data = await Order.find(filter)
          .populate('user', 'name email')
          .populate('items.product', 'name brand')
          .select('orderNumber user items total status createdAt');
        filename = `orders-export-${Date.now()}.json`;
        break;
      case 'users':
        data = await User.find(filter)
          .select('name email role isActive createdAt');
        filename = `users-export-${Date.now()}.json`;
        break;
      case 'products':
        data = await Product.find(filter)
          .select('name brand category price stock isActive createdAt');
        filename = `products-export-${Date.now()}.json`;
        break;
      case 'builds':
        data = await Build.find(filter)
          .populate('user', 'name email')
          .select('name description user isPublic featured views createdAt');
        filename = `builds-export-${Date.now()}.json`;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type'
        });
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.json({
      success: true,
      exportDate: new Date().toISOString(),
      type,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Admin export error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
module.exports = router;
