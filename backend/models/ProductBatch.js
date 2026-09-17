const { sequelize, DataTypes } = require('../config/database');

const ProductBatch = sequelize.define('ProductBatch', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'products', key: 'id' }
  },
  branchId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'branches', key: 'id' }
  },
  batchNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  expiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  costPrice: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  supplierName: DataTypes.STRING,
  status: {
    type: DataTypes.ENUM('active', 'expired', 'depleted'),
    defaultValue: 'active'
  }
}, {
  tableName: 'product_batches',
  timestamps: true,
  indexes: [
    { fields: ['productId'] },
    { fields: ['expiryDate'] },
    { fields: ['batchNumber'] }
  ]
});

module.exports = ProductBatch;
