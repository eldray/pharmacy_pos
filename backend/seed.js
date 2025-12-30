const { sequelize } = require('./database');
const User = require('./models/User');
const Product = require('./models/Product');
const Supplier = require('./models/Supplier');
const Company = require('./models/Company');

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Sync all models
    await sequelize.sync({ force: true });
    console.log('Database tables created');

    // Create users
    const users = await User.bulkCreate([
      { name: 'Admin User', email: 'admin@pharmacy.com', password: 'admin123', role: 'admin' },
      { name: 'John Cashier', email: 'cashier@pharmacy.com', password: 'cashier123', role: 'cashier' },
      { name: 'Jane Officer', email: 'officer@pharmacy.com', password: 'officer123', role: 'officer' }
    ]);
    console.log(`Created ${users.length} users`);

    // Create suppliers
    const suppliers = await Supplier.bulkCreate([
      { name: 'Pharma Inc', email: 'sales@pharmainc.com', phone: '+233555123456', address: '123 Pharmacy Street', city: 'Accra', country: 'Ghana' },
      { name: 'Health Plus', email: 'info@healthplus.com', phone: '+233555654321', address: '456 Health Avenue', city: 'Kumasi', country: 'Ghana' }
    ]);
    console.log(`Created ${suppliers.length} suppliers`);

    // Create products
    const products = await Product.bulkCreate([
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
    ]);
    console.log(`Created ${products.length} products`);

    // Create company settings
    await Company.create({
      name: 'Pharmacy POS System',
      addressStreet: '123 Pharmacy Street',
      addressCity: 'Accra',
      addressCountry: 'Ghana',
      contactPhone: '+233555123456',
      contactEmail: 'info@pharmacy.com',
      taxRate: 15.0,
      receiptFooter: 'Thank you for your purchase!'
    });
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

module.exports = seedDatabase;