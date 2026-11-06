// Schema drift guard.
//
// The models used to be reconciled with the database by `sequelize.sync({ alter: true })`,
// which quietly rewrote live tables on boot (dropping columns it did not recognise and
// taking table locks on a running till). Migrations are the only schema authority now, so
// this check turns "model expects a column that isn't there" into a startup error that
// names the exact column, instead of an opaque 500 on the first sale that touches it.
//
// Extra columns in the database are reported as warnings: they are usually a migration
// that landed before the model caught up, and dropping data automatically is not this
// guard's job.

const { sequelize } = require('../config/database');

async function loadActualColumns() {
  const rows = await sequelize.query(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = current_schema()`,
    { type: sequelize.QueryTypes.SELECT, logging: false }
  );

  const byTable = new Map();
  for (const row of rows) {
    if (!byTable.has(row.table_name)) byTable.set(row.table_name, new Set());
    byTable.get(row.table_name).add(row.column_name);
  }
  return byTable;
}

function expectedColumns(model) {
  const out = new Map();
  for (const [attributeName, attr] of Object.entries(model.rawAttributes)) {
    out.set(attr.field || attributeName, attributeName);
  }
  return out;
}

function tableNameOf(model) {
  const name = model.getTableName();
  return typeof name === 'string' ? name : name.tableName;
}

// Returns { missing, extra, missingTables } and throws unless `allowMissing` is set,
// so callers that only want a report (tests, a CLI command) can pass it.
async function checkSchemaDrift({ allowMissing = false } = {}) {
  const db = require('../models');
  const actual = await loadActualColumns();

  const missing = [];
  const extra = [];
  const missingTables = [];

  for (const [modelName, model] of Object.entries(db)) {
    if (!model || !model.rawAttributes) continue;

    const table = tableNameOf(model);
    const columns = actual.get(table);

    if (!columns) {
      missingTables.push(`${modelName} -> "${table}"`);
      continue;
    }

    const expected = expectedColumns(model);
    for (const [column, attributeName] of expected) {
      if (!columns.has(column)) missing.push(`${table}.${column} (model ${modelName}.${attributeName})`);
    }

    for (const column of columns) {
      if (!expected.has(column)) extra.push(`${table}.${column}`);
    }
  }

  const drifted = missing.length > 0 || missingTables.length > 0;
  if (drifted && !allowMissing) {
    const lines = [
      ...missingTables.map((t) => `  missing table: ${t}`),
      ...missing.map((c) => `  missing column: ${c}`)
    ];
    throw new Error(
      `Model/schema drift detected — the database is behind the models.\n` +
      `${lines.join('\n')}\n` +
      `Add a migration for the above and run \`npm run migrate\` before starting the server.`
    );
  }

  return { missing, extra, missingTables };
}

async function reportSchemaDrift() {
  const { missing, extra, missingTables } = await checkSchemaDrift({ allowMissing: true });

  for (const t of missingTables) console.error(`❌ Table missing: ${t}`);
  for (const c of missing) console.error(`❌ Column missing: ${c}`);
  for (const c of extra) console.warn(`⚠️  Column in database but not in any model: ${c}`);

  if (!missing.length && !missingTables.length) {
    console.log(`✅ Schema matches models (${extra.length} unused column(s) present)`);
  }

  return { missing, extra, missingTables };
}

module.exports = { checkSchemaDrift, reportSchemaDrift };
