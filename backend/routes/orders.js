const express = require('express');
const { SalesOrder, User, Branch, InsuranceProvider, Transaction, Product, InventoryLog, Customer } = require('../models');
const { auth } = require('../middleware/auth');
const { sequelize } = require('../config/database');
const router = express.Router();

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
      where.createdAt = { [Op.gte]: new Date(startDate), [Op.lte]: new Date(endDate) };
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
      where.createdAt = {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate),
      };
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
      items, subtotal, tax, total,
      customerId, customerName, customerPhone,
      insuranceProviderId, insuranceProviderName, policyNumber,
      insuranceCoverage = 0, copayAmount = 0, notes, branchId
    } = req.body;

    if (!items?.length) {
      return res.status(400).json({ success: false, message: 'Cart items are required' });
    }

    const user = await User.findByPk(req.user.userId);
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const order = await SalesOrder.create({
      orderNumber,
      branchId: branchId || null,
      createdById: req.user.userId,
      createdByName: user ? user.name : 'Staff',
      customerId: customerId || null,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      items,
      subtotal,
      tax,
      total,
      insuranceProviderId: insuranceProviderId || null,
      insuranceProviderName: insuranceProviderName || null,
      policyNumber: policyNumber || null,
      insuranceCoverage,
      copayAmount: copayAmount || total,
      status: 'pending_payment',
      notes: notes || null
    });

    res.status(201).json(order);
  } catch (err) {
    console.error('Create sales order error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// FULFILL / PAY sales order (Cashier)
router.post('/:id/pay', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { paymentMethod, paymentReference } = req.body;
    const order = await SalesOrder.findByPk(req.params.id, { transaction: t });

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
    const transactionNumber = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const transactionRecord = await Transaction.create({
      transactionNumber,
      cashierId: req.user.userId,
      customerId: order.customerId,
      cashierName: cashier ? cashier.name : 'Cashier',
      items: order.items,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.copayAmount || order.total,
      paymentMethod: paymentMethod || 'Cash',
      paymentReference: paymentReference || null,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      notes: `Order #${order.orderNumber}`
    }, { transaction: t });

    for (const item of order.items || []) {
      const product = await Product.findByPk(item.productId, { transaction: t });
      if (product) {
        const previousStock = product.quantity;
        const newStock = Math.max(0, previousStock - Number(item.quantity));

        await product.update({ quantity: newStock }, { transaction: t });

        await InventoryLog.create({
          productId: product.id,
          userId: req.user.userId,
          type: 'SALE',
          quantityChange: -Number(item.quantity),
          previousQuantity: previousStock,
          newQuantity: newStock,
          reason: `Sales Order #${order.orderNumber}`
        }, { transaction: t });
      }
    }

    order.status = 'paid';
    order.cashierId = req.user.userId;
    order.cashierName = cashier ? cashier.name : 'Cashier';
    await order.save({ transaction: t });

    await t.commit();
    res.json({ success: true, transaction: transactionRecord, order });
  } catch (err) {
    await t.rollback();
    console.error('Pay sales order error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// CANCEL sales order (only if not yet paid)
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const order = await SalesOrder.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a paid order — use refund instead' });
    }
    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Order is already cancelled' });
    }

    await order.update({ status: 'cancelled' });

    const { recordAudit } = require('../utils/audit');
    await recordAudit(req, {
      action: 'cancel',
      entity: 'SalesOrder',
      entityId: order.id,
      changes: { orderNumber: order.orderNumber, previousStatus: 'pending_payment' }
    });

    res.json({ success: true, order });
  } catch (err) {
    console.error('Cancel sales order error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;