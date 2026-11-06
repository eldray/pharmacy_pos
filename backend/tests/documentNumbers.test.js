// backend/tests/documentNumbers.test.js
//
// Sequential document numbers are the one place where two tills genuinely write at
// the same instant, so the counter has to be atomic under concurrency and must not
// hand out a number for a document that never committed. Both are invisible until a
// busy Saturday, so they are asserted here.
//
// Everything runs against a throwaway prefix: an unseen prefix self-registers, so
// the real MED/LAB counters are not advanced by the test suite.
require('dotenv').config();

const test = require('node:test');
const assert = require('node:assert/strict');

const { sequelize } = require('../config/database');
const { nextReference, SEQUENCE_START } = require('../utils/references');

const PREFIX = 'ZZTEST';

async function counter(name) {
  const rows = await sequelize.query(
    `select "next_value" from "document_sequences" where "name" = :name`,
    { replacements: { name }, type: sequelize.QueryTypes.SELECT }
  );
  // BIGINT arrives as a string; compare as numbers.
  return rows.length ? Number(rows[0].next_value) : null;
}

test.before(async () => {
  // Start from a clean slate even if an earlier run was interrupted.
  await sequelize.query(`delete from "document_sequences" where "name" = :name`, {
    replacements: { name: PREFIX },
  });
});

test.after(async () => {
  await sequelize.query(`delete from "document_sequences" where "name" = :name`, {
    replacements: { name: PREFIX },
  });
  await sequelize.close();
});

test('issues PREFIX-NNNNNNN starting at the documented first number', async () => {
  const first = await nextReference(PREFIX);
  assert.equal(first, `${PREFIX}-${SEQUENCE_START}`);
  assert.match(first, /^ZZTEST-\d{7}$/);

  const second = await nextReference(PREFIX);
  assert.equal(second, `${PREFIX}-${SEQUENCE_START + 1}`, 'numbers must advance by exactly one');
});

test('concurrent callers get distinct numbers with no gaps', async () => {
  const before = await counter(PREFIX);
  const issued = await Promise.all(Array.from({ length: 12 }, () => nextReference(PREFIX)));

  const unique = new Set(issued);
  assert.equal(unique.size, 12, `12 concurrent calls collided: ${issued.join(', ')}`);

  const sequence = [...unique].map((n) => Number(n.split('-')[1])).sort((a, b) => a - b);
  assert.equal(
    sequence[sequence.length - 1] - sequence[0],
    11,
    'concurrent numbers left a gap, so the counter is not atomic'
  );

  assert.equal(await counter(PREFIX), before + 12);
});

test('a rolled-back document does not burn its number', async () => {
  const before = await counter(PREFIX);

  const t = await sequelize.transaction();
  const issued = await nextReference(PREFIX, { transaction: t });
  await t.rollback();

  assert.equal(
    await counter(PREFIX),
    before,
    'the counter advanced although nothing committed, so receipts would have holes'
  );

  // The next caller reuses the number the aborted transaction never got to use.
  assert.equal(await nextReference(PREFIX), issued);
});

test('a committed transaction consumes exactly one number', async () => {
  const before = await counter(PREFIX);

  const t = await sequelize.transaction();
  await nextReference(PREFIX, { transaction: t });
  await t.commit();

  assert.equal(await counter(PREFIX), before + 1);
});

test('each family keeps its own counter', async () => {
  const medBefore = await counter('MED');
  const labBefore = await counter('LAB');
  assert.ok(medBefore !== null && labBefore !== null, 'the migration must seed a row per family');
  assert.notEqual(
    medBefore,
    labBefore,
    'MED and LAB sit on one sequence, so a lab order and a sale could collide'
  );

  // Issuing on a third family must leave both of the above untouched.
  await nextReference(PREFIX);
  assert.equal(await counter('MED'), medBefore);
  assert.equal(await counter('LAB'), labBefore);
});
