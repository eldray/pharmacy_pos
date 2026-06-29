const express = require('express');
const Company = require('../models/Company');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const company = await Company.getCompany();
    res.json(company);
  } catch (err) {
    console.error('Get company error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.put('/', auth, adminAuth, async (req, res) => {
  try {
    let company = await Company.findOne();
    if (!company) {
      company = await Company.create(req.body);
    } else {
      await company.update(req.body);
    }
    res.json(company);
  } catch (err) {
    console.error('Update company error:', err);
    res.status(400).json({ msg: 'Invalid data', error: err.message });
  }
});

module.exports = router;