const { sequelize, DataTypes } = require('../config/database');

const InventoryLog = sequelize.define('InventoryLog', {
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
  productName: DataTypes.STRING,
  type: {
    type: DataTypes.ENUM('inflow', 'outflow', 'adjustment'),
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  reference: DataTypes.STRING,
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  userName: DataTypes.STRING,
  notes: DataTypes.TEXT
}, {
  tableName: 'inventory_logs'
});

// NO ASSOCIATIONS HERE - They are handled in models/index.js

module.exports = InventoryLog;