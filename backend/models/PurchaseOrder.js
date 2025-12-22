// models/PurchaseOrder.js
const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: String,
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  total: Number,
  batchNumber: String,
  expiryDate: String,
});

const purchaseOrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  items: [purchaseOrderItemSchema],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'received', 'cancelled'], default: 'pending' },
  orderDate: { type: Date, default: Date.now },
  expectedDeliveryDate: { type: Date, required: true },
  deliveryDate: Date,
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
