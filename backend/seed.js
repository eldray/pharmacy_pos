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
    // These defaults are the demo logins the sign-in screen offers; set
    // SEED_ADMIN_PASSWORD etc. in .env for a real installation.
    const demoPassword = (key, fallback) => {
      const fromEnv = process.env[key];
      if (fromEnv) return fromEnv;
      demoPasswordsInUse = true;
      return fallback;
    };
    let demoPasswordsInUse = false;

    const userDefs = [
      { name: 'Admin User',      email: 'admin@pharmacy.com',      password: demoPassword('SEED_ADMIN_PASSWORD', 'admin123'),      role: 'admin' },
      { name: 'Mark Manager',    email: 'manager@pharmacy.com',    password: demoPassword('SEED_MANAGER_PASSWORD', 'manager123'),  role: 'manager' },
      { name: 'John Cashier',    email: 'cashier@pharmacy.com',    password: demoPassword('SEED_CASHIER_PASSWORD', 'cashier123'),   role: 'cashier' },
      { name: 'Jane Pharmacist', email: 'pharmacist@pharmacy.com', password: demoPassword('SEED_PHARMACIST_PASSWORD', 'pharmacist123'), role: 'pharmacist_sales' },
      { name: 'Dr. Sarah Lab',   email: 'lab@pharmacy.com',        password: demoPassword('SEED_LAB_PASSWORD', 'lab123'),          role: 'lab_tech' },
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
      const missingCost = created.filter((p) => !Number(p.cost)).length;
      console.log(`✅ Created ${created.length} products`);
      if (missingCost) {
        console.log(`⚠️  ${missingCost} have no cost price, so profit and COGS reports show a 100% margin`);
        console.log('   until you enter one per product in Product Management (costs are never guessed here).');
      }
      console.log('');
    } else {
      console.log(`✅ Products already present (${await Product.count()}) — skipping\n`);
    }

    // ==================== LAB TEST TEMPLATES ====================
    // findOrCreate per name, not a single bulkCreate behind a `count() === 0`
    // guard: re-running the seed must add the tests that are new to the
    // catalogue without touching prices a pharmacy has already edited.
    const labData = loadJsonData('lab-templates.json');
    const templates = labData?.templates || [
      { name: 'Complete Blood Count (CBC)', category: 'Hematology',   description: 'RBC/WBC/platelets', price: 45.00, sampleType: 'Blood', insurancePrice: 35, resultFields: [{ name: 'WBC', type: 'number', required: true }, { name: 'RBC', type: 'number', required: true }, { name: 'Hemoglobin', type: 'number', required: true }, { name: 'Platelets', type: 'number', required: true }], defaultReferenceRanges: { WBC: { referenceRange: '4.5-11.0', unit: 'x10^3/µL' }, Hemoglobin: { referenceRange: '12.0-16.0', unit: 'g/dL' } }, instructions: 'EDTA tube.' },
      { name: 'Malaria Test',              category: 'Parasitology', description: 'RDT for malaria',   price: 25.00, sampleType: 'Blood', insurancePrice: 15, resultFields: [{ name: 'Result', type: 'text', required: true }, { name: 'Species', type: 'text', required: false }], defaultReferenceRanges: {}, instructions: 'Rapid test.' },
      { name: 'Blood Glucose',             category: 'Biochemistry', description: 'Blood sugar',       price: 15.00, sampleType: 'Blood', insurancePrice: 10, resultFields: [{ name: 'Glucose Level', type: 'number', required: true }], defaultReferenceRanges: { 'Glucose Level': { referenceRange: '70-100', unit: 'mg/dL (fasting)' } }, instructions: '8h fast for fasting.' },
      { name: 'Lipid Profile',             category: 'Biochemistry', description: 'Cholesterol panel', price: 55.00, sampleType: 'Blood', insurancePrice: 40, resultFields: [{ name: 'Total Cholesterol', type: 'number', required: true }, { name: 'LDL', type: 'number', required: true }, { name: 'HDL', type: 'number', required: true }, { name: 'Triglycerides', type: 'number', required: true }], defaultReferenceRanges: {}, instructions: '12h fast.' },
      { name: 'Urinalysis',                category: 'Urinalysis',   description: 'Urine analysis',    price: 30.00, sampleType: 'Urine', insurancePrice: 20, resultFields: [{ name: 'Appearance', type: 'text', required: false }, { name: 'Protein', type: 'text', required: true }], defaultReferenceRanges: {}, instructions: 'Mid-stream.' },
    ];

    let labAdded = 0;
    let labExisting = 0;
    for (const t of templates) {
      const [, wasCreated] = await LabTestTemplate.findOrCreate({
        where: { name: t.name },
        defaults: t,
      });
      if (wasCreated) labAdded++; else labExisting++;
    }
    if (!labData?.templates) console.log('⚠️  No lab-templates.json — using the built-in fallback list');
    console.log(`✅ Lab templates: ${labAdded} created, ${labExisting} already present (${await LabTestTemplate.count()} total)\n`);

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
    // Singleton table, so the guard is "does any row exist", not "does a row
    // with this name exist". findOrCreate({ where: { name } }) used to insert a
    // second company for an owner who had renamed the first, and the app then
    // read and wrote whichever of the two rows Postgres happened to scan first.
    const companyCount = await Company.count();
    if (companyCount === 0) {
      await Company.create({
        name: 'Pharmacy POS System',
        addressStreet: '123 Pharmacy Street',
        addressCity: 'Accra',
        addressCountry: 'Ghana',
        contactPhone: '+233555123456',
        contactEmail: 'info@pharmacy.com',
        taxRate: 15.0,
        receiptFooter: 'Thank you for your purchase!',
      });
      console.log('✅ Created default company settings\n');
    } else {
      console.log('✅ Company settings already in place, left untouched\n');
    }

    console.log('🎉 Seed completed successfully!\n');
    console.log('📋 Login Credentials:');
    userDefs.forEach(u => console.log(`   ${u.role.padEnd(16)} ${u.email.padEnd(25)} / ${u.password}`));
    if (demoPasswordsInUse) {
      console.log('\n⚠️  These are the demo passwords from the sign-in screen.');
      console.log('   For a live till, set SEED_ADMIN_PASSWORD / SEED_MANAGER_PASSWORD / … in backend/.env');
      console.log('   and change each account password after first sign-in.');
    }

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