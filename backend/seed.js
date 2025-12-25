// seed.js - Complete seed script
const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');
const Supplier = require('./models/Supplier');
const Company = require('./models/Company');

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Clear existing data
    await User.deleteMany({});
    console.log('Cleared users');
    
    await Product.deleteMany({});
    console.log('Cleared products');
    
    await Supplier.deleteMany({});
    console.log('Cleared suppliers');
    
    await Company.deleteMany({});
    console.log('Cleared company settings');

    // Create users
    const users = [
      { name: 'Admin User', email: 'admin@pharmacy.com', password: 'admin123', role: 'admin' },
      { name: 'John Cashier', email: 'cashier@pharmacy.com', password: 'cashier123', role: 'cashier' },
      { name: 'Jane Officer', email: 'officer@pharmacy.com', password: 'officer123', role: 'officer' }
    ];

    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      console.log(`Created user: ${user.email}`);
    }

    // Create suppliers
    const suppliers = [
      { name: 'Pharma Inc', email: 'sales@pharmainc.com', phone: '+233555123456', address: '123 Pharmacy Street', city: 'Accra', country: 'Ghana' },
      { name: 'Health Plus', email: 'info@healthplus.com', phone: '+233555654321', address: '456 Health Avenue', city: 'Kumasi', country: 'Ghana' }
    ];

    for (const supplierData of suppliers) {
      const supplier = new Supplier(supplierData);
      await supplier.save();
      console.log(`Created supplier: ${supplier.name}`);
    }

    // Create products
    const products = [
      {
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
      },
      {
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
      },
      {
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
      }
    ];

    for (const productData of products) {
      const product = new Product(productData);
      await product.save();
      console.log(`Created product: ${product.name}`);
    }

    // Create company settings
    const company = new Company({
      name: 'Pharmacy POS System',
      address: '123 Pharmacy Street, Accra',
      phone: '+233555123456',
      email: 'info@pharmacy.com',
      taxRate: 15.0,
      currency: 'GHS',
      receiptFooter: 'Thank you for your purchase!'
    });
    await company.save();
    console.log('Created company settings');

    console.log('✅ Database seeded successfully!');
    console.log('Default login credentials:');
    console.log('Admin: admin@pharmacy.com / admin123');
    console.log('Cashier: cashier@pharmacy.com / cashier123');
    console.log('Officer: officer@pharmacy.com / officer123');
    
    return true;
  } catch (error) {
    console.error('❌ Seed error:', error);
    throw error;
  }
}

// If run directly: node seed.js
if (require.main === module) {
  require('dotenv').config();
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy-pos';
  
  mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to MongoDB');
    return seedDatabase();
  })
  .then(() => {
    console.log('Seed complete. Exiting...');
    process.exit(0);
  })
  .catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}

// Export for use in server.js
module.exports = seedDatabase;