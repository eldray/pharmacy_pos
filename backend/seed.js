// ✅ FIX 1: Import from the central index, NOT individual files
const { User, Product, Supplier, Company, LabTestTemplate } = require('./models');
const fs = require('fs');
const path = require('path');

// Helper to load JSON data
function loadJsonData(filename) {
  const filePath = path.join(__dirname, 'data', filename);
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error loading ${filename}:`, err.message);
    return null;
  }
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...\n');

    // ❌ REMOVED: await sequelize.sync({ force: true });
    // server.js already runs sequelize.sync(). 
    // Running force:true here would wipe the database every time the Electron app starts!

    // ==================== SEED USERS ====================
    const users = await User.bulkCreate([
      {
        name: 'Admin User',
        email: 'admin@pharmacy.com',
        password: 'admin123',
        role: 'admin'
      },
      {
        name: 'John Cashier',
        email: 'cashier@pharmacy.com',
        password: 'cashier123',
        role: 'cashier'
      },
      {
        name: 'Jane Officer',
        email: 'officer@pharmacy.com',
        password: 'officer123',
        role: 'officer'
      },
      {
        name: 'Dr. Sarah Lab',
        email: 'lab@pharmacy.com',
        password: 'lab123',
        role: 'lab'
      }
    ], { individualHooks: true }); // individualHooks ensures the bcrypt hashing runs
    console.log(`✅ Created ${users.length} users:`);
    users.forEach(u => console.log(`   - ${u.name} (${u.role})`));
    console.log('');

    // ==================== SEED SUPPLIERS ====================
    const suppliers = await Supplier.bulkCreate([
      {
        name: 'Pharma Inc',
        email: 'sales@pharmainc.com',
        phone: '+233555123456',
        address: '123 Pharmacy Street',
        city: 'Accra',
        country: 'Ghana'
      },
      {
        name: 'Health Plus',
        email: 'info@healthplus.com',
        phone: '+233555654321',
        address: '456 Health Avenue',
        city: 'Kumasi',
        country: 'Ghana'
      },
      {
        name: 'MediSupply Ltd',
        email: 'orders@medisupply.com',
        phone: '+233555789012',
        address: '789 Medical Road',
        city: 'Tema',
        country: 'Ghana'
      }
    ]);
    console.log(`✅ Created ${suppliers.length} suppliers\n`);

    // ==================== SEED PRODUCTS FROM JSON ====================
    const productsData = loadJsonData('products.json');
    if (productsData && productsData.products) {
      // ✅ FIX 2: The Product model uses `supplier: DataTypes.STRING`, 
      // NOT `supplierId`. So we just pass the supplier string directly.
      const products = await Product.bulkCreate(productsData.products);
      console.log(`✅ Created ${products.length} products from JSON data\n`);
    } else {
      console.log('⚠️  No products.json found or invalid format\n');
    }

    // ==================== SEED LAB TEST TEMPLATES FROM JSON ====================
    const labData = loadJsonData('lab-templates.json');
    if (labData && labData.templates) {
      const templates = await LabTestTemplate.bulkCreate(labData.templates);
      console.log(`✅ Created ${templates.length} lab test templates from JSON data\n`);
    } else {
      console.log('⚠️  No lab-templates.json found or invalid format\n');
    }

    // ==================== SEED COMPANY ====================
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
    console.log('✅ Company settings created\n');

    // ==================== SUMMARY ====================
    console.log('🎉 Seed completed successfully!\n');
    console.log('📋 Default Login Credentials:');
    console.log('   Admin:   admin@pharmacy.com   / admin123');
    console.log('   Cashier: cashier@pharmacy.com / cashier123');
    console.log('   Officer: officer@pharmacy.com / officer123');
    console.log('   Lab:     lab@pharmacy.com     / lab123');

    return true;
  } catch (err) {
    console.error('❌ Seed error:', err);
    throw err;
  }
}

// Allow direct execution: node seed.js
if (require.main === module) {
  // If run directly from terminal, we need to sync first
  const { sequelize } = require('./config/database');
  sequelize.sync({ force: true })
    .then(() => seedDatabase())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}

module.exports = seedDatabase;