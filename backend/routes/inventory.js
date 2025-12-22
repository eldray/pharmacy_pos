// routes/inventory.js
const express = require('express');
const InventoryLog = require('../models/InventoryLog');
const Product = require('../models/Product');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all logs
router.get('/logs', auth, async (req, res) => {
  try {
    const logs = await InventoryLog.find().populate('productId', 'name').populate('userId', 'name').sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Adjust stock
router.post('/adjust/:productId', auth, adminAuth, async (req, res) => {
  try {
    const { quantity, notes } = req.body;
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ msg: 'Product not found' });

    const newQuantity = product.quantity + quantity;
    if (newQuantity < 0) return res.status(400).json({ msg: 'Negative stock not allowed' });

    product.quantity = newQuantity;
    await product.save();

    const user = await User.findById(req.user.userId);
    const log = new InventoryLog({
      productId: req.params.productId,
      productName: product.name,
      type: 'adjustment',
      quantity,
      userId: req.user.userId,
      userName: user.name,
      notes,
    });
    await log.save();

    res.json({ product, log });
  } catch (err) {
    res.status(400).json({ msg: 'Invalid data' });
  }
});

module.exports = router;
