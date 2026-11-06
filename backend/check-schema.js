// backend/check-schema.js — compare the Sequelize models with the live database.
//
//   npm run check:schema
//
// Exits non-zero when a model declares something the database does not have, so it
// can be used as a CI step. Columns present in the database but not in any model are
// listed for information only.
require('dotenv').config();
const { sequelize } = require('./config/database');
const { reportSchemaDrift } = require('./utils/checkSchema');

reportSchemaDrift()
  .then(({ missing, missingTables }) => {
    const failed = missing.length + missingTables.length > 0;
    return sequelize.close().then(() => process.exit(failed ? 1 : 0));
  })
  .catch(async (err) => {
    console.error('❌ Schema check failed:', err.message);
    await sequelize.close().catch(() => {});
    process.exit(1);
  });
