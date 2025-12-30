const express = require('express');
const Supplier = require('../models/Supplier');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all suppliers
router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    let where = {};
    
    if (search) {
      const { Op } = require('sequelize');
      where = {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } }
        ]
      };
    }
    
    const suppliers = await Supplier.findAll({
      where,
      order: [['name', 'ASC']]
    });
    res.json(suppliers);
  } catch (err) {
    console.error('Get suppliers error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get supplier by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ msg: 'Supplier not found' });
    }
    res.json(supplier);
  } catch (err) {
    console.error('Get supplier error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Create supplier
router.post('/', auth, adminAuth, async (req, res) => {
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json(supplier);
  } catch (err) {
    console.error('Create supplier error:', err);
    res.status(400).json({ msg: 'Invalid data' });
  }
});

// Update supplier
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ msg: 'Supplier not found' });
    }
    
    await supplier.update(req.body);
    res.json(supplier);
  } catch (err) {
    console.error('Update supplier error:', err);
    res.status(400).json({ msg: 'Invalid data' });
  }
});

// Delete supplier
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ msg: 'Supplier not found' });
    }
    
    await supplier.destroy();
    res.json({ msg: 'Supplier deleted successfully' });
  } catch (err) {
    console.error('Delete supplier error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;