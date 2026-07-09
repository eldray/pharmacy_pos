// models/Product.js
const { sequelize, DataTypes } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  sku: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  barcode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  // Cost price (what the pharmacy pays). Used for COGS / profit-margin reports.
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  batchNumber: DataTypes.STRING,
  expiryDate: DataTypes.DATEONLY,
  supplier: DataTypes.STRING,
  // Controlled-substance schedule: 'none' for OTC/normal, or DEA-style
  // schedules II–V for controlled drugs. Captured on the sale snapshot.
  schedule: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'none'
  },
  deletedAt: {  // ← ADD THIS for soft delete
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'products',
  paranoid: true,  // ← ADD THIS for soft delete
  indexes: [
    { fields: ['name'] },
    { fields: ['category'] },
  ]
});

module.exports = Product;