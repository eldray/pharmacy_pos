const express = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const User = require('../models/User');
const Company = require('../models/Company');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// GET all transactions with filters
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate, cashierId, paymentMethod } = req.query;
    const where = {};

    if (startDate && endDate) {
      where.createdAt = { [Op.gte]: new Date(startDate), [Op.lte]: new Date(endDate) };
    }
    if (cashierId) where.cashierId = cashierId;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    const transactions = await Transaction.findAll({
      where,
      include: [{ model: User, as: 'cashier', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(transactions);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET summary (dashboard)
router.get('/summary', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayTx, monthlyTx] = await Promise.all([
      Transaction.findAll({ where: { createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } } }),
      Transaction.findAll({ where: { createdAt: { [Op.gte]: startOfMonth, [Op.lt]: tomorrow } } })
    ]);

    const todayTotal = todayTx.reduce((s, t) => s + parseFloat(t.total), 0);
    const monthlyTotal = monthlyTx.reduce((s, t) => s + parseFloat(t.total), 0);

    const paymentMethods = {};
    todayTx.forEach(t => {
      paymentMethods[t.paymentMethod] = (paymentMethods[t.paymentMethod] || 0) + 1;
    });

    res.json({
      today: { total: todayTotal, count: todayTx.length, average: todayTx.length ? todayTotal / todayTx.length : 0 },
      month: { total: monthlyTotal, count: monthlyTx.length },
      paymentMethods,
      recentTransactions: todayTx.slice(0, 10)
    });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET one transaction
router.get('/:id', auth, async (req, res) => {
  try {
    const tx = await Transaction.findByPk(req.params.id, {
      include: [{ model: User, as: 'cashier', attributes: ['id', 'name', 'email'] }]
    });
    if (!tx) return res.status(404).json({ msg: 'Transaction not found' });

    const company = await Company.getCompany();
    res.json({
      transaction: tx,
      company,
      receipt: {
        id: tx.id,
        number: tx.transactionNumber,
        date: tx.createdAt.toLocaleString(),
        cashier: tx.cashierName,
        items: tx.items,
        subtotal: tx.subtotal,
        tax: tx.tax,
        total: tx.total,
        paymentMethod: tx.paymentMethod,
        customer: tx.customerName
      }
    });
  } catch (err) {
    console.error('Get transaction error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// CREATE transaction (PAYMENT)
router.post('/', auth, async (req, res) => {
  // Use sequelize instance imported from database.js — NOT require('sequelize').transaction()
  const t = await sequelize.transaction();

  try {
    const {
      items, subtotal, tax, total,
      paymentMethod, paymentReference,
      discount = 0, customerName, customerPhone, notes
    } = req.body;

    if (!items?.length) {
      await t.rollback();
      return res.status(400).json({ msg: 'No items in cart' });
    }

    const user = await User.findByPk(req.user.userId);
    if (!user) {
      await t.rollback();
      return res.status(404).json({ msg: 'Cashier not found' });
    }

    const transactionNumber = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const cleanItems = items.map(item => ({
      productId: item.productId,
      product: {
        name: item.product?.name || item.productName || 'Unknown',
        sku: item.product?.sku || item.productSku || '',
        category: item.product?.category || item.productCategory || 'Other'
      },
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
      discount: item.discount || 0
    }));

    const txRecord = await Transaction.create({
      transactionNumber,
      cashierId: req.user.userId,
      cashierName: user.name,
      items: cleanItems,   // JSONB — stored natively
      subtotal, tax, total,
      paymentMethod, paymentReference,
      discount,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      notes: notes || null
    }, { transaction: t });

    for (const item of cleanItems) {
      const product = await Product.findByPk(item.productId, { transaction: t });
      if (!product) {
        console.warn(`Product not found: ${item.productId}`);
        continue;
      }

      if (product.quantity < item.quantity) {
        await t.rollback();
        return res.status(400).json({
          msg: `Not enough stock for ${product.name}. Available: ${product.quantity}`
        });
      }

      await product.update({ quantity: product.quantity - item.quantity }, { transaction: t });

      await InventoryLog.create({
        productId: item.productId,
        productName: product.name,
        type: 'outflow',
        quantity: item.quantity,
        reference: transactionNumber,
        userId: req.user.userId,
        userName: user.name,
        notes: `Sold to ${customerName || 'Customer'}`
      }, { transaction: t });
    }

    const company = await Company.getCompany();
    await t.commit();

    res.status(201).json({
      success: true,
      transaction: txRecord,
      receipt: { transaction: txRecord, company, cashier: user.name, date: new Date().toLocaleString() },
      message: 'Payment successful'
    });
  } catch (err) {
    await t.rollback();
    console.error('Payment failed:', err.message);
    res.status(500).json({
      msg: 'Payment failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// REFUND
router.post('/:id/refund', auth, adminAuth, async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const tx = await Transaction.findByPk(req.params.id);
    if (!tx) {
      await t.rollback();
      return res.status(404).json({ msg: 'Transaction not found' });
    }

    const user = await User.findByPk(req.user.userId);
    const refundNumber = `REF-${tx.transactionNumber}`;

    const refundTx = await Transaction.create({
      transactionNumber: refundNumber,
      cashierId: req.user.userId,
      cashierName: user.name,
      items: tx.items.map(i => ({ ...i, quantity: -i.quantity, total: -i.total })),
      subtotal: -tx.subtotal,
      tax: -tx.tax,
      total: -tx.total,
      paymentMethod: 'refund',
      paymentReference: `Refund for ${tx.transactionNumber}`,
      notes: `Refund of transaction ${tx.transactionNumber}`
    }, { transaction: t });

    for (const item of tx.items) {
      const product = await Product.findByPk(item.productId, { transaction: t });
      if (!product) continue;

      await product.update({ quantity: product.quantity + item.quantity }, { transaction: t });

      await InventoryLog.create({
        productId: item.productId,
        productName: item.product?.name || item.productName || product.name,
        type: 'inflow',
        quantity: item.quantity,
        reference: refundNumber,
        userId: req.user.userId,
        userName: user.name,
        notes: `Refund for transaction ${tx.transactionNumber}`
      }, { transaction: t });
    }

    await t.commit();
    res.json({
      success: true,
      message: 'Refund processed successfully',
      originalTransaction: tx.transactionNumber,
      refundTransaction: refundNumber
    });
  } catch (err) {
    await t.rollback();
    console.error('Refund error:', err);
    res.status(500).json({ msg: 'Refund failed' });
  }
});

module.exports = router;