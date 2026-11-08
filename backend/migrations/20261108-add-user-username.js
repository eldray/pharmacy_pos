'use strict';

const { usernameFromEmail } = require('../utils/validators');

/**
 * Staff sign in with a username, not an email address. Existing accounts get
 * the local part of their address (admin@pharmacy.com -> admin), so nobody is
 * locked out and nobody has to be told a new credential.
 *
 * Email stays as optional contact details: the column keeps its unique index,
 * and Postgres allows many NULLs under it.
 */
module.exports = {
  up: async (queryInterface, Sequelize, transaction) => {
    const [cols] = await queryInterface.sequelize.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'username'`,
      { transaction }
    );

    if (cols.length === 0) {
      await queryInterface.addColumn('users', 'username', { type: Sequelize.STRING(30) }, { transaction });
      console.log('   ↳ Added users.username');
    } else {
      console.log('   ↳ users.username already exists');
    }

    const [rows] = await queryInterface.sequelize.query(
      `SELECT id, email, username FROM users ORDER BY id`,
      { transaction }
    );
    const [taken] = await queryInterface.sequelize.query(
      `SELECT LOWER(username) AS username FROM users WHERE username IS NOT NULL`,
      { transaction }
    );
    const used = new Set(taken.map((r) => r.username));

    let filled = 0;
    for (const row of rows) {
      if (row.username) continue;
      const base = usernameFromEmail(row.email, `user${row.id}`);
      let candidate = base;
      let suffix = 2;
      while (used.has(candidate)) candidate = `${base.slice(0, 26)}${suffix++}`;
      used.add(candidate);
      await queryInterface.sequelize.query(
        `UPDATE users SET username = :username WHERE id = :id`,
        { replacements: { username: candidate, id: row.id }, transaction }
      );
      filled++;
    }
    if (filled) console.log(`   ↳ Backfilled username on ${filled} account(s)`);

    await queryInterface.sequelize.query(
      `ALTER TABLE users ALTER COLUMN username SET NOT NULL`,
      { transaction }
    );
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_key ON users (LOWER(username))`,
      { transaction }
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE users ALTER COLUMN email DROP NOT NULL`,
      { transaction }
    );
    console.log('   ↳ username is required and unique; email is now optional');
  },

  down: async (queryInterface, Sequelize, transaction) => {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS users_username_lower_key`, { transaction });
    await queryInterface.removeColumn('users', 'username', { transaction });

    // Restoring NOT NULL would fail on an account created without an address
    // while usernames were in charge, so only tighten it when the data allows.
    const [blank] = await queryInterface.sequelize.query(
      `SELECT COUNT(*)::int AS n FROM users WHERE email IS NULL OR TRIM(email) = ''`,
      { transaction }
    );
    if (blank[0].n === 0) {
      await queryInterface.sequelize.query(
        `ALTER TABLE users ALTER COLUMN email SET NOT NULL`,
        { transaction }
      );
    } else {
      console.log(`   ↳ Left email nullable: ${blank[0].n} account(s) have no address`);
    }
  },
};