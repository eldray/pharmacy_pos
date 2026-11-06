// backend/tests/validators.test.js — allow-listing, payment-method casing,
// and the numeric-id guard that stops `/transactions/undefined` reaching Postgres.
const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizePaymentMethod, pick, validatePassword, validateEmail, PAYMENT_METHODS } = require('../utils/validators');
const { numericIdParams, NUMERIC_PARAMS } = require('../utils/numericIdParams');

test('payment methods collapse to the form the reports group on', () => {
  for (const variant of ['Cash', 'cash', ' CASH ', 'Card', 'MTN', 'Vodafone', 'airteltigo']) {
    assert.equal(PAYMENT_METHODS.includes(normalizePaymentMethod(variant)), true, variant);
  }
  assert.equal(normalizePaymentMethod('Cash'), 'cash');
  assert.equal(normalizePaymentMethod('MTN'), 'mtn');
  assert.equal(normalizePaymentMethod('MPESA'), 'mpesa'); // unknown keeps its own spelling
  assert.equal(normalizePaymentMethod(null), null);
  assert.equal(normalizePaymentMethod(undefined), null);
});

test('pick copies only the allow-listed keys', () => {
  const body = { name: 'Paracetamol', unitPrice: 5, id: 99, deletedAt: new Date(), status: 'paid' };
  assert.deepEqual(pick(body, ['name', 'unitPrice']), { name: 'Paracetamol', unitPrice: 5 });
  assert.deepEqual(pick(body, ['id', 'deletedAt']), { id: 99, deletedAt: body.deletedAt });
  assert.deepEqual(pick(undefined, ['name']), {});
});

test('password and email rules reject the obvious weak input', () => {
  assert.equal(validatePassword('Short1A'), 'Password must be at least 8 characters long');
  assert.equal(validatePassword('alllowercase1'), 'Password must contain an uppercase letter');
  assert.equal(validatePassword('ALLUPPERCASE1'), 'Password must contain a lowercase letter');
  assert.equal(validatePassword('NoDigitsHere'), 'Password must contain a number');
  assert.equal(validatePassword('Str0ngpass'), null);
  assert.equal(validateEmail('nope'), 'Please enter a valid email address');
  assert.equal(validateEmail('a@b.co'), null);
});

// Minimal stand-ins for the Express router/handler objects.
function runParam(value) {
  const statuses = [];
  const bodies = [];
  const res = {
    status(code) { statuses.push(code); return this; },
    json(body) { bodies.push(body); return this; }
  };
  const req = { params: { id: value } };
  let called = false;
  const router = { param(name, fn) { if (name === 'id') this.fn = fn; return this; } };

  numericIdParams(router);
  router.fn(req, res, () => { called = true; }, req.params.id);
  return { called, statuses, bodies, req };
}

test('numeric ids are coerced to numbers', () => {
  const { called, statuses, req } = runParam('42');
  assert.equal(called, true);
  assert.equal(statuses.length, 0);
  assert.equal(req.params.id, 42);
  assert.equal(typeof req.params.id, 'number');
});

test('non-numeric ids are refused before reaching the database', () => {
  for (const bad of ['undefined', 'NaN', 'null', '7; DROP TABLE products;--', '1.5', '', '12345678901']) {
    const { called, statuses, bodies } = runParam(bad);
    assert.equal(called, false, `next() must not run for ${JSON.stringify(bad)}`);
    assert.equal(statuses[0], 400);
    assert.match(bodies[0].message, /must be a numeric id/);
  }
});

test('every id parameter a route uses is guarded', () => {
  assert.deepEqual(NUMERIC_PARAMS.sort(), ['id', 'insId', 'productId', 'testId'].sort());
});

// The normaliser only helps if a write path cannot dodge it. transactions is a
// plain VARCHAR (lab_transactions is an ENUM), so the guard belongs on the model.
test('the Transaction model normalises paymentMethod whatever the caller passes', () => {
  const Transaction = require('../models/Transaction');
  const cases = [['Cash', 'cash'], [' CASH ', 'cash'], ['MTN MoMo', 'mtn momo'], ['mtn', 'mtn']];
  for (const [input, expected] of cases) {
    const built = Transaction.build({ total: 1, paymentMethod: input });
    assert.equal(built.paymentMethod, expected, input);
    assert.equal(built.dataValues.paymentMethod, expected, `${input} must be stored, not just read back`);
  }
  assert.equal(Transaction.build({ total: 1, paymentMethod: null }).paymentMethod, null);
});
