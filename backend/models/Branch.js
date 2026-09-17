const { sequelize, DataTypes } = require('../config/database');

const Branch = sequelize.define('Branch', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  type: {
    type: DataTypes.ENUM('warehouse', 'branch'),
    allowNull: false,
    defaultValue: 'branch'
  },
  address: DataTypes.STRING,
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  isMain: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
}, {
  tableName: 'branches',
  timestamps: true
});

module.exports = Branch;
