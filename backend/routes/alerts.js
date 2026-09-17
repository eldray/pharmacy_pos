const express = require('express');
const { Product, ProductBatch, SalesOrder } = require('../models');
const { auth } = require('../middleware/auth');
const { Op } = require('sequelize');
const router = express.Router();

// GET real-time alert count & notification list
router.get('/', auth, async (req, res) => {
  try {
    const today = new Date();
    const sixtyDaysLater = new Date();
    sixtyDaysLater.setDate(today.getDate() + 60);

    // 1. Pending Sales Orders count
    const pendingOrdersCount = await SalesOrder.count({
      where: { status: 'pending_payment' }
    });

    // 2. Low Stock Products
    const lowStockProducts = await Product.findAll({
      where: {
        quantity: { [Op.lte]: 15 }
      },
      attributes: ['id', 'name', 'quantity', 'category'],
      limit: 10
    });

    // 3. Near-Expiry Batches (expiring in next 60 days)
    const expiringBatches = await ProductBatch.findAll({
      where: {
        expiryDate: {
          [Op.gte]: today,
          [Op.lte]: sixtyDaysLater
        },
        status: 'active',
        quantity: { [Op.gt]: 0 }
      },
      include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
      order: [['expiryDate', 'ASC']],
      limit: 10
    });

    const notifications = [
      ...lowStockProducts.map(p => ({
        id: `low-stock-${p.id}`,
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${p.name} has only ${p.quantity} units left in stock.`,
        timestamp: new Date().toISOString()
      })),
      ...expiringBatches.map(b => ({
        id: `expiring-${b.id}`,
        type: 'danger',
        title: 'Expiring Drug Batch',
        message: `${b.product?.name || 'Medication'} (Batch: ${b.batchNumber}) expires on ${b.expiryDate}.`,
        timestamp: new Date().toISOString()
      }))
    ];

    if (pendingOrdersCount > 0) {
      notifications.unshift({
        id: 'pending-orders-alert',
        type: 'info',
        title: 'Pending Sales Orders',
        message: `${pendingOrdersCount} prescription order(s) waiting in Cashier queue.`,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      totalAlerts: notifications.length,
      pendingOrdersCount,
      notifications
    });
  } catch (err) {
    console.error('Fetch alerts error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
