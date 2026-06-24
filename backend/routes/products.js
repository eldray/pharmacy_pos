const express = require('express');
const { Op } = require('sequelize');
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');

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
    await recordAudit(req, { action: 'create', entity: 'Product', entityId: product.id, changes: { after: product.toJSON() } });
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
    const before = product.toJSON();
    await product.update(req.body);
    await recordAudit(req, { action: 'update', entity: 'Product', entityId: product.id, changes: { before, after: product.toJSON() } });
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

    // A product is referenced by history if it appears in any transaction OR
    // has any inventory-log rows (which carry an FK to products). In either
    // case we soft-delete to preserve history and avoid FK violations.
    const Transaction = require('../models/Transaction');
    const InventoryLog = require('../models/InventoryLog');

    const [transactions, inventoryCount] = await Promise.all([
      Transaction.findAll({
        where: { items: { [Op.contains]: [{ productId: product.id }] } },
        limit: 1 // We just need to check if any exist
      }),
      InventoryLog.count({ where: { productId: product.id } }),
    ]);

    if (transactions.length > 0 || inventoryCount > 0) {
      // Soft delete preserves transaction / inventory history.
      await product.destroy(); // This will set deletedAt (soft delete)
      await recordAudit(req, { action: 'archive', entity: 'Product', entityId: product.id, changes: { name: product.name, sku: product.sku } });
      return res.json({
        msg: 'Product archived successfully. It has existing history.',
        archived: true
      });
    }

    // No history at all — safe to hard delete.
    await product.destroy({ force: true }); // Force hard delete
    await recordAudit(req, { action: 'delete', entity: 'Product', entityId: product.id, changes: { name: product.name, sku: product.sku } });
    res.json({ msg: 'Product deleted permanently' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});
module.exports = router;