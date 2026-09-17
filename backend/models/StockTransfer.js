const { sequelize, DataTypes } = require('../config/database');

const StockTransfer = sequelize.define('StockTransfer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transferNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  fromBranchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'branches', key: 'id' }
  },
  toBranchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'branches', key: 'id' }
  },
  requestedById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  approvedById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending', 'in_transit', 'completed', 'rejected'),
    defaultValue: 'pending'
  },
  items: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  notes: DataTypes.TEXT
}, {
  tableName: 'stock_transfers',
  timestamps: true
});

module.exports = StockTransfer;
