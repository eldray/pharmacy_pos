// backend/migrations/20260119-add-lab-service-order-fks.js
'use strict';

module.exports = {
  up: async (queryInterface) => {
    const tables = await queryInterface.showAllTables();
    const have = (t) => tables.includes(t);

    const fks = [
      { col: 'customerId', ref: 'customers',           name: 'fk_lso_customer' },
      { col: 'templateId', ref: 'lab_test_templates',  name: 'fk_lso_template' },
      { col: 'requestedBy', ref: 'users',              name: 'fk_lso_requested_by' },
      { col: 'processedBy', ref: 'users',              name: 'fk_lso_processed_by' },
      { col: 'branchId',    ref: 'branches',           name: 'fk_lso_branch' },
    ];

    for (const fk of fks) {
      if (!have(fk.ref)) {
        console.log(`   ⚠️  Skipping ${fk.name}: ${fk.ref} missing`);
        continue;
      }
      await queryInterface.addConstraint('lab_service_orders', {
        fields: [fk.col],
        type: 'foreign key',
        name: fk.name,
        references: { table: fk.ref, field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      console.log(`   ↳ Added FK ${fk.name}`);
    }
  },

  down: async (queryInterface) => {
    for (const name of [
      'fk_lso_branch', 'fk_lso_processed_by', 'fk_lso_requested_by',
      'fk_lso_template', 'fk_lso_customer',
    ]) {
      await queryInterface.removeConstraint('lab_service_orders', name).catch(() => {});
    }
  },
};