// Adds columns the models declare but migrations 001 / 20260116-02 never created.
// Strictly additive: existing columns and rows are left untouched.
//
// All DDL is issued as raw SQL on the migration's own transaction connection.
// queryInterface.addColumn runs lock-requiring metadata reads on a *second* pool
// connection, which deadlocks against the transaction that wraps every migration.
'use strict';

const TABLES = [
  'companies',
  'insurance_providers',
  'lab_test_templates',
  'lab_service_orders',
];

function modelFor(db, tableName) {
  return Object.values(db).find(m => typeof m === 'function' && m.tableName === tableName);
}

const q = (name) => `"${name}"`;
const lit = (value) => `'${String(value).replace(/'/g, "''")}'`;
// Matches Sequelize's inline enum rendering: ENUM('Male', 'Female', 'it''s')
const ENUM_LITERAL = /^ENUM\((?:\s*'(?:[^']|'')*'\s*,?)*\)/i;

// Columns this migration is expected to add, so `down` reverses only those.
const REVERSIBLE = {
  companies: ['logo', 'addressState', 'addressZipCode', 'contactWebsite', 'taxId', 'receiptHeader', 'includeTaxId'],
  insurance_providers: ['address'],
  lab_test_templates: ['insurancePrice', 'defaultReferenceRanges'],
  lab_service_orders: [
    'createdById', 'createdByName', 'cashierId', 'cashierName', 'patientEmail', 'patientAge',
    'patientGender', 'tests', 'subtotal', 'tax', 'total', 'insuranceProviderId',
    'insuranceProviderName', 'policyNumber', 'insuranceCoverage', 'copayAmount', 'labTransactionId',
  ],
};

module.exports = {
  up: async (queryInterface, Sequelize, transaction) => {
    const db = require('../models');
    const sequelize = queryInterface.sequelize;
    const qg = queryInterface.queryGenerator;
    const run = (sql) => sequelize.query(sql, { transaction });

    for (const tableName of TABLES) {
      const model = modelFor(db, tableName);
      if (!model) throw new Error(`No model maps to table "${tableName}"`);

      const existing = await queryInterface.describeTable(tableName);

      for (const [attr, def] of Object.entries(model.rawAttributes)) {
        if (attr in existing) continue;

        // Postgres has no inline column COMMENT; Sequelize appends one MySQL-style.
        const generated = qg.attributesToSQL({ [attr]: def }, { table: tableName })[attr];
        const commentMark = /\s+COMMENT\s+/i.exec(generated);
        const type = commentMark ? generated.slice(0, commentMark.index) : generated;

        let columnType = type;
        if (def.type && def.type.key === 'ENUM') {
          const typeName = `enum_${tableName}_${attr}`;
          await run(
            `DO $$ BEGIN CREATE TYPE ${q(typeName)} AS ENUM (${def.type.values.map(lit).join(', ')});` +
            ` EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
          );
          // Sequelize renders an ENUM attribute as the literal text ENUM('a', 'b'),
          // which is not a Postgres type. Point the column at the type created above
          // (keeping any NOT NULL / DEFAULT suffix the generator appended).
          columnType = type.replace(ENUM_LITERAL, q(typeName));
        }

        await run(`ALTER TABLE ${q(tableName)} ADD COLUMN IF NOT EXISTS ${q(attr)} ${columnType}`);

        if (def.references) {
          const target = def.references.model;
          const refTable = typeof target === 'string' ? target : modelFor(db, target).tableName;
          const refKey = def.references.key || 'id';
          const constraint = `${tableName}_${attr}_fkey`;
          // Postgres has no "ADD CONSTRAINT IF NOT EXISTS", and an earlier partial
          // run may already have created it.
          await run(
            `DO $$ BEGIN ALTER TABLE ${q(tableName)} ADD CONSTRAINT ${q(constraint)}` +
            ` FOREIGN KEY (${q(attr)}) REFERENCES ${q(refTable)} (${q(refKey)})` +
            `${def.onUpdate ? ` ON UPDATE ${def.onUpdate}` : ''}${def.onDelete ? ` ON DELETE ${def.onDelete}` : ''};` +
            ` EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;`
          );
        }

        if (def.comment) {
          await run(`COMMENT ON COLUMN ${q(tableName)}.${q(attr)} IS ${lit(def.comment)}`);
        }
      }
    }
  },

  down: async (queryInterface, Sequelize, transaction) => {
    const sequelize = queryInterface.sequelize;
    for (const [tableName, columns] of Object.entries(REVERSIBLE)) {
      const existing = await queryInterface.describeTable(tableName);
      for (const attr of columns) {
        if (attr in existing) {
          await sequelize.query(
            `ALTER TABLE ${q(tableName)} DROP COLUMN IF EXISTS ${q(attr)}`,
            { transaction }
          );
        }
      }
    }
    await sequelize.query('DROP TYPE IF EXISTS "enum_lab_service_orders_patientGender"', { transaction });
  },
};
