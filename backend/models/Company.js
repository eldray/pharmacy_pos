// models/Company.js
const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    default: 'Pharmacy POS'
  },
  logo: {
    type: String,
    default: null
  },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    country: { type: String, default: 'Ghana' }
  },
  contact: {
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    website: { type: String, default: '' }
  },
  taxId: {
    type: String,
    default: null
  },
  receiptSettings: {
    header: {
      type: String,
      default: 'Thank you for your business!'
    },
    footer: {
      type: String,
      default: 'We hope to see you again soon!'
    },
    taxRate: {
      type: Number,
      default: 15
    },
    includeTaxId: {
      type: Boolean,
      default: false
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true
});

companySchema.statics.getCompany = async function() {
  let company = await this.findOne();
  if (!company) {
    company = await this.create({});
  }
  return company;
};

module.exports = mongoose.model('Company', companySchema);
