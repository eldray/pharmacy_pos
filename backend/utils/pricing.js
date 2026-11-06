// Server-authoritative cart pricing.
//
// Prices used to be read straight off the request body, so a modified client
// could record a GHS 500 sale as GHS 0.01 and every profit report followed it.
// These helpers take the catalogue (products + company VAT rate) as the source
// of truth and mirror the till's own calculator (frontend store `getCartTotal`
// and the co-pay memo in `POSInterface.tsx`) so a receipt still matches the
// screen the customer was quoted.

const Product = require('../models/Product');
const Company = require('../models/Company');
const InsuranceProvider = require('../models/InsuranceProvider');
const LabTestTemplate = require('../models/LabTestTemplate');
const { AppError } = require('./errors');

const TAX_RATE_FALLBACK = 15;

// Money is stored in DECIMAL(10,2); rounding here keeps subtotal + tax === total
// in the row instead of letting Postgres round each column independently.
const round2 = (value) => Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;

// The POS sells at `sellingPrice` when one is set; `unitPrice` is the fallback.
function unitPriceOf(product) {
  return Number(product.sellingPrice || product.unitPrice) || 0;
}

function resolveTaxRate(taxRate) {
  if (taxRate == null) return TAX_RATE_FALLBACK;
  const parsed = Number(taxRate);
  return Number.isFinite(parsed) ? parsed : TAX_RATE_FALLBACK;
}

// Price a cart from DB rows. Returns per-line snapshots (price, cost, schedule)
// plus the ticket totals the UI shows: `subtotal` is net of discounts, because
// that is what the frontend labels "subtotal" when it posts a sale.
function priceCart(items, productsById, taxRate, cartDiscount = 0) {
  const rate = resolveTaxRate(taxRate);

  let gross = 0;
  let lineDiscounts = 0;

  const lines = items.map((item) => {
    const product = productsById.get(String(item?.productId));
    if (!product) {
      throw new AppError(`Product ${item?.productId} is not in the catalogue`, 400);
    }

    const quantity = Number(item.quantity) || 0;
    if (quantity <= 0) {
      throw new AppError(`Invalid quantity for ${product.name}`, 400);
    }

    const unitPrice = unitPriceOf(product);
    const lineTotal = round2(quantity * unitPrice);
    const discount = round2(Math.min(Math.max(Number(item.discount) || 0, 0), lineTotal));

    gross += lineTotal;
    lineDiscounts += discount;

    return {
      productId: product.id,
      product: { name: product.name, sku: product.sku, category: product.category },
      quantity,
      unitPrice,
      total: lineTotal,
      discount,
      cost: Number(product.cost) || 0,
      schedule: product.schedule || 'none',
      insurancePrice: Number(product.insurancePrice) || 0
    };
  });

  const ticketDiscount = round2(Math.min(Math.max(Number(cartDiscount) || 0, 0), gross - lineDiscounts));
  const subtotal = round2(gross - lineDiscounts - ticketDiscount);
  const tax = round2(subtotal * (rate / 100));

  return {
    lines,
    grossSubtotal: round2(gross),
    discount: round2(lineDiscounts + ticketDiscount),
    subtotal,
    tax,
    total: round2(subtotal + tax),
    taxRate: rate
  };
}

// Load the catalogue rows a cart needs, then price it. `transaction` keeps the
// read inside the caller's payment transaction.
async function priceCartItems(items, { transaction, cartDiscount = 0 } = {}) {
  const ids = [...new Set(items.map((i) => i?.productId).filter(Boolean))];
  if (!ids.length) throw new AppError('Cart items need a productId', 400);

  const products = await Product.findAll({
    where: { id: ids },
    attributes: ['id', 'name', 'sku', 'category', 'unitPrice', 'sellingPrice', 'cost', 'quantity', 'schedule', 'insurancePrice'],
    transaction
  });

  if (products.length !== ids.length) {
    const found = new Set(products.map((p) => String(p.id)));
    const missing = ids.filter((id) => !found.has(String(id))).join(', ');
    throw new AppError(`Unknown product id(s): ${missing}`, 400);
  }

  const byId = new Map(products.map((p) => [String(p.id), p]));
  const company = await Company.getCompany();
  return priceCart(items, byId, company.taxRate, cartDiscount);
}

// Dual co-pay split, mirroring POSInterface: NHIS-style "fixed" providers cover
// the per-unit insurer price, private ones take a copay percentage.
//
// VAT is charged on the whole sale, so the insurer's share and the patient's
// share must add up to the VAT-inclusive ticket. Covering only the net part left
// the VAT on the insurer's portion owed by nobody: an order stored 5.75
// (5.00 + 0.75 VAT) while 80% + 20%-plus-VAT summed to 5.15. The patient's
// amount is unchanged — 20% of the subtotal plus 20% of the VAT is the same
// money as 20% of the VAT-inclusive total.
function insuranceSplit(provider, lines, subtotal, taxRate) {
  const rate = resolveTaxRate(taxRate);
  const ticket = round2(subtotal + subtotal * (rate / 100));
  const grossOf = 1 + rate / 100;

  if (provider.coverageType === 'fixed') {
    let patientSub = 0;
    for (const line of lines) {
      const insurerPrice = Number(line.insurancePrice) || 0;
      // The agreed tariff is capped against the net line, never the VAT.
      const lineCovered = round2(Math.min(line.total, insurerPrice * line.quantity));
      patientSub += line.total - lineCovered;
    }
    const copayAmount = round2(patientSub * grossOf);
    return { insuranceCoverage: round2(ticket - copayAmount), copayAmount };
  }

  const copayPct = (Number(provider.defaultCopayPercent) || 0) / 100;
  const copayAmount = round2(subtotal * copayPct * grossOf);
  return { insuranceCoverage: round2(ticket - copayAmount), copayAmount };
}

// Never trust a client-supplied provider id: look it up and derive the amounts.
async function resolveInsurance(insuranceProviderId, priced, { taxRate, transaction } = {}) {
  const rate = taxRate == null ? priced.taxRate : taxRate;

  if (!insuranceProviderId) {
    return { insuranceProviderId: null, insuranceProviderName: null, insuranceCoverage: 0, copayAmount: priced.total };
  }

  const provider = await InsuranceProvider.findByPk(insuranceProviderId, { transaction });
  if (!provider) throw new AppError('Insurance provider not found', 400);

  const split = insuranceSplit(provider, priced.lines, priced.subtotal, rate);

  return {
    insuranceProviderId: provider.id,
    insuranceProviderName: provider.name,
    insuranceCoverage: split.insuranceCoverage,
    copayAmount: split.copayAmount
  };
}

// Lab tests are priced from their template (names are unique). `testPrice` is
// the UNIT price and `quantity` is carried alongside it, which is what the
// ledger and PaymentPage already assume.
async function priceLabTests(tests, { transaction } = {}) {
  const names = [...new Set(tests.map((t) => t?.testType || t?.name).filter(Boolean))];
  if (!names.length) throw new AppError('At least one test is required', 400);

  const templates = await LabTestTemplate.findAll({ where: { name: names }, transaction });
  const byName = new Map(templates.map((t) => [t.name, t]));

  let subtotal = 0;
  const lines = tests.map((test) => {
    const name = test?.testType || test?.name;
    const template = byName.get(name);
    if (!template) throw new AppError(`Unknown lab test: ${name || '(blank)'}`, 400);

    const quantity = Math.max(1, Number(test.quantity) || 1);
    const unitPrice = round2(Number(template.price) || 0);
    const total = round2(unitPrice * quantity);
    subtotal += total;

    return {
      testType: template.name,
      testCategory: template.category,
      testPrice: unitPrice,
      quantity,
      total,
      sampleType: template.sampleType || null,
      insurancePrice: Number(template.insurancePrice) || 0
    };
  });

  // Lab orders carry no VAT today (the request modal posts tax: 0).
  return { lines, subtotal, tax: 0, total: subtotal, taxRate: 0 };
}

module.exports = {
  TAX_RATE_FALLBACK,
  unitPriceOf,
  priceCart,
  priceCartItems,
  priceLabTests,
  insuranceSplit,
  resolveInsurance
};
