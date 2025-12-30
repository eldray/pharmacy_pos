// models/PurchaseOrder.js
const { sequelize, DataTypes } = require('../database');
const Supplier = require('./Supplier');
const Product = require('./Product');

const PurchaseOrder = sequelize.define('PurchaseOrder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Supplier,
      key: 'id'
    }
  },
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
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'received', 'cancelled'),
    defaultValue: 'pending'
  },
  orderDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  expectedDeliveryDate: DataTypes.DATE,
  deliveryDate: DataTypes.DATE
}, {
  tableName: 'purchase_orders'
});

PurchaseOrder.belongsTo(Supplier, { foreignKey: 'supplierId' });

module.exports = PurchaseOrder;