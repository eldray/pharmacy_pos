// 20261106-add-paid-at.js
//
// A receipt has to say when the money was taken, and neither money table recorded
// it. `transactions` rows are inserted at the moment of payment so createdAt was
// a usable stand-in, but `lab_requests` are created unpaid and settled later —
// their createdAt is the order time and their updatedAt moves again every time a
// result is entered, so neither is the paid time.
//
// Backfill uses the best timestamp each row actually had: createdAt for a POS
// sale, updatedAt for a lab request that is already paid. Rows that are still
// awaiting payment stay null rather than being given a time they do not have.
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize, transaction) => {
    const sequelize = queryInterface.sequelize;
    const run = (sql) => sequelize.query(sql, { transaction });

    await run(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP WITH TIME ZONE`);
    await run(`ALTER TABLE "lab_transactions" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP WITH TIME ZONE`);

    const [sales] = await run(`
      UPDATE "transactions" SET "paidAt" = "createdAt" WHERE "paidAt" IS NULL RETURNING id
    `);
    const [lab] = await run(`
      UPDATE "lab_transactions" SET "paidAt" = "updatedAt"
       WHERE "paidAt" IS NULL AND "paymentStatus" = 'paid' RETURNING id
    `);

    console.log(`   paidAt backfilled on ${sales.length} sale(s) and ${lab.length} paid lab request(s)`);
  },

  down: async (queryInterface, Sequelize, transaction) => {
    const sequelize = queryInterface.sequelize;
    await sequelize.query('ALTER TABLE "transactions" DROP COLUMN IF EXISTS "paidAt"', { transaction });
    await sequelize.query('ALTER TABLE "lab_transactions" DROP COLUMN IF EXISTS "paidAt"', { transaction });
  }
};
