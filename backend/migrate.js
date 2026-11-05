// migrate.js
'use strict';
const fs = require('fs');
const path = require('path');
const { sequelize } = require('./config/database');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const META_TABLE = 'SequelizeMeta';

async function ensureMetaTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${META_TABLE}" (
      name VARCHAR(255) PRIMARY KEY
    );
  `);
}

async function getApplied() {
  const [rows] = await sequelize.query(`SELECT name FROM "${META_TABLE}" ORDER BY name`);
  return rows.map(r => r.name);
}

async function applyMigration(filename) {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const migration = require(filePath);
  const queryInterface = sequelize.getQueryInterface();

  console.log(`▶️  Applying migration: ${filename}`);
  try {
    await sequelize.transaction(async (t) => {
      await migration.up(queryInterface, sequelize.Sequelize, t);
      await sequelize.query(
        `INSERT INTO "${META_TABLE}" (name) VALUES ($1)`,
        { bind: [filename], transaction: t }
      );
    });
    console.log(`✅ Applied: ${filename}`);
  } catch (err) {
    console.error(`❌ Failed: ${filename}`);
    throw err;
  }
}

async function revertMigration(filename) {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const migration = require(filePath);
  const queryInterface = sequelize.getQueryInterface();

  console.log(`⏪ Reverting: ${filename}`);
  await sequelize.transaction(async (t) => {
    await migration.down(queryInterface, sequelize.Sequelize, t);
    await sequelize.query(
      `DELETE FROM "${META_TABLE}" WHERE name = $1`,
      { bind: [filename], transaction: t }
    );
  });
  console.log(`✅ Reverted: ${filename}`);
}

async function migrate(direction = 'up') {
  await ensureMetaTable();

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.js'))
    .sort(); // lexicographic — that's why 001, 002 numbering matters

  if (direction === 'up') {
    const applied = await getApplied();
    const pending = files.filter(f => !applied.includes(f));
    if (pending.length === 0) return { applied: 0 };
    for (const f of pending) await applyMigration(f);
    return { applied: pending.length };
  }

  if (direction === 'down') {
    const applied = await getApplied();
    const last = applied[applied.length - 1];
    if (last) await revertMigration(last);
    return { reverted: last ? 1 : 0 };
  }

  throw new Error(`Unknown direction: ${direction}`);
}

module.exports = { migrate };