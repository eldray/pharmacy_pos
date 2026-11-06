// 20260124-pos-indexes-and-data-hygiene.js
//
// 1. Index sales_orders.createdAt — every report, the dashboard and Sales History
//    filter on it and the table was being scanned in full.
// 2. Backfill the payment-method casing. Writes normalise to lowercase now, but the
//    older rows ('Cash') still split into their own bucket in revenue-by-method
//    reports and in the Z-receipt.
// 3. Drop products.costPrice. `cost` (003) is the column the models, pricing and COGS
//    reports read; costPrice came from migration 001, is declared by no model, and was
//    NULL in every row. Its value is carried into `cost` first so other installs
//    cannot lose data.
//
// Raw SQL on the migration transaction: queryInterface metadata reads take a second
// pool connection and deadlock against the transaction migrate.js wraps each file in.
'use strict';

const q = (name) => `"${name}"`;

module.exports = {
  up: async (queryInterface, Sequelize, transaction) => {
    const sequelize = queryInterface.sequelize;
    const run = (sql) => sequelize.query(sql, { transaction });

    await run(`CREATE INDEX IF NOT EXISTS "idx_sales_orders_created_at" ON "sales_orders" ("createdAt")`);

    await run(`UPDATE "transactions" SET "paymentMethod" = lower("paymentMethod") WHERE "paymentMethod" <> lower("paymentMethod")`);
    // lab_transactions.paymentMethod is an ENUM whose labels are already lowercase
    // (cash, mtn, vodafone, airteltigo, card), so it cannot hold a mis-cased value.

    await run(
      `UPDATE "products" SET "cost" = "costPrice"
       WHERE "costPrice" IS NOT NULL AND ("cost" IS NULL OR "cost" = 0)`
    );
    await run(`ALTER TABLE "products" DROP COLUMN IF EXISTS "costPrice"`);
  },

  down: async (queryInterface, Sequelize, transaction) => {
    const sequelize = queryInterface.sequelize;
    const run = (sql) => sequelize.query(sql, { transaction });

    await run(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "costPrice" DECIMAL(10,2)`);
    await run(`UPDATE "products" SET "costPrice" = "cost" WHERE "cost" IS NOT NULL`);

    await run(`DROP INDEX IF EXISTS "idx_sales_orders_created_at"`);
    // Casing of pre-existing rows is not restorable; leave the normalised values.
  }
};
