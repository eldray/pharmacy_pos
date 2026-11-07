// backend/utils/productImport.js
//
// Reading and validating a real drug catalogue, kept apart from the CLI so it
// can be tested without a database. Nothing here invents a value: a missing
// price, batch number or expiry date is an error or a warning, never a guess.
// The randomised stock the development seed used to produce has no place in a
// pharmacy's live inventory.
const fs = require('fs');
const path = require('path');
const { parseCsv } = require('./csv');

const TEXT_FIELDS = ['name', 'description', 'sku', 'barcode', 'category', 'batchNumber', 'supplier', 'packageType', 'dispensingUnit'];
const MONEY_FIELDS = ['unitPrice', 'cost', 'packagePrice', 'sellingPrice', 'insurancePrice'];
const INT_FIELDS = ['quantity', 'unitsPerPackage'];
const BOOL_FIELDS = ['allowUnitBreakdown'];
const SCHEDULES = ['none', 'II', 'III', 'IV', 'V'];
const REQUIRED = ['name', 'sku', 'barcode', 'category', 'unitPrice'];

// "Unit Price", "unit_price" and "UNITPRICE" all mean unitPrice, so a catalogue
// exported from a spreadsheet does not fail on its header spelling.
const canonicalKey = (key) => String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
const FIELD_BY_KEY = new Map(
  [...TEXT_FIELDS, ...MONEY_FIELDS, ...INT_FIELDS, ...BOOL_FIELDS, 'expiryDate', 'schedule']
    .map((field) => [canonicalKey(field), field])
);

function readCatalogue(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) throw new Error(`File not found: ${resolved}`);
  const text = fs.readFileSync(resolved, 'utf8');
  const ext = path.extname(resolved).toLowerCase();

  if (ext === '.csv') return { rows: parseCsv(text), format: 'CSV', filePath: resolved };
  if (ext === '.json') {
    const data = JSON.parse(text);
    const rows = Array.isArray(data) ? data : data?.products;
    if (!Array.isArray(rows)) throw new Error('JSON must be an array of products or { "products": [...] }');
    return { rows, format: 'JSON', filePath: resolved };
  }
  throw new Error(`Unsupported file type "${ext}" — use .csv or .json`);
}

function number(value, label, errors, { integer = false, min = 0 } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') return undefined;
  // Spreadsheet exports carry thousands separators and a currency prefix. Strip
  // those, then insist on a numeric literal: coercing whatever is left with
  // Number() turns "free" or "N/A" into 0, i.e. a free drug on a live till.
  const cleaned = String(value).replace(/[\s,]/g, '').replace(/^[^\d.+-]+/, '');
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(cleaned)) {
    errors.push(`${label} "${value}" is not a number`);
    return undefined;
  }
  const n = Number(cleaned);
  if (!Number.isFinite(n)) { errors.push(`${label} "${value}" is not a number`); return undefined; }
  if (n < min) { errors.push(`${label} must be ${min} or more (got ${n})`); return undefined; }
  if (integer && !Number.isInteger(n)) { errors.push(`${label} must be a whole number (got ${n})`); return undefined; }
  return n;
}

/**
 * @returns {{ products: object[], errors: string[], warnings: string[] }}
 * errors are per-line and stop the import; warnings are reported and allowed.
 */
function validateCatalogue(rawRows) {
  const errors = [];
  const warnings = [];
  const products = [];
  const seenSku = new Map();
  const seenBarcode = new Map();

  rawRows.forEach((raw, i) => {
    // +2: one header row, and humans count lines from 1.
    const line = i + 2;
    const where = `Line ${line}`;
    const rowErrors = [];
    const rowWarnings = [];

    const input = {};
    const unknown = [];
    for (const [key, value] of Object.entries(raw || {})) {
      const field = FIELD_BY_KEY.get(canonicalKey(key));
      if (field) input[field] = value;
      else if (String(key).trim() && String(value ?? '').trim()) unknown.push(key);
    }
    if (unknown.length) rowWarnings.push(`${where}: ignoring unknown column(s) ${unknown.join(', ')}`);

    const row = {};
    for (const field of TEXT_FIELDS) {
      const value = input[field] == null ? '' : String(input[field]).trim();
      if (value) row[field] = value;
    }

    for (const field of MONEY_FIELDS) {
      const n = number(input[field], `${where}: ${field}`, rowErrors);
      if (n !== undefined) row[field] = n;
    }
    for (const field of INT_FIELDS) {
      const n = number(input[field], `${where}: ${field}`, rowErrors, { integer: true, min: field === 'unitsPerPackage' ? 1 : 0 });
      if (n !== undefined) row[field] = n;
    }
    for (const field of REQUIRED) {
      if (input[field] == null || String(input[field]).trim() === '') rowErrors.push(`${where}: ${field} is required`);
    }
    for (const field of BOOL_FIELDS) {
      const value = String(input[field] ?? '').trim().toLowerCase();
      if (!value) continue;
      if (['true', 'yes', '1'].includes(value)) row[field] = true;
      else if (['false', 'no', '0'].includes(value)) row[field] = false;
      else rowErrors.push(`${where}: ${field} must be true/false (got "${input[field]}")`);
    }

    if (row.unitPrice !== undefined && row.unitPrice <= 0) {
      rowErrors.push(`${where}: unitPrice must be greater than 0`);
    }
    if (row.cost !== undefined && row.unitPrice !== undefined && row.cost > row.unitPrice) {
      rowWarnings.push(`${where}: cost (${row.cost}) is above the selling price (${row.unitPrice}) — every sale will show a loss`);
    }
    if (row.cost === undefined) {
      rowWarnings.push(`${where}: no cost price — profit and COGS reports will show a 100% margin until one is entered`);
    }

    const expiry = String(input.expiryDate ?? '').trim();
    if (expiry) {
      // DATEONLY: anything else is silently coerced by Postgres into a wrong day.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
        rowErrors.push(`${where}: expiryDate must be YYYY-MM-DD (got "${expiry}")`);
      } else {
        const parsed = new Date(`${expiry}T00:00:00Z`);
        if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== expiry) {
          rowErrors.push(`${where}: expiryDate "${expiry}" is not a real date`);
        } else {
          row.expiryDate = expiry;
          if (parsed.getTime() < Date.now()) rowWarnings.push(`${where}: expiryDate ${expiry} is already past`);
        }
      }
    } else {
      rowWarnings.push(`${where}: no expiryDate — expiry alerts cannot cover this product`);
    }

    const schedule = String(input.schedule ?? '').trim();
    if (schedule) {
      const upper = schedule.toUpperCase();
      if (!SCHEDULES.some((s) => s.toUpperCase() === upper)) {
        rowErrors.push(`${where}: schedule must be one of ${SCHEDULES.join(', ')} (got "${schedule}")`);
      } else {
        row.schedule = upper === 'NONE' ? 'none' : upper;
      }
    }

    for (const [field, seen] of [['sku', seenSku], ['barcode', seenBarcode]]) {
      if (!row[field]) continue;
      if (seen.has(row[field])) rowErrors.push(`${where}: ${field} "${row[field]}" duplicates line ${seen.get(row[field])}`);
      else seen.set(row[field], line);
    }

    errors.push(...rowErrors);
    warnings.push(...rowWarnings);
    if (!rowErrors.length) products.push(row);
  });

  return { products, errors, warnings };
}

module.exports = { readCatalogue, validateCatalogue, REQUIRED, SCHEDULES };