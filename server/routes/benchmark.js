const express = require('express');
const Product = require('../models/Product');
const Build = require('../models/Build');
const { protect, optionalAuth } = require('../middleware/auth');
const { scoreBuild } = require('../utils/benchmarkScore');
const router = express.Router();

// POST /api/benchmark/score
// Body options:
//   { buildId: "..." }
// or { products: ["productId1", "productId2", ...] }
// or { components: { cpu: { product: id }, gpu: { product: id }, ... } }
router.post('/score', optionalAuth, async (req, res) => {
  try {
    let productIds = [];
    if (req.body.buildId) {
      const build = await Build.findById(req.body.buildId);
      if (!build) return res.status(404).json({ success: false, message: 'Build not found' });
      if (req.user && build.user.toString() !== req.user.id) {
        // Only owner can score private build
        if (!build.isPublic) return res.status(403).json({ success: false, message: 'Access denied' });
      }
      const comps = build.components || {};
      for (const key of Object.keys(comps)) {
        if (comps[key] && comps[key].product) productIds.push(comps[key].product);
      }
    } else if (Array.isArray(req.body.products)) {
      productIds = req.body.products.slice(0, 30); // limit
    } else if (req.body.components && typeof req.body.components === 'object') {
      for (const k of Object.keys(req.body.components)) {
        const c = req.body.components[k];
        if (c && c.product) productIds.push(c.product);
      }
    } else {
      return res.status(400).json({ success: false, message: 'No buildId, products, or components provided' });
    }
    productIds = [...new Set(productIds)];
    if (!productIds.length) return res.status(400).json({ success: false, message: 'No products to score' });
    const products = await Product.find({ _id: { $in: productIds } });
    if (!products.length) return res.status(404).json({ success: false, message: 'Products not found' });
    const result = scoreBuild(products.map(p => p.toObject()));
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Benchmark score error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
