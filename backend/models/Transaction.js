// models/Transaction.js

const { sequelize, DataTypes } = require('../database');
const User = require('./User');

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
    references: {
      model: User,
      key: 'id'
    }
  },
  cashierName: DataTypes.STRING,
  items: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      const value = this.getDataValue('items');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('items', JSON.stringify(value));
    }
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
  tableName: 'transactions'
});

Transaction.belongsTo(User, { foreignKey: 'cashierId', as: 'cashier' });

module.exports = Transaction;