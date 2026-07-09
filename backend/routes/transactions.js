const express = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const User = require('../models/User');
const Company = require('../models/Company');
const { auth, adminAuth } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');

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

    const include = [{ model: User, as: 'cashier', attributes: ['id', 'name', 'email'] }];
    const order = [['createdAt', 'DESC']];

    // Optional server-side pagination (backward-compatible: array by default).
    if (req.query.page !== undefined) {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
      const { count, rows } = await Transaction.findAndCountAll({
        where, include, order, limit, offset: (page - 1) * limit,
      });
      return res.json({
        data: rows,
        pagination: { total: count, page, limit, pages: Math.ceil(count / limit) },
      });
    }

    const transactions = await Transaction.findAll({ where, include, order });
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

// GET controlled-substance dispensing report (admin/pharmacist).
// Flattens transaction item snapshots where schedule != 'none' into
// individual dispensing records for regulatory reporting.
router.get('/reports/controlled', auth, async (req, res) => {
  try {
    if (!['admin', 'pharmacist'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Admin or Pharmacist access required' });
    }

    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate && endDate) {
      where.createdAt = { [Op.gte]: new Date(startDate), [Op.lte]: new Date(endDate) };
    }

    const transactions = await Transaction.findAll({ where, order: [['createdAt', 'DESC']] });

    const records = [];
    for (const tx of transactions) {
      for (const item of tx.items || []) {
        if (item.schedule && item.schedule !== 'none') {
          records.push({
            date: tx.createdAt,
            transactionNumber: tx.transactionNumber,
            productName: item.product?.name || item.productName || 'Unknown',
            sku: item.product?.sku || '',
            schedule: item.schedule,
            quantity: item.quantity,
            cashierName: tx.cashierName,
            customerName: tx.customerName || null,
            customerPhone: tx.customerPhone || null,
          });
        }
      }
    }

    res.json({
      data: records,
      summary: {
        totalRecords: records.length,
        totalQuantity: records.reduce((s, r) => s + Number(r.quantity || 0), 0),
      },
    });
  } catch (err) {
    console.error('Controlled report error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET profit / COGS report (admin only).
// Uses the per-item cost snapshot; revenue = sum(item totals), COGS =
// sum(cost * qty), profit = revenue - COGS. Excludes refunds (negative totals).
router.get('/reports/profit', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate && endDate) {
      where.createdAt = { [Op.gte]: new Date(startDate), [Op.lte]: new Date(endDate) };
    }

    const transactions = await Transaction.findAll({ where, order: [['createdAt', 'DESC']] });

    // Aggregate totals + a per-product breakdown.
    let revenue = 0, cogs = 0;
    const byProduct = {};

    for (const tx of transactions) {
      // Skip refunds (stored as negative totals) so they don't distort margins.
      if (Number(tx.total) < 0) continue;
      for (const item of tx.items || []) {
        const qty = Number(item.quantity) || 0;
        const lineRevenue = Number(item.total) || 0;
        const lineCogs = (Number(item.cost) || 0) * qty;
        revenue += lineRevenue;
        cogs += lineCogs;

        const key = item.product?.name || item.productName || 'Unknown';
        if (!byProduct[key]) byProduct[key] = { productName: key, quantity: 0, revenue: 0, cogs: 0, profit: 0 };
        byProduct[key].quantity += qty;
        byProduct[key].revenue += lineRevenue;
        byProduct[key].cogs += lineCogs;
        byProduct[key].profit += lineRevenue - lineCogs;
      }
    }

    const profit = revenue - cogs;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    const products = Object.values(byProduct)
      .map((p) => ({ ...p, margin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0 }))
      .sort((a, b) => b.profit - a.profit);

    res.json({
      summary: {
        revenue: Number(revenue.toFixed(2)),
        cogs: Number(cogs.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        margin: Number(margin.toFixed(2)),
        transactionCount: transactions.length,
      },
      products,
    });
  } catch (err) {
    console.error('Profit report error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
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

    // Capture the schedule AND cost price at time of sale (authoritative from
    // the DB, not the client) so the dispensing + profit reports stay accurate
    // even if a product's schedule or cost changes later.
    const productIds = [...new Set(cleanItems.map(i => i.productId).filter(Boolean))];
    if (productIds.length) {
      const dbProducts = await Product.findAll({
        where: { id: productIds }, attributes: ['id', 'schedule', 'cost'], transaction: t
      });
      const byId = {};
      dbProducts.forEach(p => { byId[String(p.id)] = p; });
      cleanItems.forEach(i => {
        const p = byId[String(i.productId)];
        i.schedule = p?.schedule || 'none';
        i.cost = p ? Number(p.cost) : 0; // unit cost snapshot for COGS
      });
    }

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

    await recordAudit(req, {
      action: 'create', entity: 'Transaction', entityId: txRecord.id,
      changes: { transactionNumber, total, paymentMethod, itemCount: cleanItems.length }
    });

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
    await recordAudit(req, {
      action: 'refund', entity: 'Transaction', entityId: tx.id,
      changes: { originalTransaction: tx.transactionNumber, refundTransaction: refundNumber, amount: tx.total }
    });
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