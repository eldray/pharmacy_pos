// 20261106-sequential-document-numbers.js
//
// Document numbers were `PREFIX-<epoch ms>-<6 random digits>`. They could not be
// read back over the phone, they sorted by string in nothing like creation order,
// and they collided on the unique constraint often enough to fail a sale
// mid-payment. This moves every document onto a per-family counter starting at
// 1000001, so the first document of a family is `<PREFIX>-1000001`.
//
// Families, matching utils/references.js:
//   MED  POS sale + the pending order that became it   (one shared counter)
//   LAB  lab order + the individual test rows on it    (one shared counter)
//   REC  lab receipt
//   LSO  lab service order (legacy screen, unused)
//   CLM  insurance claim
//
// Numbers are also quoted verbatim inside free-text columns written at the time —
// transactions.notes, both inventory_logs columns and audit_logs.changes — so
// those get rewritten from the same map, or stock history would point at a sale
// number that no longer exists.
//
// Only numbers belonging to a document that still exists are rewritten. audit_logs
// also holds entries for documents that were deleted long ago; their old numbers
// stay as they were, because the audit trail is a record of what the document was
// called at the time, and inventing a number it never had would corrupt it.
//
// down: not reversible. The old numbers carried a random suffix and an epoch that
// cannot be recovered once overwritten, so down only says so. It keeps the
// sequences table because the running code depends on it.
'use strict';

const START = 1000001;

const q = (name) => `"${name}"`;

const PREFIXES = ['MED', 'LAB', 'REC', 'LSO', 'CLM'];

// Free-text / JSONB columns that quote a document number verbatim.
const TEXT_REWRITES = [
  { table: 'transactions', column: 'notes' },
  { table: 'inventory_logs', column: 'reference' },
  { table: 'inventory_logs', column: 'notes' },
  { table: 'audit_logs', column: 'changes', json: true },
];

module.exports = {
  up: async (queryInterface, Sequelize, transaction) => {
    const run = (sql, options) =>
      queryInterface.sequelize.query(sql, { ...(options || {}), transaction });
    const rows = async (sql, options) => (await run(sql, options))[0];

    await run(`
      CREATE TABLE IF NOT EXISTS "document_sequences" (
        "name"       VARCHAR(32) PRIMARY KEY,
        "next_value" BIGINT NOT NULL
      );
    `);

    // ── 1. Gather every existing number, tagged with where it lives ─────────
    const orders = await rows(
      `select "id", "orderNumber" as "number", "createdAt" from "sales_orders"
        where "orderNumber" is not null`
    );
    const sales = await rows(
      `select "id", "transactionNumber" as "number", "createdAt" from "transactions"
        where "transactionNumber" is not null`
    );

    // A pending order and the sale that settled it belong to one family, so they
    // interleave by creation time rather than numbering every order first.
    const med = [
      ...orders.map((r) => ({ ...r, table: 'sales_orders', column: 'orderNumber', family: 'MED' })),
      ...sales.map((r) => ({ ...r, table: 'transactions', column: 'transactionNumber', family: 'MED' })),
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.id - b.id);

    const labOrderRows = await rows(
      `select "id", "transactionNumber" as "number", "receiptNumber", "createdAt"
         from "lab_transactions" where "transactionNumber" is not null
        order by "createdAt", "id"`
    );
    const labTestRows = await rows(
      `select "id", "testNumber" as "number", "labTransactionId" from "lab_tests"
        where "testNumber" is not null order by "labTransactionId", "id"`
    );

    // A test row is numbered immediately after the order it belongs to; sharing one
    // counter is what guarantees the order and its tests never carry the same number.
    const lab = [];
    for (const order of labOrderRows) {
      lab.push({
        id: order.id,
        number: order.number,
        table: 'lab_transactions',
        column: 'transactionNumber',
        family: 'LAB',
      });
      for (const test of labTestRows) {
        if (test.labTransactionId === order.id) {
          lab.push({
            id: test.id,
            number: test.number,
            table: 'lab_tests',
            column: 'testNumber',
            family: 'LAB',
          });
        }
      }
    }
    // Orphans — a test whose parent order was deleted — still need a number.
    const claimed = new Set(lab.map((r) => `${r.table}/${r.id}`));
    for (const test of labTestRows) {
      const key = `lab_tests/${test.id}`;
      if (!claimed.has(key)) {
        lab.push({
          id: test.id,
          number: test.number,
          table: 'lab_tests',
          column: 'testNumber',
          family: 'LAB',
        });
      }
    }

    const rec = labOrderRows
      .filter((r) => r.receiptNumber)
      .map((r) => ({
        id: r.id,
        number: r.receiptNumber,
        table: 'lab_transactions',
        column: 'receiptNumber',
        family: 'REC',
      }));

    // ── 2. Issue new numbers and record the old -> new map ──────────────────
    const items = [...med, ...lab, ...rec];
    const counters = {};
    const map = new Map();

    for (const item of items) {
      counters[item.family] = (counters[item.family] || 0) + 1;
      const fresh = `${item.family}-${START + counters[item.family] - 1}`;
      map.set(item.number, fresh);
      await run(
        `update ${q(item.table)} set ${q(item.column)} = :fresh where "id" = :id`,
        { replacements: { fresh, id: item.id } }
      );
    }

    // ── 3. Rewrite the numbers quoted inside free-text and JSONB columns ────
    // Longest old number first, so one reference can never be rewritten as a
    // substring of another and leave a half-replaced number behind.
    const pairs = [...map.entries()].sort((a, b) => b[0].length - a[0].length);

    for (const { table, column, json } of TEXT_REWRITES) {
      const source = json ? `${q(column)}::text` : q(column);
      const target = json ? `${q(column)} = cast(:value as jsonb)` : `${q(column)} = :value`;
      const every = await rows(
        `select "id", ${source} as "value" from ${q(table)} where ${source} is not null`
      );
      for (const row of every) {
        const before = String(row.value);
        let value = before;
        for (const [oldNumber, fresh] of pairs) {
          if (value.includes(oldNumber)) value = value.split(oldNumber).join(fresh);
        }
        if (value !== before) {
          await run(`update ${q(table)} set ${target} where "id" = :id`, {
            replacements: { value, id: row.id },
          });
        }
      }
    }

    // ── 4. Seed each counter just past what this migration issued ───────────
    for (const prefix of PREFIXES) {
      await run(
        `insert into "document_sequences" ("name", "next_value")
         values (:prefix, :value)
         on conflict ("name") do nothing`,
        { replacements: { prefix, value: START + (counters[prefix] || 0) } }
      );
    }

    console.log(
      `   renumbered ${med.length} MED, ${lab.length} LAB, ${rec.length} REC document(s)` +
        ` and rewrote ${pairs.length} number(s) in free-text columns`
    );
  },

  down: async (queryInterface, Sequelize, transaction) => {
    const result = await queryInterface.sequelize.query(
      `select count(*)::int as n from "document_sequences"`,
      { transaction }
    );
    const count = result[0][0].n;
    console.warn(
      '⚠️  20261106-sequential-document-numbers cannot be undone: the original' +
        `\n   timestamp-based numbers had a random suffix and are not recoverable.` +
        `\n   Leaving the ${count} counter row(s) in place — the running code needs them.`
    );
  },
};
