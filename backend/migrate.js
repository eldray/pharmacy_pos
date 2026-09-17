// backend/migrate.js
// Production-grade migration runner.
//
// Usage:
//   await migrate('up')   — apply all pending migrations (default)
//   await migrate('down') — revert the last applied migration
//   await migrate('status') — list migrations and their state
//
// Design:
//   - Advisory lock prevents concurrent migration runs (multi-instance safety)
//   - Each migration runs in a transaction (all-or-nothing)
//   - Applied migrations tracked in `_migrations` table
//   - Idempotent: running `up` twice does nothing the second time

const fs = require('fs');
const path = require('path');
const { sequelize } = require('./config/database');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const LOCK_ID = 727_001; // arbitrary unique integer for advisory lock
const META_TABLE = '_migrations';

/* ─── Ensure the tracking table exists ─────────────────────────── */
async function ensureMetaTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${META_TABLE}" (
      id           SERIAL PRIMARY KEY,
      name         VARCHAR(255) NOT NULL UNIQUE,
      applied_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

/* ─── Load and sort migration files ────────────────────────────── */
function loadMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.js'))
    .sort() // files should be prefixed with timestamps: 20260116-xxx.js
    .map((filename) => {
      const fullPath = path.join(MIGRATIONS_DIR, filename);
      const mod = require(fullPath);
      if (typeof mod.up !== 'function') {
        throw new Error(`Migration ${filename} must export an "up" function`);
      }
      return { name: filename, up: mod.up, down: mod.down };
    });
}

/* ─── Which migrations have already run ────────────────────────── */
async function getAppliedMigrations() {
  const [rows] = await sequelize.query(
    `SELECT name FROM "${META_TABLE}" ORDER BY applied_at ASC`
  );
  return rows.map((r) => r.name);
}

/* ─── Apply one migration inside a transaction ─────────────────── */
async function applyMigration(migration) {
  const t = await sequelize.transaction();
  try {
    console.log(`▶️  Applying migration: ${migration.name}`);
    await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
    await sequelize.query(
      `INSERT INTO "${META_TABLE}" (name) VALUES (:name)`,
      { replacements: { name: migration.name }, transaction: t }
    );
    await t.commit();
    console.log(`✅ Applied: ${migration.name}`);
  } catch (err) {
    await t.rollback();
    console.error(`❌ Failed: ${migration.name}`);
    throw err;
  }
}

/* ─── Revert one migration ─────────────────────────────────────── */
async function revertMigration(migration) {
  if (typeof migration.down !== 'function') {
    throw new Error(`Migration ${migration.name} has no "down" function — cannot revert`);
  }
  const t = await sequelize.transaction();
  try {
    console.log(`◀️  Reverting: ${migration.name}`);
    await migration.down(sequelize.getQueryInterface(), sequelize.Sequelize);
    await sequelize.query(
      `DELETE FROM "${META_TABLE}" WHERE name = :name`,
      { replacements: { name: migration.name }, transaction: t }
    );
    await t.commit();
    console.log(`✅ Reverted: ${migration.name}`);
  } catch (err) {
    await t.rollback();
    console.error(`❌ Failed to revert: ${migration.name}`);
    throw err;
  }
}

/* ─── Public API ───────────────────────────────────────────────── */
async function migrate(direction = 'up') {
  // Advisory lock prevents two instances running migrations simultaneously.
  const lockClient = await sequelize.connectionManager.getConnection();
  try {
    await sequelize.query(`SELECT pg_advisory_lock(${LOCK_ID})`);

    await ensureMetaTable();

    const files = loadMigrationFiles();
    const applied = new Set(await getAppliedMigrations());

    if (direction === 'status') {
      console.log('\nMigration status:');
      for (const m of files) {
        const status = applied.has(m.name) ? '✅ applied' : '⏳ pending';
        console.log(`  ${status}  ${m.name}`);
      }
      console.log('');
      return { applied: applied.size, pending: files.length - applied.size };
    }

    if (direction === 'up') {
      const pending = files.filter((m) => !applied.has(m.name));
      if (pending.length === 0) {
        console.log('✅ No pending migrations');
        return { applied: 0 };
      }
      for (const m of pending) {
        await applyMigration(m);
      }
      return { applied: pending.length };
    }

    if (direction === 'down') {
      const lastApplied = [...applied].pop();
      if (!lastApplied) {
        console.log('ℹ️  Nothing to revert');
        return { reverted: 0 };
      }
      const migration = files.find((m) => m.name === lastApplied);
      if (!migration) {
        throw new Error(`Migration file for "${lastApplied}" not found — cannot revert`);
      }
      await revertMigration(migration);
      return { reverted: 1 };
    }

    throw new Error(`Unknown migration direction: ${direction}`);
  } finally {
    try {
      await sequelize.query(`SELECT pg_advisory_unlock(${LOCK_ID})`);
    } catch { }
    await sequelize.connectionManager.releaseConnection(lockClient);
  }
}

/* ─── CLI ──────────────────────────────────────────────────────── */
if (require.main === module) {
  const direction = process.argv[2] || 'up';
  migrate(direction)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { migrate };