// models/Supplier.js
const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  address: String,
  city: String,
  country: String,
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);
