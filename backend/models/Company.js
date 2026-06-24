// models/Company.js
const { sequelize, DataTypes } = require('../config/database');

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

Company.getCompany = async function () {
  let company = await this.findOne();
  if (!company) {
    company = await this.create({});
  }
  return company;
};

// ==================== SERIALIZATION ====================
// The frontend works with a nested shape (address / contact / receiptSettings),
// while the table stores flat columns. These helpers translate between the two
// so settings (VAT rate, address, receipt footer…) actually round-trip.

Company.prototype.toClient = function () {
  const c = this.get({ plain: true });
  return {
    id: c.id,
    name: c.name,
    logo: c.logo,
    taxId: c.taxId,
    address: {
      street: c.addressStreet || '',
      city: c.addressCity || '',
      state: c.addressState || '',
      zipCode: c.addressZipCode || '',
      country: c.addressCountry || 'Ghana',
    },
    contact: {
      phone: c.contactPhone || '',
      email: c.contactEmail || '',
      website: c.contactWebsite || '',
    },
    receiptSettings: {
      header: c.receiptHeader || '',
      footer: c.receiptFooter || '',
      taxRate: c.taxRate == null ? 15 : Number(c.taxRate),
      includeTaxId: !!c.includeTaxId,
    },
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
};

// Map an incoming nested (or already-flat) payload to flat column updates.
// Only defined keys are included so a partial update never nulls other fields.
Company.flattenInput = function (body = {}) {
  const out = {};
  const set = (key, value) => { if (value !== undefined) out[key] = value; };

  set('name', body.name);
  set('logo', body.logo);
  set('taxId', body.taxId);

  const addr = body.address || {};
  set('addressStreet', addr.street ?? body.addressStreet);
  set('addressCity', addr.city ?? body.addressCity);
  set('addressState', addr.state ?? body.addressState);
  set('addressZipCode', addr.zipCode ?? body.addressZipCode);
  set('addressCountry', addr.country ?? body.addressCountry);

  const contact = body.contact || {};
  set('contactPhone', contact.phone ?? body.contactPhone);
  set('contactEmail', contact.email ?? body.contactEmail);
  set('contactWebsite', contact.website ?? body.contactWebsite);

  const rs = body.receiptSettings || {};
  set('receiptHeader', rs.header ?? body.receiptHeader);
  set('receiptFooter', rs.footer ?? body.receiptFooter);
  set('taxRate', rs.taxRate ?? body.taxRate);
  set('includeTaxId', rs.includeTaxId ?? body.includeTaxId);

  return out;
};

module.exports = Company;