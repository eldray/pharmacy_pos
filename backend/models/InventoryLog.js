// models/InventoryLog.js
const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: String,
  type: { type: String, enum: ['inflow', 'outflow', 'adjustment'], required: true },
  quantity: { type: Number, required: true },
  reference: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: String,
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
