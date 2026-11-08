// backend/seed.js
//
// Two very different jobs share this file:
//
//   production (NODE_ENV=production, what the packaged desktop app sets)
//     One admin, taken from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in .env, one
//     home branch and a company shell with no invented address or phone. No
//     sample staff, no fake suppliers, no randomised stock, no passwords in the
//     log. Drugs come from `npm run import:products -- --file <real catalogue>`.
//
//   development
//     The above plus the demo logins the sign-in screen offers, sample
//     suppliers/insurers and data/products.json. SEED_DEMO=false gets a
//     realistic empty till without leaving development mode.
//
// Schema is owned by migrations — there is no sequelize.sync() here.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  User, Product, Supplier, Company, LabTestTemplate, InsuranceProvider, Branch, BranchInventory,
} = require('./models');
const { isProduction, isDemoSeedAllowed } = require('./utils/environment');
const { validatePassword, validateEmail } = require('./utils/validators');

function loadJsonData(filename) {
  const filePath = path.join(__dirname, 'data', filename);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Error loading ${filename}:`, err.message);
    return null;
  }
}

/**
 * The operator's own administrator. In production a missing or weak value is a
 * hard stop rather than a fallback: shipping a live till with a password that is
 * printed on the sign-in screen is the failure this whole file exists to avoid.
 */
function resolveAdmin() {
  const production = isProduction();
  const email = (process.env.SEED_ADMIN_EMAIL || (production ? '' : 'admin@pharmacy.com')).trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || (production ? '' : 'admin123');
  const name = (process.env.SEED_ADMIN_NAME || (production ? 'Administrator' : 'Admin User')).trim();

  const emailError = validateEmail(email);
  if (emailError) {
    throw new Error(
      `${production ? 'SEED_ADMIN_EMAIL' : 'Admin email'}: ${emailError}. ` +
      'Set SEED_ADMIN_EMAIL in backend/.env to the pharmacy owner\'s address.'
    );
  }

  if (production || process.env.SEED_ADMIN_PASSWORD) {
    const passwordError = validatePassword(password);
    if (passwordError) {
      throw new Error(
        `SEED_ADMIN_PASSWORD: ${passwordError}. ` +
        'Set it in backend/.env (8+ characters, an uppercase letter, a lowercase letter and a digit).'
      );
    }
  }

  return { name, email, password, role: 'admin' };
}

/** Production seeds the lab catalogue unless the operator turns it off. */
function labCatalogueEnabled() {
  return String(process.env.SEED_LAB_CATALOGUE || '').toLowerCase() !== 'false';
}

/**
 * Adds any standard lab test that is missing, matched by name. Safe to run any
 * number of times: findOrCreate per name, so re-running adds new tests without
 * touching prices or fields a pharmacy has edited.
 */
async function seedLabCatalogue() {
  const labData = loadJsonData('lab-templates.json');
  const templates = labData?.templates || [];
  let added = 0;
  let existing = 0;
  for (const t of templates) {
    const [, wasCreated] = await LabTestTemplate.findOrCreate({ where: { name: t.name }, defaults: t });
    if (wasCreated) added++; else existing++;
  }
  if (!templates.length) console.log('⚠️  No lab-templates.json — no lab catalogue created');
  console.log(`✅ Lab templates: ${added} created, ${existing} already present (${await LabTestTemplate.count()} total)\n`);
  return { added, existing };
}

async function seedDatabase() {
  const production = isProduction();
  const demo = isDemoSeedAllowed();

  try {
    console.log(`🌱 Starting database seed (${production ? 'production' : 'development'}${demo ? '' : ', demo data off'})...\n`);

    // ==================== ADMIN ====================
    const admin = resolveAdmin();
    const [, adminCreated] = await User.findOrCreate({
      where: { email: admin.email },
      defaults: admin,
      individualHooks: true, // hashes the password
    });
    console.log(`✅ Admin ${adminCreated ? 'created' : 'already present'}: ${admin.email}`);

    // ==================== HOME BRANCH ====================
    // Structure, not demo data: stock, staff and every sale need a branch to
    // belong to, and exactly one of them is "this till".
    const branch = await Branch.ensureMainBranch({ name: process.env.SEED_BRANCH_NAME || 'Main Branch' });
    console.log(`✅ Main branch: ${branch.name} (${branch.code})\n`);

    // ==================== COMPANY ====================
    // Singleton table, so the guard is "does any row exist", not "does a row with
    // this name exist" — the latter inserted a second company for an owner who
    // had renamed the first, and reads then flipped between the two rows.
    if ((await Company.count()) === 0) {
      const taxRate = process.env.SEED_TAX_RATE !== undefined ? Number(process.env.SEED_TAX_RATE) : (production ? 0 : 15);
      if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
        throw new Error(`SEED_TAX_RATE must be a number between 0 and 100 (got "${process.env.SEED_TAX_RATE}")`);
      }
      await Company.create({
        name: process.env.SEED_COMPANY_NAME || (production ? 'My Pharmacy' : 'Pharmacy POS System'),
        taxRate,
        // A production receipt must not print an address or phone number nobody
        // entered. The owner fills these in under Settings → Company.
        ...(production ? {} : {
          addressStreet: '123 Pharmacy Street',
          addressCity: 'Accra',
          addressCountry: 'Ghana',
          contactPhone: '+233555123456',
          contactEmail: 'info@pharmacy.com',
          receiptFooter: 'Thank you for your purchase!',
        }),
      });
      console.log(`✅ Created company settings${production ? ' (name and VAT only — add address, phone and logo in Settings)' : ''}\n`);
    } else {
      console.log('✅ Company settings already in place, left untouched\n');
    }

    // ==================== DEMO STAFF ====================
    let demoUsers = [];
    if (demo) {
      demoUsers = [
        { name: 'Mark Manager',    email: 'manager@pharmacy.com',    password: process.env.SEED_MANAGER_PASSWORD || 'manager123',       role: 'manager' },
        { name: 'John Cashier',    email: 'cashier@pharmacy.com',    password: process.env.SEED_CASHIER_PASSWORD || 'cashier123',       role: 'cashier' },
        { name: 'Jane Pharmacist', email: 'pharmacist@pharmacy.com', password: process.env.SEED_PHARMACIST_PASSWORD || 'pharmacist123', role: 'pharmacist_sales' },
        { name: 'Dr. Sarah Lab',   email: 'lab@pharmacy.com',        password: process.env.SEED_LAB_PASSWORD || 'lab123',               role: 'lab_tech' },
      ];
      for (const u of demoUsers) {
        await User.findOrCreate({ where: { email: u.email }, defaults: u, individualHooks: true });
      }
      console.log(`✅ Ensured ${demoUsers.length} demo staff accounts\n`);
    }

    // ==================== SUPPLIERS ====================
    if (demo) {
      const supplierDefs = [
        { name: 'Pharma Inc',     email: 'sales@pharmainc.com',  phone: '+233555123456', address: '123 Pharmacy Street', city: 'Accra',  country: 'Ghana' },
        { name: 'Health Plus',    email: 'info@healthplus.com',  phone: '+233555654321', address: '456 Health Avenue',   city: 'Kumasi', country: 'Ghana' },
        { name: 'MediSupply Ltd', email: 'orders@medisupply.com',phone: '+233555789012', address: '789 Medical Road',    city: 'Tema',   country: 'Ghana' },
      ];
      for (const s of supplierDefs) {
        await Supplier.findOrCreate({ where: { name: s.name }, defaults: s });
      }
      console.log(`✅ Ensured ${supplierDefs.length} sample suppliers\n`);
    }

    // ==================== PRODUCTS ====================
    // Development only, and only into an empty catalogue. A production pharmacy
    // loads its own drugs with `npm run import:products -- --file catalogue.csv`;
    // nothing here invents a price, a batch number or an expiry date.
    if (demo) {
      if ((await Product.count()) === 0) {
        const productsData = loadJsonData('products.json');
        const rows = productsData?.products;
        if (!rows?.length) {
          console.log('⚠️  No products.json — no demo products created\n');
        } else {
          const created = await Product.bulkCreate(rows);
          console.log(`✅ Created ${created.length} demo products`);
          const missingCost = created.filter((p) => !Number(p.cost)).length;
          if (missingCost) {
            console.log(`⚠️  ${missingCost} have no cost price, so profit and COGS reports show a 100% margin`);
            console.log('   until you enter one per product in Product Management (costs are never guessed here).');
          }
          console.log('');
        }
      } else {
        console.log(`✅ Products already present (${await Product.count()}) — skipping\n`);
      }
    } else if (production) {
      console.log(`ℹ️  Products: ${await Product.count()} on file. Import your own catalogue with`);
      console.log('   npm run import:products -- --file data/your-catalogue.csv (see data/products.example.csv)\n');
    }

    // Per-branch stock rows for anything that has none, so the Branches page and
    // low-stock alerts see the same quantities the POS sells from.
    const stocked = await BranchInventory.syncFromProducts(branch.id);
    if (stocked) console.log(`✅ Added ${stocked} stock row(s) for ${branch.name}\n`);

    // ==================== LAB TEST TEMPLATES ====================
    // The standard lab catalogue (tests, reference ranges, prices) is part of a
    // working lab module, so production gets it too. Prices are editable under Lab
    // Management and are never overwritten on re-seed. Opt out: SEED_LAB_CATALOGUE=false.
    if (demo || labCatalogueEnabled()) {
      await seedLabCatalogue();
    }

    // ==================== INSURANCE PROVIDERS ====================
    if (demo) {
      const providerDefs = [
        { name: 'National Health Insurance Scheme', code: 'NHIS',   coverageType: 'fixed',      defaultCopayPercent: 0,  contactPerson: 'NHIS Desk',      phone: '+233302123456', email: 'info@nhis.gov.gh',    status: 'active' },
        { name: 'Acacia Health Insurance',          code: 'ACACIA', coverageType: 'percentage', defaultCopayPercent: 20, contactPerson: 'Claims Officer', phone: '+233302987654', email: 'claims@acacia.com.gh', status: 'active' },
        { name: 'Apex Health Insurance',            code: 'APEX',   coverageType: 'percentage', defaultCopayPercent: 10, status: 'active' },
      ];
      for (const p of providerDefs) {
        await InsuranceProvider.findOrCreate({ where: { code: p.code }, defaults: p });
      }
      console.log(`✅ Ensured ${providerDefs.length} sample insurance providers\n`);
    }

    console.log('🎉 Seed completed successfully!\n');

    // ==================== SUMMARY ====================
    // Passwords are only ever echoed for the demo logins, and only outside
    // production. A live installation's log is not a place to leave a credential.
    if (demo) {
      console.log('📋 Demo sign-ins (development only):');
      [{ ...admin, password: process.env.SEED_ADMIN_PASSWORD || 'admin123' }, ...demoUsers]
        .forEach((u) => console.log(`   ${u.role.padEnd(16)} ${u.email.padEnd(25)} / ${u.password}`));
      console.log('\n⚠️  These are the demo passwords shown on the sign-in screen.');
      console.log('   Production never seeds them and refuses them at login — set SEED_ADMIN_PASSWORD in backend/.env.');
    } else {
      console.log(`📋 Sign in as ${admin.email} with the SEED_ADMIN_PASSWORD from backend/.env, then change it under Settings.`);
    }

    return true;
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    throw err;
  }
}

module.exports = seedDatabase;
module.exports.seedLabCatalogue = seedLabCatalogue;
module.exports.labCatalogueEnabled = labCatalogueEnabled;

// Allow running standalone: `node seed.js`
if (require.main === module) {
  seedDatabase()
    .then(() => { console.log('✅ Seeding complete!'); process.exit(0); })
    .catch(() => process.exit(1));
}