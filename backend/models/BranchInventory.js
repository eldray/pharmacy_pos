const { sequelize, DataTypes } = require('../config/database');

const BranchInventory = sequelize.define('BranchInventory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  branchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'branches', key: 'id' }
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'products', key: 'id' }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  reorderLevel: {
    type: DataTypes.INTEGER,
    defaultValue: 10
  },
  rackLocation: DataTypes.STRING
}, {
  tableName: 'branch_inventories',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['branchId', 'productId'] }
  ]
});

module.exports = BranchInventory;
