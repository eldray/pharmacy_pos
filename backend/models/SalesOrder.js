const { sequelize, DataTypes } = require('../config/database');

const SalesOrder = sequelize.define('SalesOrder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  branchId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'branches', key: 'id' }
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  createdByName: DataTypes.STRING,
  cashierId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  cashierName: DataTypes.STRING,
  customerName: DataTypes.STRING,
  customerPhone: DataTypes.STRING,
  items: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  insuranceProviderId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  insuranceProviderName: DataTypes.STRING,
  policyNumber: DataTypes.STRING,
  insuranceCoverage: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'customers', key: 'id' }
  },
  copayAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('pending_payment', 'paid', 'cancelled'),
    defaultValue: 'pending_payment'
  },
  notes: DataTypes.TEXT
}, {
  tableName: 'sales_orders',
  timestamps: true,
  indexes: [
    { fields: ['orderNumber'] },
    { fields: ['status'] },
    { fields: ['createdById'] }
  ]
});

module.exports = SalesOrder;
