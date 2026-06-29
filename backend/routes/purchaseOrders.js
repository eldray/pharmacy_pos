const express = require('express');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all purchase orders
router.get('/', auth, async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;

    const pos = await PurchaseOrder.findAll({
      where,
      include: [{ model: Supplier, attributes: ['id', 'name', 'email', 'phone'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(pos);
  } catch (err) {
    console.error('Get purchase orders error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get single purchase order
router.get('/:id', auth, async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id, {
      include: [{ model: Supplier, attributes: ['id', 'name', 'email', 'phone', 'address', 'city'] }]
    });
    if (!po) return res.status(404).json({ msg: 'Purchase order not found' });
    res.json(po);
  } catch (err) {
    console.error('Get PO error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Create purchase order
router.post('/', auth, adminAuth, async (req, res) => {
  try {
    const { orderNumber, supplierId, items, totalAmount, expectedDeliveryDate, notes } = req.body;

    if (!orderNumber) return res.status(400).json({ msg: 'Order number is required' });
    if (!supplierId) return res.status(400).json({ msg: 'Supplier is required' });
    if (!items?.length) return res.status(400).json({ msg: 'At least one item is required' });
    if (!expectedDeliveryDate) return res.status(400).json({ msg: 'Expected delivery date is required' });

    const supplier = await Supplier.findByPk(supplierId);
    if (!supplier) return res.status(400).json({ msg: 'Supplier not found' });

    for (const item of items) {
      if (!item.productId || !item.productName || !item.quantity || !item.unitPrice) {
        return res.status(400).json({ msg: 'Invalid item data' });
      }
    }

    const po = await PurchaseOrder.create({
      orderNumber,
      supplierId,
      items,           // JSONB — stored directly, no stringify needed
      totalAmount,
      status: 'pending',
      expectedDeliveryDate: new Date(expectedDeliveryDate),
      notes
    });

    res.status(201).json(po);
  } catch (err) {
    console.error('Create PO error:', err);
    res.status(400).json({ msg: 'Failed to create purchase order', error: err.message });
  }
});

// Update purchase order (including mark as received)
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const po = await PurchaseOrder.findByPk(req.params.id, { include: [Supplier] });
    if (!po) return res.status(404).json({ msg: 'Purchase order not found' });

    if (status === 'received' && po.status !== 'received') {
      const user = await User.findByPk(req.user.userId);

      for (const item of po.items) {   // items is already a JS array — JSONB handles it
        const product = await Product.findByPk(item.productId);
        if (!product) {
          console.warn(`Product not found for ID: ${item.productId}`);
          continue;
        }

        await product.update({
          quantity: product.quantity + item.quantity,
          ...(item.batchNumber && { batchNumber: item.batchNumber }),
          ...(item.expiryDate && { expiryDate: item.expiryDate })
        });

        await InventoryLog.create({
          productId: item.productId,
          productName: item.productName,
          type: 'inflow',
          quantity: item.quantity,
          reference: po.orderNumber,
          userId: req.user.userId,
          userName: user.name,
          notes: `Received from ${po.Supplier.name} - PO: ${po.orderNumber}`
        });
      }

      req.body.deliveryDate = new Date();
    }

    await po.update(req.body);
    res.json(po);
  } catch (err) {
    console.error('Update PO error:', err);
    res.status(400).json({ msg: 'Invalid data', error: err.message });
  }
});

// Delete purchase order (pending only)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id);
    if (!po) return res.status(404).json({ msg: 'Purchase order not found' });

    if (po.status !== 'pending') {
      return res.status(400).json({ msg: 'Cannot delete received or cancelled orders' });
    }

    await po.destroy();
    res.json({ msg: 'Purchase order deleted successfully' });
  } catch (err) {
    console.error('Delete PO error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;