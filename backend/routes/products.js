const express = require('express');
const { Op } = require('sequelize');
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all products
router.get('/', auth, async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { deletedAt: null }, // Exclude soft-deleted
      order: [['createdAt', 'DESC']]
    });
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Search products — must be BEFORE /:id to avoid route collision
// Op.iLike: case-insensitive LIKE — PostgreSQL only (Op.like is case-sensitive in PG)
router.get('/search/:query', auth, async (req, res) => {
  try {
    const { query } = req.params;
    const products = await Product.findAll({
      where: {
        deletedAt: null, // Exclude soft-deleted
        [Op.or]: [
          { barcode: { [Op.iLike]: `%${query}%` } },
          { name: { [Op.iLike]: `%${query}%` } },
          { sku: { [Op.iLike]: `%${query}%` } }
        ]
      }
    });
    res.json(products);
  } catch (err) {
    console.error('Search error:', err);
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
    res.status(400).json({ msg: 'Invalid data', error: err.message });
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
    res.status(400).json({ msg: 'Invalid data', error: err.message });
  }
});

// Delete product
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Product not found' });

    // Check if product has transactions
    const Transaction = require('../models/Transaction');
    const transactions = await Transaction.findAll({
      where: {
        items: {
          [Op.contains]: [{ productId: product.id }]
        }
      },
      limit: 1 // We just need to check if any exist
    });

    if (transactions.length > 0) {
      // Instead of preventing deletion, we soft delete
      // This preserves transaction history
      await product.destroy(); // This will set deletedAt (soft delete)
      return res.json({
        msg: 'Product archived successfully. It has existing transactions.',
        archived: true
      });
    }

    // If no transactions, hard delete
    await product.destroy({ force: true }); // Force hard delete
    res.json({ msg: 'Product deleted permanently' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});
module.exports = router;