const express = require('express');
const { InsuranceProvider, InsuranceClaim, SalesOrder } = require('../models');
const { auth, adminOrManagerAuth } = require('../middleware/auth');
const { AppError, isClientError, clientMessage } = require('../utils/errors');
const { recordAudit } = require('../utils/audit');
const { nextReference } = require('../utils/references');
const { pick } = require('../utils/validators');

const router = express.Router();
const { numericIdParams } = require('../utils/numericIdParams');

numericIdParams(router);

const PROVIDER_FIELDS = [
  'name', 'code', 'coverageType', 'defaultCopayPercent',
  'contactPerson', 'phone', 'email', 'address', 'status',
];

// A provider's coverage type and copay percent are applied to every sale that
// uses it, so only admin/manager may change them.
function snapshot(instance) {
  return pick(instance.get(), PROVIDER_FIELDS);
}

function moneyField(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new AppError(`${field} must be a non-negative number`, 400);
  }
  return Math.round(n * 100) / 100;
}

// GET all insurance providers
router.get('/providers', auth, async (req, res) => {
  try {
    const providers = await InsuranceProvider.findAll({ order: [['name', 'ASC']] });
    res.json(providers);
  } catch (err) {
    console.error('Fetch providers error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// CREATE insurance provider
router.post('/providers', auth, adminOrManagerAuth, async (req, res) => {
  try {
    const { name, code, coverageType, defaultCopayPercent } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Provider name and code are required' });
    }
    if (coverageType && !['percentage', 'fixed'].includes(coverageType)) {
      return res.status(400).json({ success: false, message: 'coverageType must be percentage or fixed' });
    }
    if (defaultCopayPercent != null && (Number.isNaN(Number(defaultCopayPercent)) || Number(defaultCopayPercent) < 0 || Number(defaultCopayPercent) > 100)) {
      return res.status(400).json({ success: false, message: 'defaultCopayPercent must be between 0 and 100' });
    }

    const provider = await InsuranceProvider.create({
      name,
      code,
      coverageType: coverageType || 'percentage',
      defaultCopayPercent: defaultCopayPercent ?? 20,
      contactPerson: req.body.contactPerson,
      phone: req.body.phone,
      email: req.body.email,
      address: req.body.address
    });
    await recordAudit(req, {
      action: 'create', entity: 'InsuranceProvider', entityId: provider.id,
      changes: pick(req.body, PROVIDER_FIELDS)
    });
    res.status(201).json(provider);
  } catch (err) {
    if (isClientError(err)) {
      return res.status(400).json({ success: false, message: clientMessage(err) });
    }
    console.error('Create provider error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// UPDATE insurance provider
router.put('/providers/:id', auth, adminOrManagerAuth, async (req, res) => {
  try {
    const provider = await InsuranceProvider.findByPk(req.params.id);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }
    const updates = pick(req.body, PROVIDER_FIELDS);

    if (updates.coverageType && !['percentage', 'fixed'].includes(updates.coverageType)) {
      return res.status(400).json({ success: false, message: 'coverageType must be percentage or fixed' });
    }
    if (updates.defaultCopayPercent != null && (Number.isNaN(Number(updates.defaultCopayPercent)) || Number(updates.defaultCopayPercent) < 0 || Number(updates.defaultCopayPercent) > 100)) {
      return res.status(400).json({ success: false, message: 'defaultCopayPercent must be between 0 and 100' });
    }
    if (updates.status && !['active', 'inactive'].includes(updates.status)) {
      return res.status(400).json({ success: false, message: 'status must be active or inactive' });
    }

    const before = snapshot(provider);
    await provider.update(updates);
    await recordAudit(req, {
      action: 'update', entity: 'InsuranceProvider', entityId: provider.id,
      changes: { before, after: snapshot(provider) }
    });

    res.json(provider);
  } catch (err) {
    if (isClientError(err)) {
      return res.status(400).json({ success: false, message: clientMessage(err) });
    }
    console.error('Update provider error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET all insurance claims
router.get('/claims', auth, async (req, res) => {
  try {
    const claims = await InsuranceClaim.findAll({
      include: [
        { model: InsuranceProvider, as: 'provider', attributes: ['id', 'name', 'code'] },
        { model: SalesOrder, as: 'salesOrder', attributes: ['id', 'orderNumber', 'customerName'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(claims);
  } catch (err) {
    console.error('Fetch claims error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// CREATE insurance claim
router.post('/claims', auth, adminOrManagerAuth, async (req, res) => {
  try {
    const { orderId, insuranceProviderId, policyNumber, totalAmount, claimAmount, copayPaid, notes } = req.body;
    if (!insuranceProviderId || !policyNumber || totalAmount == null) {
      return res.status(400).json({ success: false, message: 'Provider, policy number, and total amount are required' });
    }

    const total = moneyField(totalAmount, 'totalAmount');
    const claim = claimAmount == null ? total : moneyField(claimAmount, 'claimAmount');
    const copay = copayPaid == null ? 0 : moneyField(copayPaid, 'copayPaid');
    if (claim + copay > total + 0.005) {
      return res.status(400).json({ success: false, message: 'claimAmount + copayPaid cannot exceed totalAmount' });
    }

    const provider = await InsuranceProvider.findByPk(insuranceProviderId);
    if (!provider) {
      return res.status(400).json({ success: false, message: 'Insurance provider not found' });
    }
    if (orderId) {
      const order = await SalesOrder.findByPk(orderId, { attributes: ['id', 'total'] });
      if (!order) return res.status(400).json({ success: false, message: 'Sales order not found' });
    }

    const created = await InsuranceClaim.create({
      claimNumber: await nextReference('CLM'),
      orderId: orderId || null,
      insuranceProviderId,
      policyNumber,
      totalAmount: total,
      claimAmount: claim,
      copayPaid: copay,
      status: 'pending',
      notes
    });
    await recordAudit(req, {
      action: 'create', entity: 'InsuranceClaim', entityId: created.id,
      changes: { orderId: orderId || null, provider: provider.name, totalAmount: total, claimAmount: claim, copayPaid: copay }
    });

    res.status(201).json(created);
  } catch (err) {
    if (isClientError(err)) {
      return res.status(400).json({ success: false, message: clientMessage(err) });
    }
    console.error('Create claim error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;