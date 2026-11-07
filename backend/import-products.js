// backend/import-products.js
//
// Loads a pharmacy's real drug catalogue. Non-destructive: a product whose SKU
// or barcode already exists is skipped, never overwritten, and nothing is
// deleted. Every value comes from the file — no random stock, no invented batch
// numbers or expiry dates.
//
//   node import-products.js --file data/my-catalogue.csv --dry-run
//   node import-products.js --file data/my-catalogue.csv
//   npm run import:products -- --file data/my-catalogue.csv
//
// With no --file it reads data/products.json, which is the development sample.
// Columns (CSV header or JSON keys, spelling-insensitive):
//   required  name, sku, barcode, category, unitPrice
//   optional  cost, quantity, description, batchNumber, expiryDate (YYYY-MM-DD),
//             supplier, packageType, dispensingUnit, unitsPerPackage,
//             packagePrice, sellingPrice, insurancePrice, allowUnitBreakdown,
//             schedule (none | II | III | IV | V)
// See data/products.example.csv for a template.
require('dotenv').config();
const { Op } = require('sequelize');
const { sequelize } = require('./config/database');
const { Product, Branch, BranchInventory } = require('./models');
const { readCatalogue, validateCatalogue } = require('./utils/productImport');

function parseArgs(argv) {
  const args = { file: 'data/products.json', dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run' || arg === '-n') args.dryRun = true;
    else if (arg === '--file' || arg === '-f') args.file = argv[++i];
    else if (arg.startsWith('--file=')) args.file = arg.slice('--file='.length);
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument "${arg}" — try --help`);
  }
  if (!args.file) throw new Error('--file needs a path');
  return args;
}

const HELP = `Usage: node import-products.js [--file <path.csv|path.json>] [--dry-run]

  --file, -f   Catalogue to load (default: data/products.json)
  --dry-run,-n Validate and report what would be inserted, write nothing
  --help, -h   This message`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(HELP); return; }

  const { rows, format, filePath } = readCatalogue(args.file);
  console.log(`📄 ${filePath} (${format}) — ${rows.length} row(s)`);

  const { products, errors, warnings } = validateCatalogue(rows);
  warnings.forEach((w) => console.warn(`⚠️  ${w}`));
  if (errors.length) {
    console.error(`\n❌ ${errors.length} problem(s) — nothing was imported:`);
    errors.forEach((e) => console.error(`   ${e}`));
    process.exitCode = 1;
    return;
  }
  if (!products.length) { console.log('✅ Nothing to import — the file has no rows.'); return; }

  await sequelize.authenticate();

  // Soft-deleted rows still hold the unique SKU/barcode, so they count as taken.
  const existing = await Product.findAll({
    where: {
      [Op.or]: [
        { sku: products.map((p) => p.sku) },
        { barcode: products.map((p) => p.barcode) },
      ],
    },
    attributes: ['sku', 'barcode'],
    paranoid: false,
  });
  const takenSku = new Set(existing.map((p) => p.sku));
  const takenBarcode = new Set(existing.map((p) => p.barcode));
  const toInsert = products.filter((p) => !takenSku.has(p.sku) && !takenBarcode.has(p.barcode));
  const skipped = products.length - toInsert.length;

  console.log(`\n📦 ${toInsert.length} new product(s), ${skipped} already on file`);
  toInsert.slice(0, 10).forEach((p) => console.log(`   + ${p.name} (${p.sku}) — ${p.unitPrice}, qty ${p.quantity ?? 0}`));
  if (toInsert.length > 10) console.log(`   … and ${toInsert.length - 10} more`);

  if (args.dryRun) {
    console.log('\n🔎 Dry run — nothing was written. Re-run without --dry-run to import.');
    return;
  }
  if (!toInsert.length) { console.log('\n✅ Nothing to import.'); return; }

  const branch = await Branch.ensureMainBranch();
  const t = await sequelize.transaction();
  try {
    const created = await Product.bulkCreate(toInsert, { transaction: t });
    // The POS sells from products.quantity, but the Branches page, transfers and
    // low-stock alerts read branch_inventories — give the home branch a row for
    // each new product carrying the quantity just imported.
    const stocked = await BranchInventory.syncFromProducts(branch.id, t);
    await t.commit();
    console.log(`\n✅ Imported ${created.length} product(s) into ${branch.name} (${stocked} stock row(s) added).`);
    const noCost = created.filter((p) => !Number(p.cost)).length;
    if (noCost) console.log(`⚠️  ${noCost} have no cost price — enter one per product before trusting profit reports.`);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

main()
  .then(async () => { await sequelize.close(); })
  .catch(async (err) => {
    console.error(`\n❌ Import failed: ${err.message}`);
    await sequelize.close().catch(() => {});
    process.exit(1);
  });