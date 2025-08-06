const express = require('express');
const { body, validationResult } = require('express-validator');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const wishlist = await Wishlist.findOne({ user: req.user.id })
      .populate({
        path: 'items.product',
        select: 'name brand price originalPrice image category stock rating'
      })
      .lean();
    if (!wishlist) {
      return res.json({
        success: true,
        items: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0
        }
      });
    }

    const sortedItems = wishlist.items.sort((a, b) => 
      new Date(b.addedAt) - new Date(a.addedAt)
    );

    const paginatedItems = sortedItems.slice(skip, skip + limit);
    const totalItems = wishlist.items.length;
    res.json({
      success: true,
      items: paginatedItems,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems
      }
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.post('/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    let wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) {
      wishlist = new Wishlist({
        user: req.user.id,
        items: []
      });
    }

    const existingItem = wishlist.items.find(item => 
      item.product.toString() === productId
    );
    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    wishlist.items.push({
      product: productId,
      addedAt: new Date()
    });
    await wishlist.save();

    await wishlist.populate({
      path: 'items.product',
      select: 'name brand price originalPrice image category stock rating'
    });
    const newItem = wishlist.items[wishlist.items.length - 1];
    res.status(201).json({
      success: true,
      message: 'Product added to wishlist',
      item: newItem
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.delete('/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;
    const wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    const initialLength = wishlist.items.length;
    wishlist.items = wishlist.items.filter(item => 
      item.product.toString() !== productId
    );
    if (wishlist.items.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in wishlist'
      });
    }
    await wishlist.save();
    res.json({
      success: true,
      message: 'Product removed from wishlist'
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.delete('/', async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }
    wishlist.items = [];
    await wishlist.save();
    res.json({
      success: true,
      message: 'Wishlist cleared successfully'
    });
  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.get('/check/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;
    const wishlist = await Wishlist.findOne({ 
      user: req.user.id,
      'items.product': productId
    });
    res.json({
      success: true,
      inWishlist: !!wishlist
    });
  } catch (error) {
    console.error('Check wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.get('/count', async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id });
    const count = wishlist ? wishlist.items.length : 0;
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Get wishlist count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
module.exports = router;
