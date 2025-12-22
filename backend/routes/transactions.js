// routes/transactions.js
const express = require('express');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET all transactions
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};
    if (startDate && endDate) {
      query = {
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
      };
    }
    const transactions = await Transaction.find(query)
      .populate('cashierId', 'name')
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// CREATE transaction (PAYMENT)
router.post('/', auth, async (req, res) => {
  try {
    // 1. Get data from frontend
    const {
      items,
      subtotal,
      tax,
      total,
      paymentMethod,
      paymentReference,
      discount,
      customerName,
      customerPhone
    } = req.body;

    // Check if items exist
    if (!items || items.length === 0) {
      return res.status(400).json({ msg: 'No items in cart' });
    }

    // 2. Get cashier
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ msg: 'Cashier not found' });
    }

    // 3. Create unique transaction number
    const transactionNumber = `TXN-${Date.now()}`;

    // 4. Fix item format (in case frontend sends flat or nested)
    const cleanItems = items.map(item => ({
      productId: item.productId,
      product: {
        name: item.product?.name || item.productName || 'Unknown',
        sku: item.product?.sku || item.productSku || '',
        category: item.product?.category || item.productCategory || 'Other'
      },
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
      discount: item.discount || 0
    }));

    // 5. SAVE TRANSACTION FIRST
    const transaction = new Transaction({
      transactionNumber,
      cashierId: req.user.userId,
      cashierName: user.name,
      items: cleanItems,
      subtotal,
      tax,
      total,
      paymentMethod,
      paymentReference,
      discount: discount || 0,
      customerName: customerName || undefined,    // ADD THIS
      customerPhone: customerPhone || undefined  
    });

    await transaction.save();  // This works even without replica set

    // 6. NOW reduce stock one by one
    for (let item of cleanItems) {
      const product = await Product.findById(item.productId);

      if (!product) {
        console.warn(`Product not found: ${item.productId}`);
        continue; // skip this item
      }

      // Check stock
      if (product.quantity < item.quantity) {
        return res.status(400).json({
          msg: `Not enough stock for ${product.name}. Only ${product.quantity} left.`
        });
      }

      // Reduce stock
      product.quantity -= item.quantity;
      await product.save();

      // Log inventory
      await new InventoryLog({
        productId: item.productId,
        productName: product.name,
        type: 'outflow',
        quantity: item.quantity,
        reference: transactionNumber,
        userId: req.user.userId,
        userName: user.name
      }).save();
    }

    // 7. SUCCESS! Send back transaction
    res.status(201).json(transaction);

  } catch (err) {
    console.error('Payment failed:', err.message);
    res.status(500).json({ msg: 'Payment failed. Try again.' });
  }
});

// GET one transaction
router.get('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate('cashierId', 'name');
    if (!transaction) return res.status(404).json({ msg: 'Not found' });
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
