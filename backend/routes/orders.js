const express = require('express');
const { SalesOrder, User, Transaction, InventoryLog, Customer, Branch } = require('../models');
const { auth } = require('../middleware/auth');
const { sequelize } = require('../config/database');
const { createdAtRange } = require('../utils/dateRange');
const { priceCartItems, resolveInsurance, lineStockUnits } = require('../utils/pricing');
const { deductStock } = require('../utils/stock');
const { nextReference } = require('../utils/references');
const { normalizePaymentMethod } = require('../utils/validators');
const { AppError } = require('../utils/errors');
const { recordAudit } = require('../utils/audit');
const router = express.Router();
const { numericIdParams } = require('../utils/numericIdParams');

numericIdParams(router);

// GET today's orders (for Payment Page cashier view)
router.get('/today', auth, async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await SalesOrder.findAll({
      where: {
        createdAt: { [Op.between]: [startOfDay, endOfDay] }
      },
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (err) {
    console.error('Fetch today orders error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET search orders by TRX number, customer name, or phone
router.get('/search', auth, async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const { q = '' } = req.query;
    if (!q.trim()) return res.json([]);

    const orders = await SalesOrder.findAll({
      where: {
        [Op.or]: [
          { orderNumber: { [Op.iLike]: `%${q}%` } },
          { customerName: { [Op.iLike]: `%${q}%` } },
          { customerPhone: { [Op.iLike]: `%${q}%` } },
        ]
      },
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: 30
    });
    res.json(orders);
  } catch (err) {
    console.error('Search orders error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET stats — placed BEFORE /:id routes to avoid route collisions
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { Op } = require('sequelize');
    const where = {};
    if (startDate && endDate) {
      where.createdAt = createdAtRange(startDate, endDate);
    }

    const [total, pending, paid, cancelled] = await Promise.all([
      SalesOrder.count({ where }),
      SalesOrder.count({ where: { ...where, status: 'pending_payment' } }),
      SalesOrder.count({ where: { ...where, status: 'paid' } }),
      SalesOrder.count({ where: { ...where, status: 'cancelled' } }),
    ]);

    const paidOrders = await SalesOrder.findAll({
      where: { ...where, status: 'paid' },
      attributes: ['copayAmount', 'total'],
    });
    const revenue = paidOrders.reduce((sum, o) => sum + Number(o.copayAmount || o.total || 0), 0);

    res.json({ total, pending, paid, cancelled, revenue });
  } catch (err) {
    console.error('Orders stats error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET all sales orders with filters
// GET all sales orders with filters
router.get('/', auth, async (req, res) => {
  try {
    const { status, paymentStatus, startDate, endDate, q, createdById, cashierId } = req.query;
    const { Op } = require('sequelize');
    const where = {};

    // Status filter (explicit)
    if (status && status !== 'all') {
      where.status = status;
    } else if (paymentStatus === 'pending') {
      // Payment page default: only unpaid, not cancelled
      where.status = 'pending_payment';
    } else if (paymentStatus === 'paid') {
      where.status = 'paid';
    }

    if (createdById) where.createdById = createdById;
    if (cashierId) where.cashierId = cashierId;

    if (startDate && endDate) {
      where.createdAt = createdAtRange(startDate, endDate);
    }

    if (q && q.trim()) {
      where[Op.or] = [
        { orderNumber: { [Op.iLike]: `%${q}%` } },
        { customerName: { [Op.iLike]: `%${q}%` } },
        { customerPhone: { [Op.iLike]: `%${q}%` } },
      ];
    }

    const orders = await SalesOrder.findAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name'] },
        { model: User, as: 'cashier', attributes: ['id', 'name'] },
        { model: Customer, as: 'customer', attributes: ['id', 'fullName', 'phone'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(orders);
  } catch (err) {
    console.error('Fetch orders error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// CREATE sales order (Pharmacist / Sales Staff)
router.post('/', auth, async (req, res) => {
  try {
    const {
      items, discount = 0,
      customerId, customerName, customerPhone,
      insuranceProviderId, policyNumber,
      notes, branchId
    } = req.body;

    if (!items?.length) {
      return res.status(400).json({ success: false, message: 'Cart items are required' });
    }

    const user = await User.findByPk(req.user.userId);

    // Prices, VAT and the insurer split are derived from the catalogue and the
    // company settings — a tampered client cannot set its own total.
    const priced = await priceCartItems(items, { cartDiscount: discount });
    const insurance = await resolveInsurance(insuranceProviderId, priced);

    const orderNumber = await nextReference('MED');

    const order = await SalesOrder.create({
      orderNumber,
      branchId: await Branch.resolveBranchId(branchId),
      createdById: req.user.userId,
      createdByName: user ? user.name : 'Staff',
      customerId: customerId || null,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      items: priced.lines,
      subtotal: priced.subtotal,
      tax: priced.tax,
      total: priced.total,
      ...insurance,
      policyNumber: policyNumber || null,
      status: 'pending_payment',
      notes: notes || null
    });

    await recordAudit(req, {
      action: 'create', entity: 'SalesOrder', entityId: order.id,
      changes: {
        orderNumber, total: priced.total, copayAmount: insurance.copayAmount,
        insuranceProviderId: insurance.insuranceProviderId, itemCount: priced.lines.length
      }
    });

    res.status(201).json(order);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    console.error('Create sales order error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// FULFILL / PAY sales order (Cashier)
router.post('/:id/pay', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { paymentMethod, paymentReference } = req.body;

    // Row lock: two tills paying the same order at once used to both pass the
    // "already paid" check and create two transactions.
    const order = await SalesOrder.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });

    if (!order) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status === 'paid') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Order has already been paid' });
    }

    if (order.status === 'cancelled') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Cannot pay a cancelled order' });
    }

    const cashier = await User.findByPk(req.user.userId, { transaction: t });
    const transactionNumber = await nextReference('MED', { transaction: t });

    const transactionRecord = await Transaction.create({
      transactionNumber,
      cashierId: req.user.userId,
      customerId: order.customerId,
      cashierName: cashier ? cashier.name : 'Cashier',
      items: order.items,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.copayAmount || order.total,
      paymentMethod: normalizePaymentMethod(paymentMethod) || 'cash',
      paymentReference: paymentReference || null,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      notes: `Order #${order.orderNumber}`
    }, { transaction: t });

    for (const item of order.items || []) {
      // Locked row + short-stock rejection. This used to clamp to
      // Math.max(0, stock - qty), which hid oversells instead of refusing them.
      const units = lineStockUnits(item);
      const product = await deductStock(item.productId, units, {
        transaction: t, allowMissing: true
      });
      if (!product) {
        console.warn(`Product not found at payment time: ${item.productId}`);
        continue;
      }

      await InventoryLog.create({
        productId: product.id,
        productName: product.name,
        userId: req.user.userId,
        userName: cashier ? cashier.name : 'Cashier',
        type: 'outflow',
        quantity: units,
        reference: transactionNumber,
        notes: `Sales Order #${order.orderNumber}`
      }, { transaction: t });
    }

    order.status = 'paid';
    order.cashierId = req.user.userId;
    order.cashierName = cashier ? cashier.name : 'Cashier';
    await order.save({ transaction: t });

    await t.commit();
    await recordAudit(req, {
      action: 'pay', entity: 'SalesOrder', entityId: order.id,
      changes: { orderNumber: order.orderNumber, transactionNumber, total: transactionRecord.total, paymentMethod }
    });
    res.json({ success: true, transaction: transactionRecord, order });
  } catch (err) {
    await t.rollback();
    if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    console.error('Pay sales order error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// CANCEL sales order (only if not yet paid)
router.post('/:id/cancel', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const order = await SalesOrder.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.status === 'paid') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Cannot cancel a paid order — use refund instead' });
    }
    if (order.status === 'cancelled') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Order is already cancelled' });
    }

    await order.update({ status: 'cancelled' }, { transaction: t });
    await t.commit();

    await recordAudit(req, {
      action: 'cancel',
      entity: 'SalesOrder',
      entityId: order.id,
      changes: { orderNumber: order.orderNumber, previousStatus: 'pending_payment' }
    });

    res.json({ success: true, order });
  } catch (err) {
    await t.rollback();
    console.error('Cancel sales order error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;