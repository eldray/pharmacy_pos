const express = require('express');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const User = require('../models/User');
const { sequelize } = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');
const { addStock } = require('../utils/stock');
const { pick } = require('../utils/validators');
const { recordAudit } = require('../utils/audit');
const { AppError } = require('../utils/errors');

const router = express.Router();
const { numericIdParams } = require('../utils/numericIdParams');

numericIdParams(router);

// Columns a client may set. orderNumber is excluded: it is unique and already
// referenced by InventoryLog rows.
const EDITABLE_PO_FIELDS = ['supplierId', 'items', 'totalAmount', 'status', 'expectedDeliveryDate', 'deliveryDate', 'notes'];
const RECEIVED_PO_FIELDS = ['status', 'notes', 'deliveryDate'];

// Line totals are summed here so a PO can't be filed with a totalAmount that
// doesn't match its items.
function poTotal(items = []) {
  return items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
}

async function assertProductsExist(items) {
  const ids = [...new Set(items.map((i) => i?.productId).filter(Boolean))];
  const found = await Product.count({ where: { id: ids } });
  if (found !== ids.length) {
    throw new AppError('One or more items reference a product that no longer exists', 400);
  }
}

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
    const { orderNumber, supplierId, items, expectedDeliveryDate, notes } = req.body;

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

    await assertProductsExist(items);

    const po = await PurchaseOrder.create({
      orderNumber,
      supplierId,
      items,           // JSONB — stored directly, no stringify needed
      totalAmount: poTotal(items),
      status: 'pending',
      expectedDeliveryDate: new Date(expectedDeliveryDate),
      notes
    });

    res.status(201).json(po);
  } catch (err) {
    if (err instanceof AppError) return res.status(err.status).json({ msg: err.message });
    console.error('Create PO error:', err);
    res.status(400).json({ msg: 'Failed to create purchase order', error: err.message });
  }
});

// Update purchase order (including mark as received)
router.put('/:id', auth, adminAuth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { status } = req.body;
    const po = await PurchaseOrder.findByPk(req.params.id, {
      include: [Supplier], transaction: t,
      // Lock the order row only: Postgres refuses FOR UPDATE on the nullable side of the supplier join.
      lock: { level: t.LOCK.UPDATE, of: PurchaseOrder }
    });
    if (!po) {
      await t.rollback();
      return res.status(404).json({ msg: 'Purchase order not found' });
    }

    const receivingNow = status === 'received' && po.status !== 'received';

    if (receivingNow) {
      const user = await User.findByPk(req.user.userId, { transaction: t });

      // Crediting stock and flipping the PO to 'received' used to be separate
      // autocommits: a failure halfway left stock credited on a pending PO, so
      // receiving it again credited the goods twice.
      for (const item of po.items) {   // items is already a JS array — JSONB handles it
        const product = await addStock(item.productId, item.quantity, {
          transaction: t,
          allowMissing: true,
          extra: {
            ...(item.batchNumber && { batchNumber: item.batchNumber }),
            ...(item.expiryDate && { expiryDate: item.expiryDate })
          }
        });
        if (!product) {
          console.warn(`Product not found for ID: ${item.productId}`);
          continue;
        }

        await InventoryLog.create({
          productId: item.productId,
          productName: item.productName || product.name,
          type: 'inflow',
          quantity: item.quantity,
          reference: po.orderNumber,
          userId: req.user.userId,
          userName: user.name,
          notes: `Received from ${po.Supplier.name} - PO: ${po.orderNumber}`
        }, { transaction: t });
      }

      req.body.deliveryDate = new Date();
    }

    // Only editable columns — `po.update(req.body)` let a client rewrite
    // orderNumber and the items it just had received. While a PO is being
    // received, the lines that were credited are fixed.
    const editable = po.status === 'received' || receivingNow ? RECEIVED_PO_FIELDS : EDITABLE_PO_FIELDS;
    const changes = pick(req.body, editable);
    if (changes.items) {
      await assertProductsExist(changes.items);
      changes.totalAmount = poTotal(changes.items);
    }

    await po.update(changes, { transaction: t });
    await t.commit();

    await recordAudit(req, {
      action: status === 'received' ? 'receive' : 'update',
      entity: 'PurchaseOrder', entityId: po.id,
      changes: { orderNumber: po.orderNumber, status, totalAmount: po.totalAmount }
    });

    res.json(po);
  } catch (err) {
    await t.rollback();
    if (err instanceof AppError) {
      return res.status(err.status).json({ msg: err.message });
    }
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