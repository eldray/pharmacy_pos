// backend/migrations/20260116-01-create-customer-tables.js
'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const { DataTypes } = Sequelize;

        // ── customers ────────────────────────────────────────────────
        const [custTables] = await queryInterface.sequelize.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'customers'
    `);
        if (custTables.length === 0) {
            await queryInterface.createTable('customers', {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                fullName: { type: DataTypes.STRING, allowNull: false },
                phone: { type: DataTypes.STRING, allowNull: false, unique: true },
                email: { type: DataTypes.STRING, allowNull: true },
                dob: { type: DataTypes.DATEONLY, allowNull: true },
                gender: { type: DataTypes.ENUM('male', 'female', 'other'), allowNull: true },
                address: { type: DataTypes.TEXT, allowNull: true },
                notes: { type: DataTypes.TEXT, allowNull: true },
                status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
                createdAt: { type: DataTypes.DATE, allowNull: false },
                updatedAt: { type: DataTypes.DATE, allowNull: false },
            });
            await queryInterface.addIndex('customers', ['phone']);
            await queryInterface.addIndex('customers', ['fullName']);
            console.log('   ↳ Created customers table');
        } else {
            console.log('   ↳ customers table already exists — skipped');
        }

        // ── customer_insurances ──────────────────────────────────────
        const [ciTables] = await queryInterface.sequelize.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'customer_insurances'
    `);
        if (ciTables.length === 0) {
            await queryInterface.createTable('customer_insurances', {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                customerId: {
                    type: DataTypes.INTEGER, allowNull: false,
                    references: { model: 'customers', key: 'id' },
                    onDelete: 'CASCADE',
                },
                insuranceProviderId: {
                    type: DataTypes.INTEGER, allowNull: false,
                    references: { model: 'insurance_providers', key: 'id' },
                },
                policyNumber: { type: DataTypes.STRING, allowNull: false },
                isPrimary: { type: DataTypes.BOOLEAN, defaultValue: false },
                status: {
                    type: DataTypes.ENUM('active', 'expired', 'cancelled'),
                    defaultValue: 'active',
                },
                notes: { type: DataTypes.TEXT, allowNull: true },
                createdAt: { type: DataTypes.DATE, allowNull: false },
                updatedAt: { type: DataTypes.DATE, allowNull: false },
            });
            await queryInterface.addIndex('customer_insurances', ['customerId']);
            await queryInterface.addIndex('customer_insurances', ['insuranceProviderId']);
            console.log('   ↳ Created customer_insurances table');
        } else {
            console.log('   ↳ customer_insurances table already exists — skipped');
        }
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('customer_insurances');
        await queryInterface.dropTable('customers');
    },
};