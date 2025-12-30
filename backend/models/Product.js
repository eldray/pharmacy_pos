const { sequelize, DataTypes } = require('../database');

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
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  batchNumber: DataTypes.STRING,
  expiryDate: DataTypes.DATEONLY,
  supplier: DataTypes.STRING
}, {
  tableName: 'products'
});

module.exports = Product;