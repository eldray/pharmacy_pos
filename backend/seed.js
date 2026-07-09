// seed.js
// ✅ FIX 1: Import from the central index, NOT individual files
const { User, Product, Supplier, Company, LabTestTemplate } = require('./models');
const fs = require('fs');
const path = require('path');
const { sequelize } = require('./config/database');

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

    // ✅ FIX: Sync database first to create tables
    console.log('📦 Syncing database schema...');
    await sequelize.sync({ force: true });
    console.log('✅ Database schema synced\n');

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
        name: 'Jane Pharmacist',
        email: 'pharmacist@pharmacy.com',
        password: 'pharmacist123',
        role: 'pharmacist'
      },
      {
        name: 'Dr. Sarah Lab',
        email: 'lab@pharmacy.com',
        password: 'lab123',
        role: 'lab'
      }
    ], { individualHooks: true });
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

    // ==================== SEED PRODUCTS ====================
    // ✅ Updated to match Product model with supplier as string
    const productsData = loadJsonData('products.json');
    if (productsData && productsData.products) {
      // Map supplier name to the products
      const productsWithSupplier = productsData.products.map((product, index) => ({
        ...product,
        // Assign suppliers in round-robin fashion
        supplier: ['Pharma Inc', 'Health Plus', 'MediSupply Ltd'][index % 3],
        // Ensure required fields have default values
        quantity: product.quantity || Math.floor(Math.random() * 100) + 10,
        unitPrice: product.unitPrice || (Math.random() * 50 + 5),
        batchNumber: product.batchNumber || `BATCH-${String(index + 1).padStart(3, '0')}`,
        expiryDate: product.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }));

      const products = await Product.bulkCreate(productsWithSupplier);
      console.log(`✅ Created ${products.length} products from JSON data\n`);

      // Show a few products as sample
      products.slice(0, 5).forEach(p => {
        console.log(`   - ${p.name} | SKU: ${p.sku} | Qty: ${p.quantity} | Supplier: ${p.supplier}`);
      });
      if (products.length > 5) console.log(`   ... and ${products.length - 5} more`);
      console.log('');
    } else {
      console.log('⚠️  No products.json found or invalid format\n');

      // Create default products if no JSON file
      console.log('📦 Creating default products...');
      const defaultProducts = [
        {
          name: 'Paracetamol 500mg',
          sku: 'PAR-001',
          barcode: 'BAR-001',
          category: 'Pain Relief',
          description: 'For fever and mild to moderate pain',
          quantity: 150,
          unitPrice: 2.50,
          batchNumber: 'BATCH-001',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          supplier: 'Pharma Inc'
        },
        {
          name: 'Amoxicillin 250mg',
          sku: 'AMX-001',
          barcode: 'BAR-002',
          category: 'Antibiotics',
          description: 'Broad-spectrum antibiotic',
          quantity: 80,
          unitPrice: 3.75,
          batchNumber: 'BATCH-002',
          expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          supplier: 'Health Plus'
        },
        {
          name: 'Vitamin C 1000mg',
          sku: 'VIT-001',
          barcode: 'BAR-003',
          category: 'Vitamins',
          description: 'Immune system support',
          quantity: 200,
          unitPrice: 1.99,
          batchNumber: 'BATCH-003',
          expiryDate: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          supplier: 'MediSupply Ltd'
        },
        {
          name: 'Omeprazole 20mg',
          sku: 'OME-001',
          barcode: 'BAR-004',
          category: 'Gastrointestinal',
          description: 'For acid reflux and heartburn',
          quantity: 45,
          unitPrice: 4.25,
          batchNumber: 'BATCH-004',
          expiryDate: new Date(Date.now() + 250 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          supplier: 'Pharma Inc'
        },
        {
          name: 'Loratadine 10mg',
          sku: 'LOR-001',
          barcode: 'BAR-005',
          category: 'Antihistamine',
          description: 'For allergy relief',
          quantity: 30,
          unitPrice: 3.50,
          batchNumber: 'BATCH-005',
          expiryDate: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          supplier: 'Health Plus'
        }
      ];

      const products = await Product.bulkCreate(defaultProducts);
      console.log(`✅ Created ${products.length} default products\n`);
    }

    // ==================== SEED LAB TEST TEMPLATES ====================
    const labData = loadJsonData('lab-templates.json');
    if (labData && labData.templates) {
      const templates = await LabTestTemplate.bulkCreate(labData.templates);
      console.log(`✅ Created ${templates.length} lab test templates from JSON data\n`);
    } else {
      console.log('⚠️  No lab-templates.json found or invalid format\n');

      // Create default lab templates
      console.log('📦 Creating default lab test templates...');
      const defaultTemplates = [
        {
          name: 'Complete Blood Count (CBC)',
          category: 'Hematology',
          description: 'Measures red and white blood cells, hemoglobin, and platelets',
          price: 45.00,
          sampleType: 'Blood',
          resultFields: ['WBC', 'RBC', 'Hemoglobin', 'Hematocrit', 'Platelets'],
          instructions: 'Fasting not required. Collect in EDTA tube.'
        },
        {
          name: 'Malaria Test',
          category: 'Parasitology',
          description: 'Rapid diagnostic test for malaria parasites',
          price: 25.00,
          sampleType: 'Blood',
          resultFields: ['Result', 'Species'],
          instructions: 'No fasting required. Rapid test with results in 15 minutes.'
        },
        {
          name: 'Blood Glucose',
          category: 'Biochemistry',
          description: 'Measures blood sugar levels',
          price: 15.00,
          sampleType: 'Blood',
          resultFields: ['Fasting', 'Random'],
          instructions: 'Fasting for 8 hours required for accurate fasting glucose.'
        },
        {
          name: 'Lipid Profile',
          category: 'Biochemistry',
          description: 'Measures cholesterol and triglycerides',
          price: 55.00,
          sampleType: 'Blood',
          resultFields: ['Total Cholesterol', 'LDL', 'HDL', 'Triglycerides'],
          instructions: 'Fasting for 12 hours required.'
        },
        {
          name: 'Urinalysis',
          category: 'Urinalysis',
          description: 'Comprehensive urine analysis',
          price: 30.00,
          sampleType: 'Urine',
          resultFields: ['Appearance', 'pH', 'Protein', 'Glucose', 'Ketones'],
          instructions: 'Collect mid-stream urine sample.'
        }
      ];

      const templates = await LabTestTemplate.bulkCreate(defaultTemplates);
      console.log(`✅ Created ${templates.length} default lab test templates\n`);
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
    console.log('   Pharmacist: pharmacist@pharmacy.com / pharmacist123');
    console.log('   Lab:     lab@pharmacy.com     / lab123');

    return true;
  } catch (err) {
    console.error('❌ Seed error:', err);
    throw err;
  }
}

// Run the seed
seedDatabase()
  .then(() => {
    console.log('✅ Seeding complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });

module.exports = seedDatabase;