// models/Supplier.js
const { sequelize, DataTypes } = require('../database');

const Supplier = sequelize.define('Supplier', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  phone: DataTypes.STRING,
  address: DataTypes.TEXT,
  city: DataTypes.STRING,
  country: DataTypes.STRING
}, {
  tableName: 'suppliers'
});

module.exports = Supplier;