// backend/models/CustomerInsurance.js
const { sequelize, DataTypes } = require('../config/database');

const CustomerInsurance = sequelize.define('CustomerInsurance', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'customers', key: 'id' }
    },
    insuranceProviderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'insurance_providers', key: 'id' }
    },
    policyNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isPrimary: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    status: {
        type: DataTypes.ENUM('active', 'expired', 'cancelled'),
        defaultValue: 'active'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'customer_insurances',
    timestamps: true,
    indexes: [
        { fields: ['customerId'] },
        { fields: ['insuranceProviderId'] },
        { unique: true, fields: ['customerId', 'insuranceProviderId', 'policyNumber'] }
    ]
});

module.exports = CustomerInsurance;