// models/InventoryLog.js
const { sequelize, DataTypes } = require('../database');
const User = require('./User');
const Product = require('./Product');

const InventoryLog = sequelize.define('InventoryLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Product,
      key: 'id'
    }
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
    references: {
      model: User,
      key: 'id'
    }
  },
  userName: DataTypes.STRING,
  notes: DataTypes.TEXT
}, {
  tableName: 'inventory_logs'
});

InventoryLog.belongsTo(Product, { foreignKey: 'productId' });
InventoryLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = InventoryLog;