// Creates the core POS tables that no earlier migration defined.
'use strict';

// Ordered so every foreign key target exists before the table that points at it.
const WAVES = [
  ['Branch', 'AuditLog', 'Transaction', 'LabTransaction', 'PurchaseOrder', 'InventoryLog'],
  ['SalesOrder', 'ProductBatch', 'StaffProfile', 'StockTransfer', 'BranchInventory'],
  ['LabTest', 'InsuranceClaim'],
];

module.exports = {
  up: async (queryInterface, Sequelize, transaction) => {
    const db = require('../models');
    for (const wave of WAVES) {
      for (const name of wave) {
        await db[name].sync({ transaction });
      }
    }
  },

  down: async (queryInterface, Sequelize, transaction) => {
    const db = require('../models');
    for (const wave of [...WAVES].reverse()) {
      for (const name of [...wave].reverse()) {
        await queryInterface.dropTable(db[name].tableName, { transaction });
      }
    }
  },
};
