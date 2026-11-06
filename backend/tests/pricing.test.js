// backend/tests/pricing.test.js — server-authoritative cart pricing.
// Run with `npm test` from the backend folder.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  priceCart,
  insuranceSplit,
  unitPriceOf,
  TAX_RATE_FALLBACK
} = require('../utils/pricing');

const products = [
  { id: 1, name: 'Paracetamol', sku: 'P1', category: 'Analgesic', unitPrice: 5, sellingPrice: 6, cost: 2, schedule: 'none', insurancePrice: 4 },
  { id: 2, name: 'Amoxicillin', sku: 'A1', category: 'Antibiotic', unitPrice: 10, sellingPrice: null, cost: 7, schedule: 'II', insurancePrice: 0 },
  { id: 3, name: 'Sachet', sku: 'S1', category: 'OTC', unitPrice: 0.05, sellingPrice: 0.05, cost: 0.01, schedule: 'none', insurancePrice: 0 }
];
const byId = new Map(products.map((p) => [String(p.id), p]));

const line = (productId, quantity, discount = 0) => ({ productId, quantity, discount });

test('unit price prefers sellingPrice over unitPrice', () => {
  assert.equal(unitPriceOf(products[0]), 6);
  assert.equal(unitPriceOf(products[1]), 10);
});

test('cart totals come from the catalogue, not the request body', () => {
  // A client that claims these lines are worth GHS 0.01 is ignored.
  const priced = priceCart(
    [
      { productId: 1, quantity: 2, unitPrice: 0.01, total: 0.02 },
      { productId: 2, quantity: 1, unitPrice: 0.01, total: 0.01 }
    ],
    byId,
    15
  );

  assert.equal(priced.grossSubtotal, 22);
  assert.equal(priced.subtotal, 22);
  assert.equal(priced.tax, 3.3);
  assert.equal(priced.total, 25.3);
  assert.equal(priced.lines[0].unitPrice, 6);
  assert.equal(priced.lines[1].unitPrice, 10);
});

test('subtotal and tax always add up to the total in stored cents', () => {
  // 0.05 × 3 at 15% would otherwise round each column independently.
  for (const qty of [1, 3, 7, 13]) {
    const priced = priceCart([line(3, qty)], byId, 15);
    const cents = (v) => Math.round(Number(v) * 100);
    assert.equal(cents(priced.subtotal) + cents(priced.tax), cents(priced.total), `qty ${qty}`);
  }
});

test('missing VAT rate falls back to the documented default', () => {
  assert.equal(TAX_RATE_FALLBACK, 15);
  assert.equal(priceCart([line(1, 1)], byId, null).taxRate, 15);
  assert.equal(priceCart([line(1, 1)], byId, 'not-a-number').taxRate, 15);
  // 0% is a configured rate, not a missing one. The rate itself has to survive
  // too: the receipt prints "VAT (n%)", so a fallback leaking in here would
  // print 15% on a ticket that was charged nothing.
  assert.equal(priceCart([line(1, 1)], byId, 0).tax, 0);
  assert.equal(priceCart([line(1, 1)], byId, 0).taxRate, 0);
  assert.equal(priceCart([line(1, 1)], byId, '0.00').taxRate, 0);
});

test('discounts are capped at what the line is actually worth', () => {
  const priced = priceCart([line(1, 1, 500)], byId, 0);
  assert.equal(priced.discount, 6);
  assert.equal(priced.subtotal, 0);

  // Ticket-level discount cannot exceed what the line discounts left over.
  const withTicketDiscount = priceCart([line(1, 1)], byId, 0, 999);
  assert.equal(withTicketDiscount.discount, 6);
  assert.equal(withTicketDiscount.subtotal, 0);
});

test('unknown products and non-positive quantities are refused', () => {
  assert.throws(() => priceCart([line(999, 1)], byId, 15), /not in the catalogue/);
  assert.throws(() => priceCart([line(1, 0)], byId, 15), /Invalid quantity/);
  assert.throws(() => priceCart([line(1, -3)], byId, 15), /Invalid quantity/);
});

test('percentage provider at 0% VAT splits the subtotal', () => {
  const provider = { coverageType: 'percentage', defaultCopayPercent: 20 };
  const priced = priceCart([line(1, 1), line(2, 1)], byId, 0); // subtotal 16

  const split = insuranceSplit(provider, priced.lines, priced.subtotal, 0);
  assert.equal(split.insuranceCoverage, 12.8);
  assert.equal(split.copayAmount, 3.2);
});

test('fixed provider covers its per-unit price and never more than the line', () => {
  // Line 1 sells at 6, insurer pays 4/unit → patient 2. Line 2 has no agreed
  // insurer price → patient pays all 10.
  const provider = { coverageType: 'fixed', defaultCopayPercent: 0 };
  const priced = priceCart([line(1, 1), line(2, 1)], byId, 0);

  const split = insuranceSplit(provider, priced.lines, priced.subtotal, 0);
  assert.equal(split.insuranceCoverage, 4);
  assert.equal(split.copayAmount, 12);
});

test('fixed coverage is capped when the insurer price exceeds the line', () => {
  const expensiveIns = { id: 4, name: 'Cap', sku: 'C4', category: 'x', unitPrice: 1, sellingPrice: 1, cost: 0, schedule: 'none', insurancePrice: 50 };
  const map = new Map([['4', expensiveIns]]);
  const priced = priceCart([line(4, 2)], map, 0); // total 2, insurer price 50/unit

  const split = insuranceSplit({ coverageType: 'fixed' }, priced.lines, priced.subtotal, 0);
  assert.equal(split.insuranceCoverage, 2);
  assert.equal(split.copayAmount, 0);
});

// The bug these catch: coverage was a share of the net subtotal while the ticket
// was VAT-inclusive, so coverage + copay fell short of `total` by the VAT on the
// insurer's portion — money the pharmacy collected from nobody.
test('the two shares always reconcile to the VAT-inclusive ticket', () => {
  const cents = (v) => Math.round(Number(v) * 100);
  for (const rate of [0, 5, 15, 19.5]) {
    const priced = priceCart([line(1, 2), line(2, 1), line(3, 7)], byId, rate);
    const providers = [
      { coverageType: 'percentage', defaultCopayPercent: 20 },
      { coverageType: 'percentage', defaultCopayPercent: 0 },
      { coverageType: 'percentage', defaultCopayPercent: 100 },
      { coverageType: 'fixed', defaultCopayPercent: 0 }
    ];
    for (const provider of providers) {
      const split = insuranceSplit(provider, priced.lines, priced.subtotal, rate);
      assert.equal(
        cents(split.insuranceCoverage) + cents(split.copayAmount),
        cents(priced.total),
        `${provider.coverageType} @ ${rate}% VAT (${JSON.stringify(split)})`
      );
    }
  }
});

test('a 20% copay at 15% VAT is the same patient money as before', () => {
  const priced = priceCart([line(1, 1), line(2, 1)], byId, 15); // 16 net, 18.40 incl

  const split = insuranceSplit({ coverageType: 'percentage', defaultCopayPercent: 20 }, priced.lines, priced.subtotal, 15);
  assert.equal(split.copayAmount, 3.68); // 3.20 net + 0.48 VAT
  assert.equal(split.insuranceCoverage, 14.72); // 12.80 net + 1.92 VAT
});

test('a fixed tariff covers its net price plus the VAT on that price', () => {
  // Line 1: sells 6, insurer tariff 4 → insurer owes 4 + its 0.60 VAT.
  // Line 2: no tariff → patient pays the whole 10 + 1.50 VAT.
  const priced = priceCart([line(1, 1), line(2, 1)], byId, 15);

  const split = insuranceSplit({ coverageType: 'fixed', defaultCopayPercent: 0 }, priced.lines, priced.subtotal, 15);
  assert.equal(split.copayAmount, 13.8);
  assert.equal(split.insuranceCoverage, 4.6);
});
