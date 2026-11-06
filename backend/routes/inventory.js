const express = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const InventoryLog = require('../models/InventoryLog');
const Product = require('../models/Product');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const { createdAtRange } = require('../utils/dateRange');
const { recordAudit } = require('../utils/audit');

const router = express.Router();
const { numericIdParams } = require('../utils/numericIdParams');

numericIdParams(router);

// Get all logs
router.get('/logs', auth, async (req, res) => {
  try {
    const { startDate, endDate, productId } = req.query;
    const where = {};

    if (startDate && endDate) {
      where.createdAt = createdAtRange(startDate, endDate);
    }
    if (productId) where.productId = productId;

    const logs = await InventoryLog.findAll({
      where,
      include: [
        { model: Product, attributes: ['id', 'name', 'sku'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
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
  const t = await sequelize.transaction();
  try {
    const delta = Number(req.body.quantity);
    if (!Number.isInteger(delta) || delta === 0) {
      await t.rollback();
      return res.status(400).json({ msg: 'Adjustment quantity must be a non-zero whole number' });
    }

    // Locked row: a stock-take written over an adjustment in flight used to
    // lose whichever count arrived second.
    const product = await Product.findByPk(req.params.productId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!product) {
      await t.rollback();
      return res.status(404).json({ msg: 'Product not found' });
    }

    const previousQuantity = Number(product.quantity);
    const newQuantity = previousQuantity + delta;
    if (newQuantity < 0) {
      await t.rollback();
      return res.status(400).json({ msg: `Negative stock not allowed. Available: ${previousQuantity}` });
    }

    await product.update({ quantity: newQuantity }, { transaction: t });

    const user = await User.findByPk(req.user.userId, { transaction: t });
    const log = await InventoryLog.create({
      productId: product.id,
      productName: product.name,
      type: 'adjustment',
      quantity: delta,
      userId: req.user.userId,
      userName: user.name,
      notes: req.body.notes
    }, { transaction: t });

    await t.commit();

    await recordAudit(req, {
      action: 'adjust_stock', entity: 'Product', entityId: product.id,
      changes: { sku: product.sku, from: previousQuantity, to: newQuantity, delta, notes: req.body.notes }
    });

    res.json({ product, log });
  } catch (err) {
    await t.rollback();
    console.error('Adjust stock error:', err);
    res.status(400).json({ msg: 'Invalid data', error: err.message });
  }
});

// Get low stock products
router.get('/low-stock', auth, async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold || '10');
    const products = await Product.findAll({
      where: { quantity: { [Op.lte]: threshold } },
      order: [['quantity', 'ASC']]
    });
    res.json(products);
  } catch (err) {
    console.error('Get low stock error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;