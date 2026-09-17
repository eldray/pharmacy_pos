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
  // Dispensing Units & Package breakdown fields
  packageType: {
    type: DataTypes.STRING,
    defaultValue: 'Box'
  },
  dispensingUnit: {
    type: DataTypes.STRING,
    defaultValue: 'Tablet'
  },
  unitsPerPackage: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  packagePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  // Insurance & retail pricing
  sellingPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Patient-facing retail price (used on POS & receipts)'
  },
  insurancePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Insurer-agreed reimbursement price per unit. Co-pay = sellingPrice - insurancePrice'
  },
  allowUnitBreakdown: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
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