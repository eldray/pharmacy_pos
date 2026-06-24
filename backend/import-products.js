// backend/import-products.js
// Non-destructive product import: inserts products from data/products.json
// whose SKU (or barcode) does not already exist. Existing data is untouched.
//
// Usage:  node import-products.js         (from the backend folder)
//    or:  npm run import:products
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { sequelize } = require('./config/database');
const { Product } = require('./models');

function loadProducts() {
  const filePath = path.join(__dirname, 'data', 'products.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return data.products || [];
}

async function main() {
  try {
    console.log('🔌 Connecting to PostgreSQL...');
    await sequelize.authenticate();
    // Make sure the products table exists without altering existing data.
    await Product.sync();

    const incoming = loadProducts();
    console.log(`📦 ${incoming.length} products in products.json`);

    // Find which SKUs / barcodes already exist so we skip them.
    const skus = incoming.map((p) => p.sku).filter(Boolean);
    const barcodes = incoming.map((p) => p.barcode).filter(Boolean);

    const existing = await Product.findAll({
      where: { [Op.or]: [{ sku: skus }, { barcode: barcodes }] },
      attributes: ['sku', 'barcode'],
      paranoid: false, // also treat soft-deleted rows as "taken" (unique constraint)
    });

    const takenSku = new Set(existing.map((p) => p.sku));
    const takenBarcode = new Set(existing.map((p) => p.barcode));

    const toInsert = incoming.filter(
      (p) => !takenSku.has(p.sku) && !takenBarcode.has(p.barcode)
    );

    if (toInsert.length === 0) {
      console.log('✅ Nothing to import — all products already present.');
    } else {
      const created = await Product.bulkCreate(toInsert);
      console.log(`✅ Imported ${created.length} new product(s):`);
      created.forEach((p) => console.log(`   - ${p.name} (${p.sku})`));
    }

    const skipped = incoming.length - toInsert.length;
    if (skipped > 0) console.log(`↩️  Skipped ${skipped} already-existing product(s).`);

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Import failed:', err.message);
    process.exit(1);
  }
}

main();
