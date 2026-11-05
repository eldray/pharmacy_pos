// backend/seed.js
const {
  User, Product, Supplier, Company, LabTestTemplate, InsuranceProvider,
} = require('./models');
const fs = require('fs');
const path = require('path');

function loadJsonData(filename) {
  const filePath = path.join(__dirname, 'data', filename);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Error loading ${filename}:`, err.message);
    return null;
  }
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...\n');

    // ⚠️  NO sequelize.sync() HERE.
    // Schema is owned by migrations. Seed only inserts data.

    // ==================== USERS ====================
    const userDefs = [
      { name: 'Admin User',      email: 'admin@pharmacy.com',      password: 'admin123',      role: 'admin' },
      { name: 'Mark Manager',    email: 'manager@pharmacy.com',    password: 'manager123',    role: 'manager' },
      { name: 'John Cashier',    email: 'cashier@pharmacy.com',    password: 'cashier123',    role: 'cashier' },
      { name: 'Jane Pharmacist', email: 'pharmacist@pharmacy.com', password: 'pharmacist123', role: 'pharmacist_sales' },
      { name: 'Dr. Sarah Lab',   email: 'lab@pharmacy.com',        password: 'lab123',        role: 'lab_tech' },
    ];

    for (const u of userDefs) {
      await User.findOrCreate({
        where: { email: u.email },
        defaults: u,
        individualHooks: true,
      });
    }
    console.log(`✅ Ensured ${userDefs.length} users exist`);
    userDefs.forEach(u => console.log(`   - ${u.name} (${u.role})`));
    console.log('');

    // ==================== SUPPLIERS ====================
    const supplierDefs = [
      { name: 'Pharma Inc',     email: 'sales@pharmainc.com',  phone: '+233555123456', address: '123 Pharmacy Street', city: 'Accra',  country: 'Ghana' },
      { name: 'Health Plus',    email: 'info@healthplus.com',  phone: '+233555654321', address: '456 Health Avenue',   city: 'Kumasi', country: 'Ghana' },
      { name: 'MediSupply Ltd', email: 'orders@medisupply.com',phone: '+233555789012', address: '789 Medical Road',    city: 'Tema',   country: 'Ghana' },
    ];
    for (const s of supplierDefs) {
      await Supplier.findOrCreate({ where: { name: s.name }, defaults: s });
    }
    console.log(`✅ Ensured ${supplierDefs.length} suppliers exist\n`);

    // ==================== PRODUCTS ====================
    if ((await Product.count()) === 0) {
      const productsData = loadJsonData('products.json');
      let rows;

      if (productsData?.products) {
        rows = productsData.products.map((p, i) => ({
          ...p,
          supplier: ['Pharma Inc', 'Health Plus', 'MediSupply Ltd'][i % 3],
          quantity: p.quantity || Math.floor(Math.random() * 100) + 10,
          unitPrice: p.unitPrice || (Math.random() * 50 + 5),
          batchNumber: p.batchNumber || `BATCH-${String(i + 1).padStart(3, '0')}`,
          expiryDate: p.expiryDate || new Date(Date.now() + 365 * 864e5).toISOString().split('T')[0],
        }));
      } else {
        console.log('⚠️  No products.json — using defaults');
        rows = [
          { name: 'Paracetamol 500mg', sku: 'PAR-001', barcode: 'BAR-001', category: 'Pain Relief',     description: 'For fever and mild pain',   quantity: 150, unitPrice: 2.50, batchNumber: 'BATCH-001', expiryDate: new Date(Date.now() + 365*864e5).toISOString().split('T')[0], supplier: 'Pharma Inc' },
          { name: 'Amoxicillin 250mg', sku: 'AMX-001', barcode: 'BAR-002', category: 'Antibiotics',     description: 'Broad-spectrum antibiotic', quantity: 80,  unitPrice: 3.75, batchNumber: 'BATCH-002', expiryDate: new Date(Date.now() + 300*864e5).toISOString().split('T')[0], supplier: 'Health Plus' },
          { name: 'Vitamin C 1000mg',  sku: 'VIT-001', barcode: 'BAR-003', category: 'Vitamins',        description: 'Immune support',            quantity: 200, unitPrice: 1.99, batchNumber: 'BATCH-003', expiryDate: new Date(Date.now() + 400*864e5).toISOString().split('T')[0], supplier: 'MediSupply Ltd' },
          { name: 'Omeprazole 20mg',   sku: 'OME-001', barcode: 'BAR-004', category: 'Gastrointestinal',description: 'For acid reflux',           quantity: 45,  unitPrice: 4.25, batchNumber: 'BATCH-004', expiryDate: new Date(Date.now() + 250*864e5).toISOString().split('T')[0], supplier: 'Pharma Inc' },
          { name: 'Loratadine 10mg',   sku: 'LOR-001', barcode: 'BAR-005', category: 'Antihistamine',   description: 'Allergy relief',            quantity: 30,  unitPrice: 3.50, batchNumber: 'BATCH-005', expiryDate: new Date(Date.now() + 200*864e5).toISOString().split('T')[0], supplier: 'Health Plus' },
        ];
      }

      const created = await Product.bulkCreate(rows);
      console.log(`✅ Created ${created.length} products\n`);
    } else {
      console.log(`✅ Products already present (${await Product.count()}) — skipping\n`);
    }

    // ==================== LAB TEST TEMPLATES ====================
    if ((await LabTestTemplate.count()) === 0) {
      const labData = loadJsonData('lab-templates.json');
      const templates = labData?.templates || [
        { name: 'Complete Blood Count (CBC)', category: 'Hematology',   description: 'RBC/WBC/platelets', price: 45.00, sampleType: 'Blood', resultFields: ['WBC','RBC','Hemoglobin','Hematocrit','Platelets'], instructions: 'EDTA tube.' },
        { name: 'Malaria Test',              category: 'Parasitology', description: 'RDT for malaria',   price: 25.00, sampleType: 'Blood', resultFields: ['Result','Species'],                                  instructions: 'Rapid test.' },
        { name: 'Blood Glucose',             category: 'Biochemistry', description: 'Blood sugar',       price: 15.00, sampleType: 'Blood', resultFields: ['Fasting','Random'],                                  instructions: '8h fast for fasting.' },
        { name: 'Lipid Profile',             category: 'Biochemistry', description: 'Cholesterol panel', price: 55.00, sampleType: 'Blood', resultFields: ['Total Cholesterol','LDL','HDL','Triglycerides'],      instructions: '12h fast.' },
        { name: 'Urinalysis',                category: 'Urinalysis',   description: 'Urine analysis',    price: 30.00, sampleType: 'Urine', resultFields: ['Appearance','pH','Protein','Glucose','Ketones'],      instructions: 'Mid-stream.' },
      ];
      const created = await LabTestTemplate.bulkCreate(templates);
      console.log(`✅ Created ${created.length} lab test templates\n`);
    } else {
      console.log(`✅ Lab templates already present (${await LabTestTemplate.count()}) — skipping\n`);
    }

    // ==================== INSURANCE PROVIDERS ====================
    const providerDefs = [
      { name: 'National Health Insurance Scheme', code: 'NHIS',   coverageType: 'fixed',      defaultCopayPercent: 0,  contactPerson: 'NHIS Desk',      phone: '+233302123456', email: 'info@nhis.gov.gh',    status: 'active' },
      { name: 'Acacia Health Insurance',          code: 'ACACIA', coverageType: 'percentage', defaultCopayPercent: 20, contactPerson: 'Claims Officer', phone: '+233302987654', email: 'claims@acacia.com.gh', status: 'active' },
      { name: 'Apex Health Insurance',            code: 'APEX',   coverageType: 'percentage', defaultCopayPercent: 10, status: 'active' },
    ];
    for (const p of providerDefs) {
      await InsuranceProvider.findOrCreate({ where: { code: p.code }, defaults: p });
    }
    console.log(`✅ Ensured ${providerDefs.length} insurance providers\n`);

    // ==================== COMPANY ====================
    await Company.findOrCreate({
      where: { name: 'Pharmacy POS System' },
      defaults: {
        name: 'Pharmacy POS System',
        addressStreet: '123 Pharmacy Street',
        addressCity: 'Accra',
        addressCountry: 'Ghana',
        contactPhone: '+233555123456',
        contactEmail: 'info@pharmacy.com',
        taxRate: 15.0,
        receiptFooter: 'Thank you for your purchase!',
      },
    });
    console.log('✅ Company settings ensured\n');

    console.log('🎉 Seed completed successfully!\n');
    console.log('📋 Default Login Credentials:');
    console.log('   Admin:      admin@pharmacy.com      / admin123');
    console.log('   Manager:    manager@pharmacy.com    / manager123');
    console.log('   Cashier:    cashier@pharmacy.com    / cashier123');
    console.log('   Pharmacist: pharmacist@pharmacy.com / pharmacist123');
    console.log('   Lab:        lab@pharmacy.com        / lab123');

    return true;
  } catch (err) {
    console.error('❌ Seed error:', err);
    throw err;
  }
}

module.exports = seedDatabase;

// Allow running standalone: `node seed.js`
if (require.main === module) {
  seedDatabase()
    .then(() => { console.log('✅ Seeding complete!'); process.exit(0); })
    .catch((err) => { console.error('❌ Seeding failed:', err); process.exit(1); });
}