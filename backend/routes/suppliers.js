// routes/suppliers.js
const express = require('express');
const Supplier = require('../models/Supplier');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all suppliers
router.get('/', auth, async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Create supplier
router.post('/', auth, adminAuth, async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    res.status(201).json(supplier);
  } catch (err) {
    res.status(400).json({ msg: 'Invalid data' });
  }
});

// Update supplier
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!supplier) return res.status(404).json({ msg: 'Supplier not found' });
    res.json(supplier);
  } catch (err) {
    res.status(400).json({ msg: 'Invalid data' });
  }
});

// Delete supplier
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) return res.status(404).json({ msg: 'Supplier not found' });
    res.json({ msg: 'Supplier deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
