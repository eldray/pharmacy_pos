// models/Company.js

const { sequelize, DataTypes } = require('../database');

const Company = sequelize.define('Company', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Pharmacy POS'
  },
  logo: DataTypes.STRING,
  addressStreet: DataTypes.STRING,
  addressCity: DataTypes.STRING,
  addressState: DataTypes.STRING,
  addressZipCode: DataTypes.STRING,
  addressCountry: {
    type: DataTypes.STRING,
    defaultValue: 'Ghana'
  },
  contactPhone: DataTypes.STRING,
  contactEmail: DataTypes.STRING,
  contactWebsite: DataTypes.STRING,
  taxId: DataTypes.STRING,
  receiptHeader: {
    type: DataTypes.TEXT,
    defaultValue: 'Thank you for your business!'
  },
  receiptFooter: {
    type: DataTypes.TEXT,
    defaultValue: 'We hope to see you again soon!'
  },
  taxRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 15.0
  },
  includeTaxId: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'company',
  timestamps: true
});

Company.getCompany = async function() {
  let company = await this.findOne();
  if (!company) {
    company = await this.create({});
  }
  return company;
};

module.exports = Company;