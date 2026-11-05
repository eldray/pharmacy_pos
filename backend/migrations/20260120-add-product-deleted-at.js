// backend/migrations/20260120-add-product-deleted-at.js
'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [cols] = await queryInterface.sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'products' AND column_name = 'deletedAt'
    `);
    if (cols.length === 0) {
      await queryInterface.sequelize.query(`
        ALTER TABLE "products" ADD COLUMN "deletedAt" TIMESTAMPTZ NULL
      `);
      await queryInterface.sequelize.query(`
        CREATE INDEX "idx_products_deleted_at" ON "products" ("deletedAt")
      `);
      console.log('   ↳ Added products.deletedAt');
    } else {
      console.log('   ↳ products.deletedAt already exists');
    }
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS "idx_products_deleted_at"`
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "deletedAt"`
    );
  },
};