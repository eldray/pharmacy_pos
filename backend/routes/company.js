const express = require('express');
const Company = require('../models/Company');
const { auth, adminAuth } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const company = await Company.getCompany();
    res.json(company.toClient());
  } catch (err) {
    console.error('Get company error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.put('/', auth, adminAuth, async (req, res) => {
  try {
    const updates = Company.flattenInput(req.body);
    let company = await Company.findOne();
    if (!company) {
      company = await Company.create(updates);
    } else {
      await company.update(updates);
    }
    await recordAudit(req, { action: 'update', entity: 'Company', entityId: company.id, changes: { updated: updates } });
    res.json(company.toClient());
  } catch (err) {
    console.error('Update company error:', err);
    res.status(400).json({ msg: 'Invalid data', error: err.message });
  }
});

module.exports = router;