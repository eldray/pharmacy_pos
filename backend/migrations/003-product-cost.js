// 003-product-cost.js
// Adds the `cost` column to products (cost price for COGS / profit reporting).

module.exports = {
  async up({ sequelize, transaction }) {
    await sequelize.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "cost" DECIMAL(10,2) NOT NULL DEFAULT 0`,
      { transaction }
    );
  },
};
