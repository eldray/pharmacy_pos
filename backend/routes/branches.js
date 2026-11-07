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
const { numericIdParams } = require('../utils/numericIdParams');

numericIdParams(router);

// Kept in step with the Branch model enums; an invalid value must be a 400 with
// a readable message, not a Sequelize validation error surfacing as a 500.
const BRANCH_TYPES = ['branch', 'warehouse'];
const BRANCH_STATUSES = ['active', 'inactive'];

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
  const t = await sequelize.transaction();
  try {
    const { name, code, type, address, phone, email, isMain } = req.body;
    if (!name || !code) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Branch name and code are required' });
    }
    if (type !== undefined && !BRANCH_TYPES.includes(type)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: `Type must be one of: ${BRANCH_TYPES.join(', ')}` });
    }

    // Prevent duplicate code (nice UX message vs raw SQL error)
    const existing = await Branch.findOne({ where: { code }, transaction: t });
    if (existing) {
      await t.rollback();
      return res.status(409).json({ success: false, message: `Branch code "${code}" is already in use` });
    }

    // Exactly one main: demote the others inside this transaction, before the
    // insert, so the partial unique index is never briefly violated.
    if (isMain) await Branch.clearOtherMains(null, t);

    const branch = await Branch.create({ name, code, type, address, phone, email, isMain }, { transaction: t });
    await t.commit();
    await recordAudit(req, {
      action: 'create',
      entity: 'Branch',
      entityId: branch.id,
      changes: { name, code, type },
    });
    res.status(201).json(branch);
  } catch (err) {
    await t.rollback();
    console.error('Create branch error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// UPDATE a branch — admin / manager only
router.put('/:id', auth, adminOrManagerAuth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const branch = await Branch.findByPk(req.params.id, { transaction: t });
    if (!branch) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const { name, code, type, address, phone, email, isMain, status } = req.body;

    if (type !== undefined && !BRANCH_TYPES.includes(type)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: `Type must be one of: ${BRANCH_TYPES.join(', ')}` });
    }
    if (status !== undefined && !BRANCH_STATUSES.includes(status)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: `Status must be one of: ${BRANCH_STATUSES.join(', ')}` });
    }

    if (code && code !== branch.code) {
      const clash = await Branch.findOne({ where: { code }, transaction: t });
      if (clash) {
        await t.rollback();
        return res.status(409).json({ success: false, message: `Branch code "${code}" is already in use` });
      }
    }

    if (isMain === true && !branch.isMain) {
      await Branch.clearOtherMains(branch.id, t);
    } else if (isMain === false && branch.isMain) {
      // Leaving the installation with no home branch breaks stock and sales
      // attribution; the owner has to promote a replacement instead.
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'This is the main branch. Mark another branch as main first.'
      });
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
    }, { transaction: t });

    await t.commit();
    await recordAudit(req, {
      action: 'update',
      entity: 'Branch',
      entityId: branch.id,
      changes: { name: branch.name, code: branch.code },
    });
    res.json(branch);
  } catch (err) {
    await t.rollback();
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
    const fromId = Number(fromBranchId);
    const toId = Number(toBranchId);
    if (!Number.isInteger(fromId) || !Number.isInteger(toId)) {
      return res.status(400).json({ success: false, message: 'Branch ids must be numeric' });
    }
    if (fromId === toId) {
      return res.status(400).json({ success: false, message: 'From and To branches must be different' });
    }
    if (!items?.length) {
      return res.status(400).json({ success: false, message: 'At least one item is required' });
    }

    // Existence checks turn what used to be a raw FK violation (500) into a 400.
    const foundBranches = await Branch.findAll({ where: { id: [fromId, toId] }, attributes: ['id'] });
    if (foundBranches.length !== 2) {
      return res.status(400).json({ success: false, message: 'Source and destination branches must both exist' });
    }

    const productIds = [...new Set(items.map((i) => Number(i.productId)))];
    if (productIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      return res.status(400).json({ success: false, message: 'Each transfer item must have a product' });
    }
    const foundProducts = await Product.findAll({ where: { id: productIds }, attributes: ['id', 'name'] });
    const nameById = new Map(foundProducts.map((p) => [p.id, p.name]));
    const missing = productIds.filter((id) => !nameById.has(id));
    if (missing.length) {
      return res.status(400).json({ success: false, message: `Unknown product id(s): ${missing.join(', ')}` });
    }

    // Validate items; product names come from the DB, never the client payload.
    const cleanedItems = [];
    for (const item of items) {
      const id = Number(item.productId);
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({ success: false, message: 'Quantity must be a whole number greater than 0' });
      }
      cleanedItems.push({
        productId: id,
        productName: nameById.get(id),
        quantity: qty,
      });
    }

    const transferNumber = `TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const transfer = await StockTransfer.create({
      transferNumber,
      fromBranchId: fromId,
      toBranchId: toId,
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

    // Locked: two managers approving at once used to move the stock twice.
    const transfer = await StockTransfer.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
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
        const qty = Number(item.quantity) || 0;

        // Deduct from source BranchInventory — locked, and a shortfall aborts
        // the whole transfer instead of Math.max(0, …) hiding it.
        const sourceInv = await BranchInventory.findOne({
          where: { branchId: transfer.fromBranchId, productId: item.productId },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!sourceInv || Number(sourceInv.quantity) < qty) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: `Source branch has ${sourceInv ? sourceInv.quantity : 0} of product ${item.productId}, needs ${qty}`
          });
        }
        await sourceInv.update({ quantity: Number(sourceInv.quantity) - qty }, { transaction: t });

        // Add to destination BranchInventory (create if missing)
        const [destInv, created] = await BranchInventory.findOrCreate({
          where: { branchId: transfer.toBranchId, productId: item.productId },
          defaults: { quantity: 0, reorderLevel: 10 },
          transaction: t,
        });
        if (!created) await destInv.reload({ transaction: t, lock: t.LOCK.UPDATE });
        await destInv.update({ quantity: Number(destInv.quantity) + qty }, { transaction: t });

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