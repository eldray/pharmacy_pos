// backend/migrations/20260121-add-product-package-columns.js
'use strict';

// Every column the Product model expects that the products table lacks.
const COLUMNS = [
  { name: 'packageType',        sql: 'VARCHAR(50)' },
  { name: 'dispensingUnit',     sql: 'VARCHAR(50)' },
  { name: 'unitsPerPackage',    sql: 'INTEGER DEFAULT 1' },
  { name: 'allowUnitBreakdown', sql: 'BOOLEAN DEFAULT true' },
  { name: 'packagePrice',       sql: 'DECIMAL(10,2)' },
  { name: 'sellingPrice',       sql: 'DECIMAL(10,2)' },
  { name: 'insurancePrice',     sql: 'DECIMAL(10,2)' },
];

module.exports = {
  up: async (queryInterface) => {
    for (const col of COLUMNS) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'products' AND column_name = $1`,
        { bind: [col.name] }
      );
      if (existing.length === 0) {
        await queryInterface.sequelize.query(
          `ALTER TABLE "products" ADD COLUMN "${col.name}" ${col.sql}`
        );
        console.log(`   ↳ Added products.${col.name}`);
      } else {
        console.log(`   ↳ products.${col.name} already exists`);
      }
    }
  },

  down: async (queryInterface) => {
    for (const col of COLUMNS) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "products" DROP COLUMN IF EXISTS "${col.name}"`
      );
    }
  },
};