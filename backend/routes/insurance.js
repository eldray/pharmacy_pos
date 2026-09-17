const express = require('express');
const { InsuranceProvider, InsuranceClaim, SalesOrder } = require('../models');
const { auth } = require('../middleware/auth');
const router = express.Router();

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
router.post('/providers', auth, async (req, res) => {
  try {
    const {
      name, code, coverageType, defaultCopayPercent,
      contactPerson, phone, email, address
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Provider name and code are required' });
    }

    const provider = await InsuranceProvider.create({
      name,
      code,
      coverageType: coverageType || 'percentage',
      defaultCopayPercent: defaultCopayPercent ?? 20,
      contactPerson,
      phone,
      email,
      address
    });
    res.status(201).json(provider);
  } catch (err) {
    console.error('Create provider error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// UPDATE insurance provider
router.put('/providers/:id', auth, async (req, res) => {
  try {
    const provider = await InsuranceProvider.findByPk(req.params.id);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }
    const {
      name, code, coverageType, defaultCopayPercent,
      contactPerson, phone, email, address, status
    } = req.body;

    await provider.update({
      name: name ?? provider.name,
      code: code ?? provider.code,
      coverageType: coverageType ?? provider.coverageType,
      defaultCopayPercent: defaultCopayPercent ?? provider.defaultCopayPercent,
      contactPerson: contactPerson ?? provider.contactPerson,
      phone: phone ?? provider.phone,
      email: email ?? provider.email,
      address: address ?? provider.address,
      status: status ?? provider.status,
    });

    res.json(provider);
  } catch (err) {
    console.error('Update provider error:', err);
    res.status(400).json({ success: false, message: err.message || 'Server error' });
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
router.post('/claims', auth, async (req, res) => {
  try {
    const { orderId, insuranceProviderId, policyNumber, totalAmount, claimAmount, copayPaid, notes } = req.body;
    if (!insuranceProviderId || !policyNumber || !totalAmount) {
      return res.status(400).json({ success: false, message: 'Provider, policy number, and total amount are required' });
    }

    const claimNumber = `CLM-${Date.now()}`;
    const claim = await InsuranceClaim.create({
      claimNumber,
      orderId: orderId || null,
      insuranceProviderId,
      policyNumber,
      totalAmount,
      claimAmount,
      copayPaid,
      status: 'pending',
      notes
    });

    res.status(201).json(claim);
  } catch (err) {
    console.error('Create claim error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;