// backend/migrations/20260118-add-lab-refund-columns.js
'use strict';

module.exports = {
  up: async (queryInterface) => {
    // Add refundedAt
    const [refundedAtCol] = await queryInterface.sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'lab_service_orders' AND column_name = 'refundedAt'
    `);
    if (refundedAtCol.length === 0) {
      await queryInterface.sequelize.query(`
        ALTER TABLE "lab_service_orders"
        ADD COLUMN "refundedAt" TIMESTAMPTZ NULL
      `);
      console.log('   ↳ Added lab_service_orders.refundedAt');
    } else {
      console.log('   ↳ refundedAt already exists');
    }

    // Add refundedBy
    const [refundedByCol] = await queryInterface.sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'lab_service_orders' AND column_name = 'refundedBy'
    `);
    if (refundedByCol.length === 0) {
      await queryInterface.sequelize.query(`
        ALTER TABLE "lab_service_orders"
        ADD COLUMN "refundedBy" INTEGER NULL
      `);
      console.log('   ↳ Added lab_service_orders.refundedBy');
    } else {
      console.log('   ↳ refundedBy already exists');
    }
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "lab_service_orders" DROP COLUMN IF EXISTS "refundedBy"
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "lab_service_orders" DROP COLUMN IF EXISTS "refundedAt"
    `);
  },
};