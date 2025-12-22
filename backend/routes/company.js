// routes/company.js
const express = require('express');
const Company = require('../models/Company');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get company settings
router.get('/', auth, async (req, res) => {
  try {
    const company = await Company.getCompany();
    res.json(company);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update company settings
router.put('/', auth, adminAuth, async (req, res) => {
  try {
    let company = await Company.findOne();
    if (!company) {
      company = new Company(req.body);
    } else {
      company = await Company.findByIdAndUpdate(company._id, req.body, { new: true });
    }
    await company.save();
    res.json(company);
  } catch (err) {
    res.status(400).json({ msg: 'Invalid data' });
  }
});

module.exports = router;
