const express = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');
const { pick } = require('../utils/validators');
const { lockProduct, addStock, deductStock } = require('../utils/stock');

const router = express.Router();
const { numericIdParams } = require('../utils/numericIdParams');

numericIdParams(router);

// `id`, timestamps and `deletedAt` are deliberately absent: a client must not
// be able to rewrite a product's identity or resurrect an archived one.
const EDITABLE_FIELDS = [
  'name', 'description', 'sku', 'barcode', 'category',
  'unitPrice', 'cost', 'packageType', 'dispensingUnit', 'unitsPerPackage',
  'packagePrice', 'sellingPrice', 'insurancePrice', 'allowUnitBreakdown',
  'batchNumber', 'expiryDate', 'supplier', 'schedule',
];

// Get all products.
// Backward-compatible: returns a plain array by default. If a `page` query
// param is present, returns a paginated payload { data, pagination } instead.
router.get('/', auth, async (req, res) => {
  try {
    const order = [['createdAt', 'DESC']];

    if (req.query.page !== undefined) {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
      const { count, rows } = await Product.findAndCountAll({
        order,
        limit,
        offset: (page - 1) * limit,
      });
      return res.json({
        data: rows,
        pagination: { total: count, page, limit, pages: Math.ceil(count / limit) },
      });
    }

    const products = await Product.findAll({ order });
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
    const product = await Product.create({
      ...pick(req.body, EDITABLE_FIELDS),
      quantity: Number.isFinite(Number(req.body.quantity)) ? Math.max(0, Number(req.body.quantity)) : 0,
    });
    await recordAudit(req, { action: 'create', entity: 'Product', entityId: product.id, changes: { after: product.toJSON() } });
    res.status(201).json(product);
  } catch (err) {
    console.error('Create product error:', err);
    res.status(400).json({ msg: 'Invalid data', error: err.message });
  }
});

// Update product
router.put('/:id', auth, adminAuth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const product = await lockProduct(req.params.id, t);
    const before = product.toJSON();

    const updates = pick(req.body, EDITABLE_FIELDS);

    // Stock is moved as a delta on the locked row, never as an absolute write,
    // so a sale that committed while this form was open is not undone.
    const hasQuantity = req.body.quantity !== undefined && req.body.quantity !== null && req.body.quantity !== '';
    const requested = Number(req.body.quantity);
    if (hasQuantity && (!Number.isInteger(requested) || requested < 0)) {
      await t.rollback();
      return res.status(400).json({ msg: 'quantity must be a whole number of units' });
    }
    const delta = hasQuantity ? requested - Number(before.quantity) : 0;
    delete updates.quantity;

    if (Object.keys(updates).length > 0) await product.update(updates, { transaction: t });

    if (delta !== 0) {
      if (delta > 0) await addStock(product.id, delta, { transaction: t });
      else await deductStock(product.id, -delta, { transaction: t });

      const user = await User.findByPk(req.user.userId, { transaction: t });
      await InventoryLog.create({
        productId: product.id,
        productName: product.name,
        type: 'adjustment',
        quantity: delta,
        userId: req.user.userId,
        userName: user?.name || null,
        notes: 'Stock corrected from product edit'
      }, { transaction: t });
    }

    await t.commit();

    const after = await Product.findByPk(product.id);
    await recordAudit(req, {
      action: 'update', entity: 'Product', entityId: product.id,
      changes: { before, after: after.toJSON(), stockDelta: delta }
    });
    res.json(after);
  } catch (err) {
    await t.rollback();
    if (err.status && err.status < 500) {
      return res.status(err.status).json({ msg: err.message });
    }
    console.error('Update product error:', err);
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