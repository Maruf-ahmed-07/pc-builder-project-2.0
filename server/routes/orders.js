const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const router = express.Router();
router.post('/', protect, [
  body('shippingAddress.fullName').trim().notEmpty().withMessage('Shipping name is required'),
  body('shippingAddress.address').trim().notEmpty().withMessage('Shipping address is required'),
  body('shippingAddress.city').trim().notEmpty().withMessage('Shipping city is required'),
  body('shippingAddress.state').trim().notEmpty().withMessage('Shipping state is required'),
  body('shippingAddress.zipCode').trim().notEmpty().withMessage('Shipping zip code is required'),
  body('shippingAddress.country').trim().notEmpty().withMessage('Shipping country is required'),
  body('shippingAddress.phone').trim().notEmpty().withMessage('Phone number is required'),
  body('paymentMethod').isIn(['credit_card', 'paypal', 'cash_on_delivery']).withMessage('Valid payment method is required'),
  body('items').isArray({ min: 1 }).withMessage('Order must have at least one item'),
  body('total').isNumeric().withMessage('Total must be a number'),
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
    const { items, shippingAddress, billingAddress, paymentMethod, paymentDetails, subtotal, tax, shipping, total, notes } = req.body;

    const stockErrors = [];
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        stockErrors.push(`Product not found`);
        continue;
      }
      if (product.stock < item.quantity) {
        stockErrors.push(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
        continue;
      }
      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: item.price
      });
    }
    if (stockErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock validation failed',
        errors: stockErrors
      });
    }

    const date = new Date();
    const dateStr = date.getFullYear().toString() + 
                   (date.getMonth() + 1).toString().padStart(2, '0') + 
                   date.getDate().toString().padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const orderNumber = `ORD-${dateStr}-${randomNum}`;

    const order = new Order({
      user: req.user.id,
      orderNumber,
      items: orderItems,
      shippingAddress,
      billingAddress,
      paymentMethod,
      paymentDetails,
      subtotal,
      tax,
      shipping,
      total,
      notes
    });
    await order.save();

    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } }
      );
    }

    await Cart.findOneAndUpdate(
      { user: req.user.id },
      { $set: { items: [] } }
    );
    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
});
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const orders = await Order.find({ user: req.user.id })
      .populate('items.product', 'name brand images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Order.countDocuments({ user: req.user.id });
    res.json({
      success: true,
      orders,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
});
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name brand images price category')
      .populate('user', 'name email');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }
    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
});
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    if (order.status === 'shipped' || order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel shipped or delivered orders'
      });
    }
    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled'
      });
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = req.body.reason || 'Cancelled by customer';
    await order.save();

    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      );
    }
    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message
    });
  }
});
router.get('/admin/all', protect, async (req, res) => {
  try {

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name brand images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Order.countDocuments(query);
    res.json({
      success: true,
      orders,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
});
router.put('/:id/status', protect, async (req, res) => {
  try {

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }
    const { status, trackingNumber } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    order.status = status;
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }
    if (status === 'delivered') {
      order.deliveredAt = new Date();
    }
    await order.save();
    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
});
router.patch('/:id/cancel', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required'
      });
    }
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = reason.trim();
    await order.save();
    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message
    });
  }
});
router.get('/:id/invoice', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product', 'name brand images price category');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this invoice'
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Invoice not available for cancelled orders'
      });
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${order.orderNumber}.pdf`);

    doc.pipe(res);

    generateInvoicePDF(doc, order);

    doc.end();
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
      error: error.message
    });
  }
});

function generateInvoicePDF(doc, order) {
  const pageHeight = doc.page.height;
  const pageMargin = 50;
  let yPosition = pageMargin;

  doc.fontSize(20)
     .text('PC BUILDER STORE', pageMargin, yPosition);
  yPosition += 25;
  doc.fontSize(10)
     .text('Your one-stop shop for PC components', pageMargin, yPosition);
  yPosition += 40;

  doc.fontSize(20)
     .text('INVOICE', pageMargin, yPosition);
  yPosition += 40;

  doc.fontSize(12)
     .text(`Invoice Number: ${order.orderNumber}`, pageMargin, yPosition);
  yPosition += 20;
  doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, pageMargin, yPosition);
  yPosition += 20;
  doc.text(`Status: ${order.status.toUpperCase()}`, pageMargin, yPosition);
  yPosition += 40;

  const billingY = yPosition;

  doc.text('Bill To:', pageMargin, billingY)
     .fontSize(10);
  let billingYPos = billingY + 20;
  doc.text(order.billingAddress.fullName, pageMargin, billingYPos);
  billingYPos += 15;
  doc.text(order.billingAddress.address, pageMargin, billingYPos);
  billingYPos += 15;
  doc.text(`${order.billingAddress.city}, ${order.billingAddress.state} ${order.billingAddress.zipCode}`, pageMargin, billingYPos);
  billingYPos += 15;
  doc.text(order.billingAddress.country, pageMargin, billingYPos);
  billingYPos += 15;
  doc.text(`Phone: ${order.billingAddress.phone}`, pageMargin, billingYPos);

  doc.fontSize(12)
     .text('Ship To:', 300, billingY)
     .fontSize(10);
  let shippingYPos = billingY + 20;
  doc.text(order.shippingAddress.fullName, 300, shippingYPos);
  shippingYPos += 15;
  doc.text(order.shippingAddress.address, 300, shippingYPos);
  shippingYPos += 15;
  doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}`, 300, shippingYPos);
  shippingYPos += 15;
  doc.text(order.shippingAddress.country, 300, shippingYPos);
  shippingYPos += 15;
  doc.text(`Phone: ${order.shippingAddress.phone}`, 300, shippingYPos);
  yPosition = Math.max(billingYPos, shippingYPos) + 40;

  doc.fontSize(10)
     .text('Item', pageMargin, yPosition)
     .text('Qty', 300, yPosition)
     .text('Price', 350, yPosition)
     .text('Total', 450, yPosition);

  doc.moveTo(pageMargin, yPosition + 15)
     .lineTo(500, yPosition + 15)
     .stroke();
  yPosition += 30;

  order.items.forEach((item, index) => {

    if (yPosition > pageHeight - 200) {
      doc.addPage();
      yPosition = pageMargin;

      doc.fontSize(10)
         .text('Item', pageMargin, yPosition)
         .text('Qty', 300, yPosition)
         .text('Price', 350, yPosition)
         .text('Total', 450, yPosition);
      doc.moveTo(pageMargin, yPosition + 15)
         .lineTo(500, yPosition + 15)
         .stroke();
      yPosition += 30;
    }
    doc.text(item.product.name, pageMargin, yPosition, { width: 220 })
       .text(item.quantity.toString(), 300, yPosition)
       .text(`$${item.price.toFixed(2)}`, 350, yPosition)
       .text(`$${(item.price * item.quantity).toFixed(2)}`, 450, yPosition);
    yPosition += 20;
  });

  yPosition += 10;
  doc.moveTo(300, yPosition)
     .lineTo(500, yPosition)
     .stroke();
  yPosition += 15;
  doc.text('Subtotal:', 350, yPosition)
     .text(`$${order.subtotal.toFixed(2)}`, 450, yPosition);
  yPosition += 15;
  doc.text('Shipping:', 350, yPosition)
     .text(order.shipping === 0 ? 'Free' : `$${order.shipping.toFixed(2)}`, 450, yPosition);
  yPosition += 15;
  doc.text('Tax:', 350, yPosition)
     .text(`$${order.tax.toFixed(2)}`, 450, yPosition);
  yPosition += 15;
  doc.fontSize(12)
     .text('Total:', 350, yPosition)
     .text(`$${order.total.toFixed(2)}`, 450, yPosition);

  yPosition += 30;
  doc.fontSize(10)
     .text(`Payment Method: ${order.paymentMethod.replace('_', ' ').toUpperCase()}`, pageMargin, yPosition);

  yPosition += 40;
  doc.fontSize(8)
     .text('Thank you for your business!', pageMargin, yPosition);
  yPosition += 15;
  doc.text('For support, contact us at support@pcbuilder.com', pageMargin, yPosition);
}
module.exports = router;
