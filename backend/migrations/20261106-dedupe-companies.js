// 20261106-dedupe-companies.js
//
// companies is a singleton: getCompany() reads one row and the Settings page
// writes one row. seed.js used to key its company on the name
// (findOrCreate({ where: { name: 'Pharmacy POS System' } })), so re-running the
// seed against a till whose owner had renamed the original inserted a *second*
// row beside it. Every read then returned whichever tuple the heap scan reached
// first — and because an UPDATE with no room on its page moves that row to the
// end of the scan, the winner flipped as settings were saved. The result is the
// "my receipt/tax changes don't take effect" report: the save went to one row,
// the next read came from the other, so a value like a 0% VAT rate would show up
// in the UI as 15% again.
//
// Keep the row the owner edited most recently (it is the one carrying the live
// settings; ties break on the higher id) and drop the rest. Nothing references
// companies by foreign key, so no child rows need retargeting.
//
// Raw SQL on the migration transaction: queryInterface metadata reads take a
// second pool connection and deadlock against the transaction migrate.js wraps
// each file in.
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize, transaction) => {
    const sequelize = queryInterface.sequelize;
    const run = (sql) => sequelize.query(sql, { transaction });

    const [rows] = await run(`
      WITH ranked AS (
        SELECT id, row_number() OVER (ORDER BY "updatedAt" DESC, id DESC) AS rn
        FROM "companies"
      )
      DELETE FROM "companies"
       WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
      RETURNING id
    `);

    const [kept] = await run(`SELECT id, name FROM "companies" ORDER BY id`);
    console.log(
      `   removed ${rows.length} duplicate companies row(s)${rows.length ? ` [${rows.map((r) => r.id).join(', ')}]` : ''}; ` +
      `kept ${kept.map((r) => `${r.id} ("${r.name}")`).join(', ') || 'none'}`
    );
  },

  down: async () => {
    // The duplicates were created by a seeding bug, not by the user, and their
    // contents were a stale copy of the surviving row. Nothing to restore.
  }
};
