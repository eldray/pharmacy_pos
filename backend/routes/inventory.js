const express = require('express');
const InventoryLog = require('../models/InventoryLog');
const Product = require('../models/Product');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all logs
router.get('/logs', auth, async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const { startDate, endDate, productId } = req.query;
    
    let where = {};
    
    if (startDate && endDate) {
      where.createdAt = {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate)
      };
    }
    
    if (productId) {
      where.productId = productId;
    }
    
    const logs = await InventoryLog.findAll({
      where,
      include: [
        { 
          model: require('../models/Product'),
          attributes: ['id', 'name', 'sku']
        },
        {
          model: require('../models/User'),
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(logs);
  } catch (err) {
    console.error('Get inventory logs error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Adjust stock
router.post('/adjust/:productId', auth, adminAuth, async (req, res) => {
  try {
    const { quantity, notes } = req.body;
    const product = await Product.findByPk(req.params.productId);
    
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }

    const newQuantity = product.quantity + quantity;
    if (newQuantity < 0) {
      return res.status(400).json({ msg: 'Negative stock not allowed' });
    }

    // Update product quantity
    await product.update({ quantity: newQuantity });

    // Get user info
    const user = await User.findByPk(req.user.userId);
    
    // Create inventory log
    const log = await InventoryLog.create({
      productId: product.id,
      productName: product.name,
      type: 'adjustment',
      quantity,
      userId: req.user.userId,
      userName: user.name,
      notes,
    });

    res.json({ product, log });
  } catch (err) {
    console.error('Adjust stock error:', err);
    res.status(400).json({ msg: 'Invalid data' });
  }
});

// Get low stock products
router.get('/low-stock', auth, async (req, res) => {
  try {
    const { threshold = 10 } = req.query;
    
    const lowStockProducts = await Product.findAll({
      where: {
        quantity: {
          [require('sequelize').Op.lte]: parseInt(threshold)
        }
      },
      order: [['quantity', 'ASC']]
    });
    
    res.json(lowStockProducts);
  } catch (err) {
    console.error('Get low stock error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;