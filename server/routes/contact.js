const express = require('express');
const { body, validationResult } = require('express-validator');
const Contact = require('../models/Contact');
const { protect, optionalAuth } = require('../middleware/auth');
const router = express.Router();
router.post('/', optionalAuth, [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('subject').trim().isLength({ min: 5, max: 100 }).withMessage('Subject must be between 5 and 100 characters'),
  body('message').trim().isLength({ min: 10, max: 1000 }).withMessage('Message must be between 10 and 1000 characters'),
  body('category').isIn(['General Inquiry', 'Technical Support', 'Order Support', 'Product Question', 'Feedback', 'Complaint', 'Other']).withMessage('Valid category is required'),
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
    const { name, email, phone, subject, message, category, priority } = req.body;
    const contactData = {
      name,
      email,
      phone,
      subject,
      message,
      category,
      priority: priority || 'Medium'
    };

    if (req.user) {
      contactData.user = req.user.id;
    }
    const contact = await Contact.create(contactData);
    // Return minimal ticket info for client (treat as support ticket)
    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully.',
      ticket: {
        id: contact._id,
        subject: contact.subject,
        category: contact.category,
        status: contact.status,
        priority: contact.priority,
        createdAt: contact.createdAt
      }
    });
  } catch (error) {
    console.error('Submit contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.get('/my-submissions', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const contacts = await Contact.find({ user: req.user.id })
      .populate('responses.respondedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Contact.countDocuments({ user: req.user.id });
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
    console.error('Get user contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.get('/:id', protect, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id)
      .populate('user', 'name email')
      .populate('responses.respondedBy', 'name')
      .populate('assignedTo', 'name');
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    const canAccess = contact.user && contact.user._id.toString() === req.user.id;
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    res.json({
      success: true,
      contact
    });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.post('/:id/response', protect, [
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
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

    const canRespond = contact.user && contact.user._id.toString() === req.user.id;
    if (!canRespond) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    contact.responses.push({
      message: req.body.message,
      respondedBy: req.user.id,
      isInternal: false
    });

    if (contact.status === 'Closed') {
      contact.status = 'Open';
    }
    await contact.save();
    await contact.populate('responses.respondedBy', 'name');
    res.status(201).json({
      success: true,
      message: 'Response added successfully',
      contact
    });
  } catch (error) {
    console.error('Add contact response error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
router.get('/categories/list', (req, res) => {
  const categories = [
    'General Inquiry',
    'Technical Support',
    'Order Support',
    'Product Question',
    'Feedback',
    'Complaint',
    'Other'
  ];
  res.json({
    success: true,
    categories
  });
});
router.get('/faq/list', (req, res) => {
  const faq = [
    {
      id: 1,
      category: 'General',
      question: 'How do I create an account?',
      answer: 'Click on the "Sign Up" button in the top right corner and fill out the registration form with your email and password.'
    },
    {
      id: 2,
      category: 'PC Building',
      question: 'How does the PC builder tool work?',
      answer: 'Our PC builder tool helps you select compatible components step by step. It checks for compatibility issues and calculates power requirements automatically.'
    },
    {
      id: 3,
      category: 'Orders',
      question: 'How can I track my order?',
      answer: 'You can track your order by logging into your account and visiting the "My Orders" section, or by using the tracking number provided in your order confirmation email.'
    },
    {
      id: 4,
      category: 'Shipping',
      question: 'What are your shipping options?',
      answer: 'We offer standard shipping (5-7 business days) and express shipping (2-3 business days). Free shipping is available on orders over $100.'
    },
    {
      id: 5,
      category: 'Returns',
      question: 'What is your return policy?',
      answer: 'We accept returns within 30 days of purchase for unopened items in original packaging. Custom built PCs may have different return terms.'
    },
    {
      id: 6,
      category: 'Technical',
      question: 'Do you provide technical support for builds?',
      answer: 'Yes, we provide technical support for all builds purchased through our platform. You can contact us through the support form or live chat.'
    },
    {
      id: 7,
      category: 'Payment',
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, PayPal, bank transfers, and cash on delivery (where available).'
    },
    {
      id: 8,
      category: 'Community',
      question: 'Can I share my PC build with others?',
      answer: 'Yes! You can make your builds public and share them with the community. Other users can like, comment, and even add your build to their cart.'
    }
  ];
  const category = req.query.category;
  const filteredFaq = category 
    ? faq.filter(item => item.category.toLowerCase() === category.toLowerCase())
    : faq;
  res.json({
    success: true,
    faq: filteredFaq,
    categories: [...new Set(faq.map(item => item.category))]
  });
});
module.exports = router;
