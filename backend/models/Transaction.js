const { sequelize, DataTypes } = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transactionNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  cashierId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  cashierName: DataTypes.STRING,
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
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false
  },
  paymentReference: DataTypes.STRING,
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  customerName: DataTypes.STRING,
  customerPhone: DataTypes.STRING,
  notes: DataTypes.TEXT
}, {
  tableName: 'transactions',
  indexes: [
    { fields: ['cashierId'] },
    { fields: ['createdAt'] },
    { fields: ['paymentMethod'] },
  ]
});

// NO ASSOCIATIONS HERE - They are handled in models/index.js

module.exports = Transaction;