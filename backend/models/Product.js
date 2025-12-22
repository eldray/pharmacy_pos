// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  sku: { type: String, required: true, unique: true },
  barcode: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, default: 0 },
  batchNumber: String,
  expiryDate: String,
  supplier: String,
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
