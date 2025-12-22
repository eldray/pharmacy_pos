// routes/purchaseOrders.js (Fixed with better logging)
const express = require('express');
const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all purchase orders
router.get('/', auth, async (req, res) => {
  try {
    const pos = await PurchaseOrder.find().populate('supplierId', 'name email').sort({ createdAt: -1 });
    res.json(pos);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Create purchase order
router.post('/', auth, adminAuth, async (req, res) => {
  try {
    console.log('Received PO data:', JSON.stringify(req.body, null, 2));

    const {
      orderNumber,
      supplierId,
      items,
      totalAmount,
      expectedDeliveryDate,
    } = req.body;

    // Validate required fields
    if (!orderNumber) {
      return res.status(400).json({ msg: 'Order number is required' });
    }
    if (!supplierId) {
      return res.status(400).json({ msg: 'Supplier is required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ msg: 'At least one item is required' });
    }
    if (!expectedDeliveryDate) {
      return res.status(400).json({ msg: 'Expected delivery date is required' });
    }

    // Validate supplier exists
    let supplier;
    if (mongoose.Types.ObjectId.isValid(supplierId)) {
      supplier = await Supplier.findById(supplierId);
    } else {
      // Try to find by name if not a valid ObjectId
      supplier = await Supplier.findOne({ name: supplierId });
    }

    if (!supplier) {
      return res.status(400).json({ msg: 'Supplier not found' });
    }

    // Validate items
    for (let item of items) {
      if (!item.productId || !item.productName || !item.quantity || !item.unitPrice) {
        return res.status(400).json({ msg: 'Invalid item data' });
      }
    }

    const po = new PurchaseOrder({
      orderNumber,
      supplierId: supplier._id, // Use the actual supplier ID
      items,
      totalAmount,
      status: 'pending',
      expectedDeliveryDate,
      orderDate: new Date(),
    });

    await po.save();
    
    // Populate and return
    const populated = await PurchaseOrder.findById(po._id).populate('supplierId', 'name');
    console.log('Created PO successfully:', populated.orderNumber);
    res.status(201).json(populated);
  } catch (err) {
    console.error('PO Creation Error:', err);
    res.status(400).json({ 
      msg: 'Failed to create purchase order',
      error: err.message 
    });
  }
});

// Update purchase order (e.g., mark as received)
// In routes/purchaseOrders.js, update the PUT route:
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    console.log('Updating PO:', {
      id: req.params.id,
      updates: req.body
    });

    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) {
      console.log('PO not found with ID:', req.params.id);
      return res.status(404).json({ msg: 'PO not found' });
    }

    if (req.body.status === 'received') {
      console.log('Marking PO as received, updating inventory...');
      
      // Update inventory for each item
      for (let item of po.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          console.log(`Updating product ${product.name}: ${product.quantity} + ${item.quantity}`);
          
          product.quantity += item.quantity;
          if (item.batchNumber) product.batchNumber = item.batchNumber;
          if (item.expiryDate) product.expiryDate = item.expiryDate;
          
          await product.save();
          console.log(`Product ${product.name} updated to quantity: ${product.quantity}`);

          // Log inflow
          const user = await User.findById(req.user.userId);
          await new InventoryLog({
            productId: item.productId,
            productName: item.productName,
            type: 'inflow',
            quantity: item.quantity,
            reference: po.orderNumber,
            userId: req.user.userId,
            userName: user.name,
            notes: `Received from ${po.supplierId.name}`,
          }).save();
        } else {
          console.log(`Product not found for ID: ${item.productId}`);
        }
      }
    }

    const updatedPO = await PurchaseOrder.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    ).populate('supplierId');
    
    console.log('PO updated successfully:', updatedPO.orderNumber);
    res.json(updatedPO);
  } catch (err) {
    console.error('PO Update Error:', err);
    res.status(400).json({ msg: 'Invalid data' });
  }
});

// Delete PO
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const po = await PurchaseOrder.findByIdAndDelete(req.params.id);
    if (!po) return res.status(404).json({ msg: 'PO not found' });
    res.json({ msg: 'PO deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
