// backend/tests/dateRange.test.js — the end-of-day boundary that silently hid a
// whole day from Sales History, end-of-day and the reports.
const test = require('node:test');
const assert = require('node:assert/strict');

const { Op } = require('sequelize');
const { createdAtRange, inclusiveEnd } = require('../utils/dateRange');

test('a date-only upper bound covers its whole day', () => {
  const end = inclusiveEnd('2026-11-05');
  assert.equal(end.toISOString(), '2026-11-05T23:59:59.999Z');
});

test('bounds that already carry a time are left alone', () => {
  // Some screens send an exclusive next-day bound on purpose.
  assert.equal(inclusiveEnd('2026-11-06T00:00:00Z').toISOString(), '2026-11-06T00:00:00.000Z');
  assert.equal(inclusiveEnd('2026-11-05 18:30:00') instanceof Date, true);
});

test('range keys are gte/lte on createdAt', () => {
  const range = createdAtRange('2026-11-01', '2026-11-05');
  const keys = Object.getOwnPropertySymbols(range);
  assert.equal(keys.length, 2);
  assert.ok(keys.includes(Op.gte));
  assert.ok(keys.includes(Op.lte));
  assert.equal(range[Op.gte].toISOString(), '2026-11-01T00:00:00.000Z');
  assert.equal(range[Op.lte].toISOString(), '2026-11-05T23:59:59.999Z');
});

test('a sale at 23:58 on the last day is inside the range', () => {
  const sale = new Date('2026-11-05T23:58:12Z');
  assert.equal(sale <= inclusiveEnd('2026-11-05'), true);
  // A raw midnight bound — the bug this helper exists to prevent.
  assert.equal(sale <= new Date('2026-11-05'), false);
});
