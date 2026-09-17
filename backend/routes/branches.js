// backend/routes/branches.js
const express = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const {
  Branch,
  BranchInventory,
  StockTransfer,
  Product,
  User,
  InventoryLog,
} = require('../models');
const {
  auth,
  adminAuth,
  adminOrManagerAuth,
  pharmacistAuth,
} = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════
// BRANCHES
// ═══════════════════════════════════════════════════════════════════

// GET all branches — everyone can view
router.get('/', auth, async (req, res) => {
  try {
    const branches = await Branch.findAll({ order: [['id', 'ASC']] });
    res.json(branches);
  } catch (err) {
    console.error('Fetch branches error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// CREATE a branch — admin / manager only
router.post('/', auth, adminOrManagerAuth, async (req, res) => {
  try {
    const { name, code, type, address, phone, email, isMain } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Branch name and code are required' });
    }

    // Prevent duplicate code (nice UX message vs raw SQL error)
    const existing = await Branch.findOne({ where: { code } });
    if (existing) {
      return res.status(409).json({ success: false, message: `Branch code "${code}" is already in use` });
    }

    const branch = await Branch.create({ name, code, type, address, phone, email, isMain });
    await recordAudit(req, {
      action: 'create',
      entity: 'Branch',
      entityId: branch.id,
      changes: { name, code, type },
    });
    res.status(201).json(branch);
  } catch (err) {
    console.error('Create branch error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// UPDATE a branch — admin / manager only
router.put('/:id', auth, adminOrManagerAuth, async (req, res) => {
  try {
    const branch = await Branch.findByPk(req.params.id);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });

    const { name, code, type, address, phone, email, isMain, status } = req.body;

    if (code && code !== branch.code) {
      const clash = await Branch.findOne({ where: { code } });
      if (clash) {
        return res.status(409).json({ success: false, message: `Branch code "${code}" is already in use` });
      }
    }

    await branch.update({
      name: name ?? branch.name,
      code: code ?? branch.code,
      type: type ?? branch.type,
      address: address ?? branch.address,
      phone: phone ?? branch.phone,
      email: email ?? branch.email,
      isMain: isMain ?? branch.isMain,
      status: status ?? branch.status,
    });

    await recordAudit(req, {
      action: 'update',
      entity: 'Branch',
      entityId: branch.id,
      changes: { name: branch.name, code: branch.code },
    });
    res.json(branch);
  } catch (err) {
    console.error('Update branch error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// STOCK TRANSFERS
// ═══════════════════════════════════════════════════════════════════

// GET all transfers — everyone can view
router.get('/transfers', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;

    const transfers = await StockTransfer.findAll({
      where,
      include: [
        { model: Branch, as: 'fromBranch', attributes: ['id', 'name', 'code'] },
        { model: Branch, as: 'toBranch', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'requester', attributes: ['id', 'name'] },
        { model: User, as: 'approver', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(transfers);
  } catch (err) {
    console.error('Fetch transfers error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET one transfer
router.get('/transfers/:id', auth, async (req, res) => {
  try {
    const transfer = await StockTransfer.findByPk(req.params.id, {
      include: [
        { model: Branch, as: 'fromBranch', attributes: ['id', 'name', 'code'] },
        { model: Branch, as: 'toBranch', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'requester', attributes: ['id', 'name'] },
        { model: User, as: 'approver', attributes: ['id', 'name'] },
      ],
    });
    if (!transfer) return res.status(404).json({ success: false, message: 'Transfer not found' });
    res.json(transfer);
  } catch (err) {
    console.error('Get transfer error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// CREATE a stock transfer — admin / manager / pharmacist can create
router.post('/transfers', auth, pharmacistAuth, async (req, res) => {
  try {
    const { fromBranchId, toBranchId, items, notes } = req.body;

    if (!fromBranchId || !toBranchId) {
      return res.status(400).json({ success: false, message: 'From and To branches are required' });
    }
    if (Number(fromBranchId) === Number(toBranchId)) {
      return res.status(400).json({ success: false, message: 'From and To branches must be different' });
    }
    if (!items?.length) {
      return res.status(400).json({ success: false, message: 'At least one item is required' });
    }

    // Validate items
    const cleanedItems = [];
    for (const item of items) {
      if (!item.productId) {
        return res.status(400).json({ success: false, message: 'Each transfer item must have a product' });
      }
      const qty = Number(item.quantity);
      if (!qty || qty <= 0) {
        return res.status(400).json({ success: false, message: 'Quantity must be greater than 0' });
      }
      cleanedItems.push({
        productId: Number(item.productId),
        productName: item.productName || null,
        quantity: qty,
      });
    }

    const transferNumber = `TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const transfer = await StockTransfer.create({
      transferNumber,
      fromBranchId,
      toBranchId,
      requestedById: req.user.userId,
      status: 'pending',
      items: cleanedItems,
      notes: notes || null,
    });

    await recordAudit(req, {
      action: 'create',
      entity: 'StockTransfer',
      entityId: transfer.id,
      changes: { transferNumber, fromBranchId, toBranchId, itemCount: cleanedItems.length },
    });

    const full = await StockTransfer.findByPk(transfer.id, {
      include: [
        { model: Branch, as: 'fromBranch', attributes: ['id', 'name', 'code'] },
        { model: Branch, as: 'toBranch', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'requester', attributes: ['id', 'name'] },
      ],
    });
    res.status(201).json(full);
  } catch (err) {
    console.error('Create transfer error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// APPROVE / REJECT / MARK IN-TRANSIT — admin / manager only
router.put('/transfers/:id/status', auth, adminOrManagerAuth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { status } = req.body;
    const VALID = ['pending', 'in_transit', 'completed', 'rejected'];
    if (!VALID.includes(status)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: `Status must be one of: ${VALID.join(', ')}` });
    }

    const transfer = await StockTransfer.findByPk(req.params.id, { transaction: t });
    if (!transfer) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Transfer not found' });
    }

    // Guard against invalid transitions
    if (transfer.status === 'completed') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Completed transfers cannot be changed' });
    }
    if (transfer.status === 'rejected') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Rejected transfers cannot be changed' });
    }

    // When completing a transfer, move the stock
    if (status === 'completed' && transfer.status !== 'completed') {
      for (const item of transfer.items || []) {
        // Deduct from source BranchInventory
        const sourceInv = await BranchInventory.findOne({
          where: { branchId: transfer.fromBranchId, productId: item.productId },
          transaction: t,
        });
        if (sourceInv) {
          const newQty = Math.max(0, sourceInv.quantity - item.quantity);
          await sourceInv.update({ quantity: newQty }, { transaction: t });
        }

        // Add to destination BranchInventory (create if missing)
        const [destInv, created] = await BranchInventory.findOrCreate({
          where: { branchId: transfer.toBranchId, productId: item.productId },
          defaults: { quantity: 0, reorderLevel: 10 },
          transaction: t,
        });
        await destInv.update({ quantity: destInv.quantity + item.quantity }, { transaction: t });

        // Inventory log for audit
        await InventoryLog.create({
          productId: item.productId,
          productName: item.productName || `Product #${item.productId}`,
          type: 'adjustment',
          quantity: item.quantity,
          reference: transfer.transferNumber,
          userId: req.user.userId,
          userName: 'Transfer',
          notes: `Transfer from branch ${transfer.fromBranchId} to ${transfer.toBranchId}`,
        }, { transaction: t });
      }
    }

    transfer.status = status;
    transfer.approvedById = req.user.userId;
    await transfer.save({ transaction: t });

    await t.commit();

    await recordAudit(req, {
      action: 'update_status',
      entity: 'StockTransfer',
      entityId: transfer.id,
      changes: { transferNumber: transfer.transferNumber, newStatus: status },
    });

    const full = await StockTransfer.findByPk(transfer.id, {
      include: [
        { model: Branch, as: 'fromBranch', attributes: ['id', 'name', 'code'] },
        { model: Branch, as: 'toBranch', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'requester', attributes: ['id', 'name'] },
        { model: User, as: 'approver', attributes: ['id', 'name'] },
      ],
    });
    res.json(full);
  } catch (err) {
    await t.rollback();
    console.error('Update transfer error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

module.exports = router;