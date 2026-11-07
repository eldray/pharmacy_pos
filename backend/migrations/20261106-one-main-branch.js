// 20261106-one-main-branch.js
//
// Branches & Warehouse, per-branch stock, staff assignment and stock transfers
// all assume there is a single home branch, but nothing enforced it: the create
// and update routes took `isMain` from the request body verbatim, so two branches
// could both claim it and Branch.getMainBranch() would return whichever row the
// scan reached first.
//
// Keep the lowest id (the same order getMainBranch reads in), clear the flag on
// the rest, then make the rule a database constraint so no route can break it
// again. Creating the home branch when the table is empty is left to
// Branch.ensureMainBranch() at boot — that is structure, not schema.
//
// Raw SQL on the migration transaction: queryInterface metadata reads take a
// second pool connection and deadlock against the transaction migrate.js wraps
// each file in.
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize, transaction) => {
    const sequelize = queryInterface.sequelize;
    const run = (sql) => sequelize.query(sql, { transaction });

    const [demoted] = await run(`
      UPDATE "branches"
         SET "isMain" = false
       WHERE "isMain" = true
         AND id <> (SELECT min(id) FROM "branches" WHERE "isMain" = true)
      RETURNING id
    `);

    await run(`
      CREATE UNIQUE INDEX IF NOT EXISTS "branches_one_main"
          ON "branches" ("isMain")
       WHERE "isMain" = true
    `);

    const [mains] = await run(`SELECT id, name, code FROM "branches" WHERE "isMain" = true`);
    console.log(
      `   main branch: ${mains.map((b) => `${b.id} ("${b.name}", ${b.code})`).join(', ') || 'none yet — created at boot'}; ` +
      `cleared the flag on ${demoted.length} other branch(es)${demoted.length ? ` [${demoted.map((b) => b.id).join(', ')}]` : ''}`
    );
  },

  down: async (queryInterface, Sequelize, transaction) => {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "branches_one_main"', { transaction });
  }
};
