const express = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Transaction = require('../models/Transaction');
const InventoryLog = require('../models/InventoryLog');
const User = require('../models/User');
const Company = require('../models/Company');
const { auth, adminAuth } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');
const { createdAtRange } = require('../utils/dateRange');
const { priceCartItems } = require('../utils/pricing');
const { deductStock, addStock } = require('../utils/stock');
const { normalizePaymentMethod } = require('../utils/validators');
const { nextReference } = require('../utils/references');
const { AppError } = require('../utils/errors');

const router = express.Router();
const { numericIdParams } = require('../utils/numericIdParams');

numericIdParams(router);

// GET all transactions with filters
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate, cashierId, paymentMethod } = req.query;
    const where = {};

    if (startDate && endDate) {
      where.createdAt = createdAtRange(startDate, endDate);
    }
    if (cashierId) where.cashierId = cashierId;
    // Rows are stored normalised, so the filter has to be too or a client that
    // asks for 'Cash' silently gets nothing.
    if (paymentMethod) where.paymentMethod = normalizePaymentMethod(paymentMethod);

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

    const todayWhere = { createdAt: { [Op.gte]: today, [Op.lt]: tomorrow } };

    // Sum in SQL instead of loading every row of the month into JS and
    // parseFloat-ing them together.
    const [todayTotal, monthlyTotal, todayCount, monthlyCount, methodRows, recentTransactions] = await Promise.all([
      Transaction.sum('total', { where: todayWhere }),
      Transaction.sum('total', { where: { createdAt: { [Op.gte]: startOfMonth, [Op.lt]: tomorrow } } }),
      Transaction.count({ where: todayWhere }),
      Transaction.count({ where: { createdAt: { [Op.gte]: startOfMonth, [Op.lt]: tomorrow } } }),
      Transaction.findAll({
        where: todayWhere,
        attributes: ['paymentMethod', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['paymentMethod']
      }),
      Transaction.findAll({ where: todayWhere, order: [['createdAt', 'DESC']], limit: 10 })
    ]);

    const paymentMethods = {};
    methodRows.forEach(row => {
      if (row.paymentMethod) paymentMethods[row.paymentMethod] = Number(row.get('count'));
    });

    const todayRevenue = Number(todayTotal) || 0;
    res.json({
      today: {
        total: todayRevenue,
        count: todayCount,
        average: todayCount ? todayRevenue / todayCount : 0
      },
      month: { total: Number(monthlyTotal) || 0, count: monthlyCount },
      paymentMethods,
      recentTransactions
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
      where.createdAt = createdAtRange(startDate, endDate);
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
      where.createdAt = createdAtRange(startDate, endDate);
    }

    const transactions = await Transaction.findAll({ where, order: [['createdAt', 'DESC']] });

    // Aggregate totals + a per-product breakdown, in whole pesewas so repeated
    // float additions don't drift onto a regulatory-facing report.
    const cents = (value) => Math.round((Number(value) || 0) * 100);
    let revenueCents = 0, cogsCents = 0;
    const byProduct = {};

    for (const tx of transactions) {
      // Skip refunds (stored as negative totals) so they don't distort margins.
      if (Number(tx.total) < 0) continue;
      for (const item of tx.items || []) {
        const qty = Number(item.quantity) || 0;
        const lineRevenue = cents(item.total);
        const lineCogs = cents((Number(item.cost) || 0) * qty);
        revenueCents += lineRevenue;
        cogsCents += lineCogs;

        const key = item.product?.name || item.productName || 'Unknown';
        if (!byProduct[key]) byProduct[key] = { productName: key, quantity: 0, revenueCents: 0, cogsCents: 0, profitCents: 0 };
        byProduct[key].quantity += qty;
        byProduct[key].revenueCents += lineRevenue;
        byProduct[key].cogsCents += lineCogs;
        byProduct[key].profitCents += lineRevenue - lineCogs;
      }
    }

    const revenue = revenueCents / 100;
    const cogs = cogsCents / 100;
    const profit = (revenueCents - cogsCents) / 100;
    const margin = revenueCents > 0 ? (profit / revenue) * 100 : 0;

    const products = Object.values(byProduct)
      .map((p) => ({
        productName: p.productName,
        quantity: p.quantity,
        revenue: p.revenueCents / 100,
        cogs: p.cogsCents / 100,
        profit: p.profitCents / 100,
        margin: p.revenueCents > 0 ? ((p.profitCents / p.revenueCents) * 100) : 0
      }))
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
      items, discount = 0,
      paymentMethod, paymentReference,
      customerName, customerPhone, notes
    } = req.body;

    if (!items?.length) {
      await t.rollback();
      return res.status(400).json({ msg: 'No items in cart' });
    }

    const user = await User.findByPk(req.user.userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ msg: 'Cashier not found' });
    }

    // Catalogue-priced totals + per-item cost/schedule snapshots. The client's
    // own subtotal/tax/total are ignored on purpose.
    const priced = await priceCartItems(items, { transaction: t, cartDiscount: discount });
    const transactionNumber = await nextReference('MED', { transaction: t });

    const txRecord = await Transaction.create({
      transactionNumber,
      cashierId: req.user.userId,
      cashierName: user.name,
      items: priced.lines,   // JSONB — stored natively
      subtotal: priced.subtotal,
      tax: priced.tax,
      total: priced.total,
      paymentMethod: normalizePaymentMethod(paymentMethod) || 'cash',
      paymentReference: paymentReference || null,
      discount: priced.discount,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      notes: notes || null
    }, { transaction: t });

    for (const item of priced.lines) {
      const product = await deductStock(item.productId, item.quantity, { transaction: t, allowMissing: true });
      if (!product) {
        console.warn(`Product not found: ${item.productId}`);
        continue;
      }

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
      changes: {
        transactionNumber, total: priced.total,
        paymentMethod: txRecord.paymentMethod, itemCount: priced.lines.length
      }
    });

    res.status(201).json({
      success: true,
      transaction: txRecord,
      receipt: { transaction: txRecord, company, cashier: user.name, date: new Date().toLocaleString() },
      message: 'Payment successful'
    });
  } catch (err) {
    await t.rollback();
    if (err instanceof AppError) {
      console.warn('Payment rejected:', err.message);
      return res.status(err.status).json({ msg: err.message });
    }
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
    const tx = await Transaction.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!tx) {
      await t.rollback();
      return res.status(404).json({ msg: 'Transaction not found' });
    }

    const user = await User.findByPk(req.user.userId, { transaction: t });
    const refundNumber = `REF-${tx.transactionNumber}`;

    // A refund must itself not be refundable, and one sale may only be refunded
    // once — otherwise REF- rows flip revenue back positive and restock twice.
    if (normalizePaymentMethod(tx.paymentMethod) === 'refund') {
      await t.rollback();
      return res.status(400).json({ msg: 'A refund cannot be refunded' });
    }

    const existingRefund = await Transaction.findOne({ where: { transactionNumber: refundNumber }, transaction: t });
    if (existingRefund) {
      await t.rollback();
      return res.status(400).json({ msg: `Already refunded as ${refundNumber}` });
    }

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
      const product = await addStock(item.productId, Number(item.quantity), {
        transaction: t, allowMissing: true
      });
      if (!product) continue;

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
    if (err instanceof AppError) {
      return res.status(err.status).json({ msg: err.message });
    }
    console.error('Refund error:', err);
    res.status(500).json({ msg: 'Refund failed' });
  }
});

module.exports = router;