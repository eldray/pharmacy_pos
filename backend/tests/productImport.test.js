// backend/tests/productImport.test.js — the catalogue reader behind
// `npm run import:products`, plus the production password rules that keep a
// carried-over demo database from staying sign-in-able on a live till.
const test = require('node:test');
const assert = require('node:assert/strict');

const { parseCsv } = require('../utils/csv');
const { validateCatalogue } = require('../utils/productImport');
const { validatePassword } = require('../utils/validators');
const { isProduction, isDemoSeedAllowed, isDemoPassword } = require('../utils/environment');

const HEADER = 'name,sku,barcode,category,unitPrice,cost,quantity,expiryDate';
const GOOD = 'Paracetamol 500mg,PAR-500,6001234500017,Pain Relief,2.50,1.20,240,2027-11-30';

test('CSV reader handles quotes, embedded commas/newlines, CRLF and a BOM', () => {
  const csv = '\uFEFFname,note\r\n"Paracetamol, 500mg","says ""take twice""\ndaily"\r\nIbuprofen,plain\r\n';
  assert.deepEqual(parseCsv(csv), [
    { name: 'Paracetamol, 500mg', note: 'says "take twice"\ndaily' },
    { name: 'Ibuprofen', note: 'plain' },
  ]);
});

test('CSV reader skips blank lines and rejects a broken file', () => {
  assert.deepEqual(parseCsv('a,b\n\n1,2\n\n'), [{ a: '1', b: '2' }]);
  assert.deepEqual(parseCsv(''), []);
  assert.throws(() => parseCsv('a,b\n"unterminated,2'), /Unterminated quoted field/);
  assert.throws(() => parseCsv('a,a\n1,2'), /Duplicate CSV column/);
});

test('a valid row imports with exactly the values in the file', () => {
  const { products, errors } = validateCatalogue(parseCsv(`${HEADER}\n${GOOD}`));
  assert.deepEqual(errors, []);
  assert.deepEqual(products, [{
    name: 'Paracetamol 500mg',
    sku: 'PAR-500',
    barcode: '6001234500017',
    category: 'Pain Relief',
    unitPrice: 2.5,
    cost: 1.2,
    quantity: 240,
    expiryDate: '2027-11-30',
  }]);
});

test('header spelling and currency formatting do not fail an import', () => {
  const csv = 'Name,SKU,Barcode,Category,Unit Price,Cost\nAmoxicillin,AMX-1,BAR-1,Antibiotics,"GHS 4,000.50",2.10';
  const { products, errors } = validateCatalogue(parseCsv(csv));
  assert.deepEqual(errors, []);
  assert.equal(products[0].unitPrice, 4000.5);
  assert.equal(products[0].sku, 'AMX-1');
});

test('missing required values and bad numbers are errors, not guesses', () => {
  const { products, errors } = validateCatalogue([
    { name: '', sku: 'X1', barcode: 'B1', category: 'C', unitPrice: '5' },
    { name: 'N', sku: 'X2', barcode: 'B2', category: 'C', unitPrice: 'free' },
    { name: 'N', sku: 'X3', barcode: 'B3', category: 'C', unitPrice: '0' },
    { name: 'N', sku: 'X4', barcode: 'B4', category: 'C', unitPrice: '5', quantity: '2.5' },
    { name: 'N', sku: 'X5', barcode: 'B5', category: 'C', unitPrice: '5', expiryDate: '31/12/2027' },
    { name: 'N', sku: 'X6', barcode: 'B6', category: 'C', unitPrice: '5', expiryDate: '2027-02-31' },
    { name: 'N', sku: 'X7', barcode: 'B7', category: 'C', unitPrice: '5', schedule: 'X' },
  ]);
  assert.equal(products.length, 0);
  assert.equal(errors.length, 7);
  assert.match(errors[0], /Line 2: name is required/);
  assert.match(errors[1], /unitPrice "free" is not a number/);
  assert.match(errors[2], /unitPrice must be greater than 0/);
  assert.match(errors[3], /quantity must be a whole number/);
  assert.match(errors[4], /expiryDate must be YYYY-MM-DD/);
  assert.match(errors[5], /is not a real date/);
  assert.match(errors[6], /schedule must be one of/);
});

test('duplicates inside one file are caught before they reach the unique index', () => {
  const { products, errors } = validateCatalogue([
    { name: 'A', sku: 'SAME', barcode: 'B1', category: 'C', unitPrice: '5' },
    { name: 'B', sku: 'OTHER', barcode: 'B1', category: 'C', unitPrice: '5' },
    { name: 'C', sku: 'SAME', barcode: 'B3', category: 'C', unitPrice: '5' },
  ]);
  assert.equal(products.length, 1);
  assert.equal(errors.length, 2);
  assert.match(errors[0], /barcode "B1" duplicates line 2/);
  assert.match(errors[1], /sku "SAME" duplicates line 2/);
});

test('absent cost and expiry warn instead of being invented', () => {
  const { products, errors, warnings } = validateCatalogue([
    { name: 'A', sku: 'S1', barcode: 'B1', category: 'C', unitPrice: '5' },
  ]);
  assert.deepEqual(errors, []);
  assert.equal(products[0].cost, undefined);
  assert.equal(products[0].quantity, undefined);
  assert.equal(products[0].expiryDate, undefined);
  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /no cost price/);
  assert.match(warnings[1], /no expiryDate/);
});

test('a past expiry date and an upside-down margin are warnings, not silent passes', () => {
  const { products, errors, warnings } = validateCatalogue([
    { name: 'A', sku: 'S1', barcode: 'B1', category: 'C', unitPrice: '5', cost: '9', expiryDate: '2020-01-01' },
  ]);
  assert.deepEqual(errors, []);
  assert.equal(products.length, 1);
  assert.ok(warnings.some((w) => /every sale will show a loss/.test(w)));
  assert.ok(warnings.some((w) => /already past/.test(w)));
});

test('schedule is case-insensitive and stored in the form the reports filter on', () => {
  const { products, errors } = validateCatalogue([
    { name: 'A', sku: 'S1', barcode: 'B1', category: 'C', unitPrice: '5', schedule: 'none' },
    { name: 'B', sku: 'S2', barcode: 'B2', category: 'C', unitPrice: '5', schedule: 'iv' },
  ]);
  assert.deepEqual(errors, []);
  assert.equal(products[0].schedule, 'none');
  assert.equal(products[1].schedule, 'IV');
});

test('production seeds no demo data and knows the published passwords', () => {
  const previous = process.env.NODE_ENV;
  const previousDemo = process.env.SEED_DEMO;
  try {
    process.env.NODE_ENV = 'production';
    assert.equal(isProduction(), true);
    assert.equal(isDemoSeedAllowed(), false);
    for (const demo of ['admin123', 'manager123', 'cashier123', 'pharmacist123', 'lab123']) {
      assert.equal(isDemoPassword(demo), true, demo);
      // The seed refuses these in production, so a live till cannot be created
      // with one; login refuses them too, for a database carried over from demo.
      assert.notEqual(validatePassword(demo), null, demo);
    }
    assert.equal(validatePassword('Str0ngpass'), null);
    assert.equal(isDemoPassword('Str0ngpass'), false);

    process.env.NODE_ENV = 'development';
    assert.equal(isDemoSeedAllowed(), true);
    process.env.SEED_DEMO = 'false';
    assert.equal(isDemoSeedAllowed(), false);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
    if (previousDemo === undefined) delete process.env.SEED_DEMO; else process.env.SEED_DEMO = previousDemo;
  }
});