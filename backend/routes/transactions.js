const express = require('express');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const User = require('../models/User');
const Company = require('../models/Company');
const { auth,adminAuth } = require('../middleware/auth');

const router = express.Router();

// GET all transactions with filters
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate, cashierId, paymentMethod } = req.query;
    let where = {};
    
    if (startDate && endDate) {
      const { Op } = require('sequelize');
      where.createdAt = {
        [Op.gte]: new Date(startDate),
        [Op.lte]: new Date(endDate)
      };
    }
    
    if (cashierId) {
      where.cashierId = cashierId;
    }
    
    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }
    
    const transactions = await Transaction.findAll({
      where,
      include: [
        {
          model: User,
          as: 'cashier',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(transactions);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET transaction summary (for dashboard)
router.get('/summary', auth, async (req, res) => {
  try {
    const { Op } = require('sequelize');
    
    // Today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Today's transactions
    const todayTransactions = await Transaction.findAll({
      where: {
        createdAt: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    });
    
    // Calculate totals
    const todayTotal = todayTransactions.reduce((sum, t) => sum + parseFloat(t.total), 0);
    const todayCount = todayTransactions.length;
    
    // Monthly summary
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyTransactions = await Transaction.findAll({
      where: {
        createdAt: {
          [Op.gte]: startOfMonth,
          [Op.lt]: tomorrow
        }
      }
    });
    
    const monthlyTotal = monthlyTransactions.reduce((sum, t) => sum + parseFloat(t.total), 0);
    
    // Payment method breakdown
    const paymentMethods = {};
    todayTransactions.forEach(t => {
      paymentMethods[t.paymentMethod] = (paymentMethods[t.paymentMethod] || 0) + 1;
    });
    
    res.json({
      today: {
        total: todayTotal,
        count: todayCount,
        average: todayCount > 0 ? todayTotal / todayCount : 0
      },
      month: {
        total: monthlyTotal,
        count: monthlyTransactions.length
      },
      paymentMethods,
      recentTransactions: todayTransactions.slice(0, 10)
    });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// CREATE transaction (PAYMENT)
router.post('/', auth, async (req, res) => {
  const transaction = await require('sequelize').transaction();
  
  try {
    const {
      items,
      subtotal,
      tax,
      total,
      paymentMethod,
      paymentReference,
      discount = 0,
      customerName,
      customerPhone,
      notes
    } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ msg: 'No items in cart' });
    }

    // Get cashier info
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ msg: 'Cashier not found' });
    }

    // Generate transaction number
    const transactionNumber = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Format items
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

    // Create transaction
    const transactionRecord = await Transaction.create({
      transactionNumber,
      cashierId: req.user.userId,
      cashierName: user.name,
      items: cleanItems,
      subtotal,
      tax,
      total,
      paymentMethod,
      paymentReference,
      discount,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      notes: notes || null
    }, { transaction });

    // Update inventory for each item
    for (let item of cleanItems) {
      const product = await Product.findByPk(item.productId);
      
      if (!product) {
        console.warn(`Product not found: ${item.productId}`);
        continue;
      }

      // Check stock
      if (product.quantity < item.quantity) {
        await transaction.rollback();
        return res.status(400).json({
          msg: `Not enough stock for ${product.name}. Only ${product.quantity} left.`
        });
      }

      // Reduce stock
      await product.update({
        quantity: product.quantity - item.quantity
      }, { transaction });

      // Log inventory outflow
      await InventoryLog.create({
        productId: item.productId,
        productName: product.name,
        type: 'outflow',
        quantity: item.quantity,
        reference: transactionNumber,
        userId: req.user.userId,
        userName: user.name,
        notes: `Sold to ${customerName || 'Customer'}`
      }, { transaction });
    }

    // Get company info for receipt
    const company = await Company.getCompany();
    
    // Commit transaction
    await transaction.commit();
    
    // Prepare receipt data
    const receipt = {
      transaction: transactionRecord,
      company: company,
      cashier: user.name,
      date: new Date().toLocaleString()
    };

    res.status(201).json({
      success: true,
      transaction: transactionRecord,
      receipt: receipt,
      message: 'Payment successful'
    });

  } catch (err) {
    await transaction.rollback();
    console.error('Payment failed:', err.message);
    res.status(500).json({ 
      msg: 'Payment failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET one transaction with receipt
router.get('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'cashier',
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    
    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }
    
    // Get company info
    const company = await Company.getCompany();
    
    res.json({
      transaction,
      company,
      receipt: {
        id: transaction.id,
        number: transaction.transactionNumber,
        date: transaction.createdAt.toLocaleString(),
        cashier: transaction.cashierName,
        items: transaction.items,
        subtotal: transaction.subtotal,
        tax: transaction.tax,
        total: transaction.total,
        paymentMethod: transaction.paymentMethod,
        customer: transaction.customerName
      }
    });
  } catch (err) {
    console.error('Get transaction error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Refund transaction
router.post('/:id/refund', auth, adminAuth, async (req, res) => {
  const t = await require('sequelize').transaction();
  
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction) {
      await t.rollback();
      return res.status(404).json({ msg: 'Transaction not found' });
    }
    
    // Create refund transaction
    const refundTransactionNumber = `REF-${transaction.transactionNumber}`;
    const refundTransaction = await Transaction.create({
      transactionNumber: refundTransactionNumber,
      cashierId: req.user.userId,
      cashierName: (await User.findByPk(req.user.userId)).name,
      items: transaction.items.map(item => ({
        ...item,
        quantity: -item.quantity,
        total: -item.total
      })),
      subtotal: -transaction.subtotal,
      tax: -transaction.tax,
      total: -transaction.total,
      paymentMethod: 'refund',
      paymentReference: `Refund for ${transaction.transactionNumber}`,
      notes: `Refund of transaction ${transaction.transactionNumber}`
    }, { transaction: t });
    
    // Restore inventory
    for (let item of transaction.items) {
      const product = await Product.findByPk(item.productId);
      if (product) {
        await product.update({
          quantity: product.quantity + item.quantity
        }, { transaction: t });
        
        // Log inventory inflow for refund
        await InventoryLog.create({
          productId: item.productId,
          productName: item.productName || product.name,
          type: 'inflow',
          quantity: item.quantity,
          reference: refundTransactionNumber,
          userId: req.user.userId,
          userName: (await User.findByPk(req.user.userId)).name,
          notes: `Refund for transaction ${transaction.transactionNumber}`
        }, { transaction: t });
      }
    }
    
    await t.commit();
    
    res.json({
      success: true,
      message: 'Refund processed successfully',
      originalTransaction: transaction.transactionNumber,
      refundTransaction: refundTransactionNumber
    });
    
  } catch (err) {
    await t.rollback();
    console.error('Refund error:', err);
    res.status(500).json({ msg: 'Refund failed' });
  }
});

module.exports = router;