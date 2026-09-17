const { sequelize, DataTypes } = require('../config/database');

const InsuranceProvider = sequelize.define('InsuranceProvider', {
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
  coverageType: {
    type: DataTypes.ENUM('fixed', 'percentage'),
    allowNull: false,
    defaultValue: 'percentage'
  },
  defaultCopayPercent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 20.00 // Used only when coverageType = 'percentage'
  },
  contactPerson: DataTypes.STRING,
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  address: DataTypes.TEXT,
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
}, {
  tableName: 'insurance_providers',
  timestamps: true
});

module.exports = InsuranceProvider;