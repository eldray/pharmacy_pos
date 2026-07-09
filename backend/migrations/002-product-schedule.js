// 002-product-schedule.js
// Adds the controlled-substance `schedule` column to products.
// 'none' = normal/OTC; 'II'..'V' = DEA-style controlled schedules.

module.exports = {
  async up({ sequelize, transaction }) {
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
};
