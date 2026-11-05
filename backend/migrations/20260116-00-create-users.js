// backend/migrations/20260116-00-create-users.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;

    const tables = await queryInterface.showAllTables();
    if (tables.includes('users')) {
      console.log('   ↳ users already exists — skipping');
      return;
    }

    // Create the enum types BEFORE the table that uses them.
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_users_role" AS ENUM
          ('admin','manager','pharmacist_sales','cashier','lab_tech');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_users_status" AS ENUM
          ('active','inactive');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.createTable('users', {
      id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name:      { type: DataTypes.STRING, allowNull: false },
      email:     { type: DataTypes.STRING, allowNull: false, unique: true },
      password:  { type: DataTypes.STRING, allowNull: false },
      role:      { type: DataTypes.ENUM('admin','manager','pharmacist_sales','cashier','lab_tech'), allowNull: false, defaultValue: 'cashier' },
      status:    { type: DataTypes.ENUM('active','inactive'), allowNull: false, defaultValue: 'active' },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    console.log('   ↳ Created users + enum types');
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('users');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_status"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role"');
  },
};