// routes/products.js
const express = require('express');
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all products
router.get('/', auth, async (req, res) => {
  try {
    const products = await Product.findAll({ order: [['createdAt', 'DESC']] });
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get product by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Create product
router.post('/', auth, adminAuth, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    console.error('Create product error:', err);
    res.status(400).json({ msg: 'Invalid data' });
  }
});

// Update product
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Product not found' });
    
    await product.update(req.body);
    res.json(product);
  } catch (err) {
    res.status(400).json({ msg: 'Invalid data' });
  }
});

// Delete product
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Product not found' });
    
    await product.destroy();
    res.json({ msg: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Search products
router.get('/search/:query', auth, async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const { query } = req.params;
    
    const products = await Product.findAll({
      where: {
        [Op.or]: [
          { barcode: { [Op.like]: `%${query}%` } },
          { name: { [Op.like]: `%${query}%` } },
          { sku: { [Op.like]: `%${query}%` } }
        ]
      }
    });
    
    res.json(products);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;