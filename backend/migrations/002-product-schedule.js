// 002-product-schedule.js
// Adds the controlled-substance `schedule` column to products.
// 'none' = normal/OTC; 'II'..'V' = DEA-style controlled schedules.
//
// migrate.js calls `up(queryInterface, Sequelize, transaction)`. Raw SQL on
// queryInterface.sequelize with the passed transaction, because queryInterface
// metadata reads use a second pool connection and deadlock against that transaction.

module.exports = {
  async up(queryInterface, Sequelize, transaction) {
    const sequelize = queryInterface.sequelize;

    await sequelize.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "schedule" VARCHAR(10) NOT NULL DEFAULT 'none'`,
      { transaction }
    );
    // Index so the controlled-substance report can filter quickly.
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS "idx_products_schedule" ON "products" ("schedule")`,
      { transaction }
    );
  },

  async down(queryInterface, Sequelize, transaction) {
    const sequelize = queryInterface.sequelize;

    await sequelize.query(`DROP INDEX IF EXISTS "idx_products_schedule"`, { transaction });
    await sequelize.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "schedule"`, { transaction });
  },
};
