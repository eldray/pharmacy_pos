// seed.js
const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');
const Supplier = require('./models/Supplier');

mongoose.connect('mongodb://localhost:27017/pharmacy-pos', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const seedData = async () => {
  // Users
  await User.deleteMany({});
  await new User({ name: 'Admin User', email: 'admin@pharmacy.com', password: 'admin123', role: 'admin' }).save();
  await new User({ name: 'John Cashier', email: 'cashier@pharmacy.com', password: 'cashier123', role: 'cashier' }).save();
  await new User({ name: 'Jane Officer', email: 'officer@pharmacy.com', password: 'officer123', role: 'officer' }).save();

  // Suppliers
  await Supplier.deleteMany({});
  await new Supplier({ name: 'Pharma Inc', email: 'sales@pharmainc.com', phone: '+233555123456', address: '123 Pharmacy Street', city: 'Accra', country: 'Ghana' }).save();
  await new Supplier({ name: 'Health Plus', email: 'info@healthplus.com', phone: '+233555654321', address: '456 Health Avenue', city: 'Kumasi', country: 'Ghana' }).save();

  // Products
  await Product.deleteMany({});
  await new Product({
    name: 'Paracetamol 500mg',
    description: 'Pain and fever relief',
    sku: 'SKU-PAR001',
    barcode: 'BAR-PAR001',
    category: 'Pain Relief',
    unitPrice: 2.50,
    quantity: 100,
    batchNumber: 'BATCH-001',
    expiryDate: '2026-12-31',
    supplier: 'Pharma Inc',
  }).save();

  await new Product({
    name: 'Amoxicillin 250mg',
    description: 'Antibiotic capsule',
    sku: 'SKU-AMO001',
    barcode: 'BAR-AMO001',
    category: 'Antibiotics',
    unitPrice: 5.00,
    quantity: 50,
    batchNumber: 'BATCH-002',
    expiryDate: '2025-11-30',
    supplier: 'Pharma Inc',
  }).save();

  await new Product({
    name: 'Ibuprofen 400mg',
    description: 'Anti-inflammatory',
    sku: 'SKU-IBU001',
    barcode: 'BAR-IBU001',
    category: 'Pain Relief',
    unitPrice: 3.75,
    quantity: 75,
    batchNumber: 'BATCH-003',
    expiryDate: '2027-05-15',
    supplier: 'Health Plus',
  }).save();

  console.log('Seed complete');
  process.exit();
};

seedData();
