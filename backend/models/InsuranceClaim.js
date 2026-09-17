const { sequelize, DataTypes } = require('../config/database');

const InsuranceClaim = sequelize.define('InsuranceClaim', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  claimNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'sales_orders', key: 'id' }
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'customers', key: 'id' }
  },
  transactionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'transactions', key: 'id' }
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
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  claimAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  copayPaid: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'submitted', 'approved', 'rejected', 'paid'),
    defaultValue: 'pending'
  },
  notes: DataTypes.TEXT
}, {
  tableName: 'insurance_claims',
  timestamps: true
});

module.exports = InsuranceClaim;
