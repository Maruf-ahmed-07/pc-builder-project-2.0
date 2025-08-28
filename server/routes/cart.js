const express = require('express');
const { body, validationResult } = require('express-validator');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Build = require('../models/Build');
const { protect } = require('../middleware/auth');
const router = express.Router();
router.get('/', protect, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product', 'name brand model price images stock isActive')
      .populate({
        path: 'builds.build',
        populate: {
          path: 'components.cpu.product components.gpu.product components.motherboard.product components.ram.product components.storage.product components.powerSupply.product components.case.product',
          select: 'name brand model price images stock isActive'
        }
      });
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [], builds: [] });
    }
    cart.items = cart.items.filter(item => item.product && item.product.isActive);
    cart.calculateTotals();
    await cart.save();
    res.json({
      success: true,
      cart
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.post('/items', protect, [
  body('productId').isMongoId().withMessage('Valid product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
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
    const { productId, quantity } = req.body;
    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or inactive'
      });
    }
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock available'
      });
    }
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [], builds: [] });
    }
    const existingItem = cart.items.find(
      item => item.product.toString() === productId
    );
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (product.stock < newQuantity) {
        return res.status(400).json({
          success: false,
          message: 'Not enough stock for the requested quantity'
        });
      }
      existingItem.quantity = newQuantity;
    } else {
      cart.items.push({
        product: productId,
        quantity,
        price: product.price
      });
    }
    await cart.save();
    await cart.populate('items.product', 'name brand model price images stock');
    res.json({
      success: true,
      message: 'Item added to cart',
      cart
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.put('/items/:productId', protect, [
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be non-negative'),
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
    const { quantity } = req.body;
    const productId = req.params.productId;
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }
    if (quantity === 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      const product = await Product.findById(productId);
      if (!product || product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock available'
        });
      }
      cart.items[itemIndex].quantity = quantity;
      cart.items[itemIndex].price = product.price;
    }
    await cart.save();
    await cart.populate('items.product', 'name brand model price images stock');
    res.json({
      success: true,
      message: 'Cart updated successfully',
      cart
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.delete('/items/:productId', protect, async (req, res) => {
  try {
    const productId = req.params.productId;
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    cart.items = cart.items.filter(
      item => item.product.toString() !== productId
    );
    await cart.save();
    await cart.populate('items.product', 'name brand model price images stock');
    res.json({
      success: true,
      message: 'Item removed from cart',
      cart
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.post('/builds', protect, [
  body('buildId').isMongoId().withMessage('Valid build ID is required'),
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
    const { buildId } = req.body;
    const build = await Build.findById(buildId)
      .populate('components.cpu.product components.gpu.product components.motherboard.product components.ram.product components.storage.product components.powerSupply.product components.case.product components.cooling.product components.accessories.product');
    if (!build) {
      return res.status(404).json({
        success: false,
        message: 'Build not found'
      });
    }
    const canAccess = build.isPublic || build.user.toString() === req.user.id;
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    // Normalize components: each entry may be
    // 1) { product: populatedProduct, quantity? }
    // 2) Array of such objects
    // 3) Direct product snapshot { _id, price, stock, isActive }
    // 4) Plain product ref object with limited fields
    const rawComponents = build.components || {};
    const componentUnits = []; // { productId, quantity }
    for (const [componentType, component] of Object.entries(rawComponents)) {
      if (!component) continue;
      const pushUnit = (unit) => {
        if (!unit) return;
        const prodObj = unit.product || unit; // support direct
        const productId = prodObj && (prodObj._id || prodObj.id);
        if (!productId) return;
        componentUnits.push({
          componentType,
          productId: productId.toString(),
          quantity: unit.quantity || 1,
          prodSnapshot: prodObj
        });
      };
      if (Array.isArray(component)) {
        component.forEach(pushUnit);
      } else {
        pushUnit(component);
      }
    }

    // Fetch any products that lack full info (price, stock, isActive) in one query
    const uniqueProductIds = [...new Set(componentUnits.map(u => u.productId))];
    const productsFromDb = await Product.find({ _id: { $in: uniqueProductIds }, isActive: true });
    const productMap = new Map(productsFromDb.map(p => [p._id.toString(), p]));

    const unavailableComponents = [];
    for (const unit of componentUnits) {
      const dbProd = productMap.get(unit.productId);
      const snap = unit.prodSnapshot;
      const stock = dbProd ? dbProd.stock : snap?.stock; // prefer DB
      const isActive = dbProd ? dbProd.isActive : (snap?.isActive !== false);
      if (!dbProd && !snap) continue;
      if (!isActive || (typeof stock === 'number' && stock < unit.quantity)) {
        unavailableComponents.push(`${unit.componentType}: ${dbProd?.name || snap?.name || unit.productId}`);
      }
    }
    if (unavailableComponents.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some components are unavailable',
        unavailableComponents
      });
    }
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [], builds: [] });
    }
    const existingBuild = cart.builds.find(
      cartBuild => cartBuild.build.toString() === buildId
    );
    if (existingBuild) {
      return res.status(400).json({
        success: false,
        message: 'Build already in cart'
      });
    }
    cart.builds.push({ build: buildId });
    for (const unit of componentUnits) {
      const dbProd = productMap.get(unit.productId);
      if (!dbProd) continue; // skip missing or inactive
      const existingItem = cart.items.find(ci => ci.product.toString() === unit.productId);
      if (existingItem) {
        existingItem.quantity += unit.quantity;
      } else {
        cart.items.push({
          product: unit.productId,
          quantity: unit.quantity,
          price: dbProd.price
        });
      }
    }
    await cart.save();
    await cart.populate('items.product builds.build', 'name brand model price images stock');
    res.json({
      success: true,
      message: 'Build added to cart',
      cart
    });
  } catch (error) {
    console.error('Add build to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.delete('/builds/:buildId', protect, async (req, res) => {
  try {
    const buildId = req.params.buildId;
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    cart.builds = cart.builds.filter(
      cartBuild => cartBuild.build.toString() !== buildId
    );
    await cart.save();
    await cart.populate('items.product builds.build');
    res.json({
      success: true,
      message: 'Build removed from cart',
      cart
    });
  } catch (error) {
    console.error('Remove build from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.delete('/', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    cart.items = [];
    cart.builds = [];
    await cart.save();
    res.json({
      success: true,
      message: 'Cart cleared successfully',
      cart
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
module.exports = router;
