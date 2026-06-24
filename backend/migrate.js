// backend/migrate.js
// Lightweight, dependency-free migration runner.
//
// - Applies every *.js file in ./migrations in filename order (use a NN-name
//   prefix, e.g. 001-add-indexes.js).
// - Tracks what has run in a `schema_migrations` table, so each file runs once.
// - Each migration exports:  async up({ sequelize, queryInterface }) { ... }
//
// Usage:
//   node migrate.js            run all pending migrations
//   node migrate.js status     show applied / pending without running
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize } = require('./config/database');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function appliedSet() {
  const [rows] = await sequelize.query('SELECT name FROM schema_migrations');
  return new Set(rows.map((r) => r.name));
}

function migrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.js'))
    .sort();
}

// Run pending migrations (or show status). Reuses the shared sequelize
// connection so it can be called from server.js on boot WITHOUT closing it.
// Set closeWhenDone: true when running as a standalone CLI.
async function migrate(mode = 'up', { closeWhenDone = false } = {}) {
  await sequelize.authenticate();
  await ensureTable();

  const applied = await appliedSet();
  const files = migrationFiles();
  const pending = files.filter((f) => !applied.has(f));

  if (mode === 'status') {
    console.log('📋 Migration status:');
    files.forEach((f) => console.log(`   ${applied.has(f) ? '✅ applied ' : '⏳ pending '} ${f}`));
    if (files.length === 0) console.log('   (no migration files)');
    if (closeWhenDone) await sequelize.close();
    return { applied: [...applied], pending };
  }

  if (pending.length === 0) {
    console.log('✅ No pending migrations. Database is up to date.');
    if (closeWhenDone) await sequelize.close();
    return { applied: [...applied], pending: [] };
  }

  const queryInterface = sequelize.getQueryInterface();

  for (const file of pending) {
    const migration = require(path.join(MIGRATIONS_DIR, file));
    console.log(`▶️  Applying ${file} ...`);
    const t = await sequelize.transaction();
    try {
      await migration.up({ sequelize, queryInterface, transaction: t });
      await sequelize.query(
        'INSERT INTO schema_migrations (name) VALUES (:name)',
        { replacements: { name: file }, transaction: t }
      );
      await t.commit();
      console.log(`✅ Applied ${file}`);
    } catch (err) {
      await t.rollback();
      console.error(`❌ Migration ${file} failed:`, err.message);
      if (closeWhenDone) { await sequelize.close(); process.exit(1); }
      throw err;
    }
  }

  console.log(`🎉 Applied ${pending.length} migration(s).`);
  if (closeWhenDone) await sequelize.close();
  return { applied: [...applied, ...pending], pending };
}

module.exports = { migrate };

// CLI entrypoint: `node migrate.js [status]`
if (require.main === module) {
  migrate(process.argv[2] || 'up', { closeWhenDone: true }).catch(async (err) => {
    console.error('❌ Migration runner error:', err.message);
    try { await sequelize.close(); } catch (_) {}
    process.exit(1);
  });
}
