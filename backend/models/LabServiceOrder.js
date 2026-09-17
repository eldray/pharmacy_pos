// backend/models/LabServiceOrder.js
const { sequelize, DataTypes } = require('../config/database');

const LabServiceOrder = sequelize.define('LabServiceOrder', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    orderNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },

    branchId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'branches', key: 'id' },
    },

    createdById: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
    },
    createdByName: DataTypes.STRING,

    cashierId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
    },
    cashierName: DataTypes.STRING,

    customerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'customers', key: 'id' },
    },
    patientName: DataTypes.STRING,
    patientPhone: DataTypes.STRING,
    patientEmail: DataTypes.STRING,
    patientAge: DataTypes.INTEGER,
    patientGender: {
        type: DataTypes.ENUM('Male', 'Female', 'Other'),
        allowNull: true,
    },

    tests: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
    },

    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    tax: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },

    insuranceProviderId: { type: DataTypes.INTEGER, allowNull: true },
    insuranceProviderName: DataTypes.STRING,
    policyNumber: DataTypes.STRING,
    insuranceCoverage: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    copayAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },

    status: {
        type: DataTypes.ENUM('pending_payment', 'paid', 'cancelled'),
        defaultValue: 'pending_payment',
    },

    labTransactionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'lab_transactions', key: 'id' },
    },

    notes: DataTypes.TEXT,

    // ── Refund fields (MOVED HERE — they belong to attributes, not options) ──
    refundedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    refundedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
    },
    refundedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    refundedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
    },
}, {
    tableName: 'lab_service_orders',
    timestamps: true,
    indexes: [
        { fields: ['orderNumber'] },
        { fields: ['status'] },
        { fields: ['createdById'] },
        { fields: ['createdAt'] },
    ],
});
module.exports = LabServiceOrder;