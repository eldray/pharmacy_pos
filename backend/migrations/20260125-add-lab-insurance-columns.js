// 20260125-add-lab-insurance-columns.js
//
// The lab request modal has always let a cashier attach an insurer and showed the
// patient a copay, but lab_transactions had no column to hold it — so the request
// silently billed the patient the FULL amount and the insurer's share never appeared
// anywhere. POS orders (sales_orders) already carry these fields; this mirrors them.
//
// copayAmount stays NULL when no insurer is on the request, which is how the pay
// route tells "not insured" apart from "insurer covers everything".
'use strict';

const q = (name) => `"${name}"`;

const COLUMNS = {
  insuranceProviderId: 'INTEGER NULL',
  insuranceProviderName: 'VARCHAR(255) NULL',
  policyNumber: 'VARCHAR(100) NULL',
  insuranceCoverage: 'DECIMAL(10,2) NOT NULL DEFAULT 0',
  copayAmount: 'DECIMAL(10,2) NULL',
};

module.exports = {
  up: async (queryInterface, Sequelize, transaction) => {
    const run = (sql) => queryInterface.sequelize.query(sql, { transaction });
    for (const [column, type] of Object.entries(COLUMNS)) {
      await run(`ALTER TABLE "lab_transactions" ADD COLUMN IF NOT EXISTS ${q(column)} ${type}`);
    }
  },

  down: async (queryInterface, Sequelize, transaction) => {
    const run = (sql) => queryInterface.sequelize.query(sql, { transaction });
    for (const column of Object.keys(COLUMNS)) {
      await run(`ALTER TABLE "lab_transactions" DROP COLUMN IF EXISTS ${q(column)}`);
    }
  },
};
