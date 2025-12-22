// models/Transaction.js
const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  product: {
    name: String,
    sku: String,
    category: String,
  },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  total: Number,
  discount: Number,
});

const transactionSchema = new mongoose.Schema({
  transactionNumber: { type: String, required: true, unique: true },
  cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cashierName: String,
  items: [cartItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, required: true },
  total: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  paymentReference: String,
  discount: Number,
  customerName: String,
  customerPhone: String,
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
