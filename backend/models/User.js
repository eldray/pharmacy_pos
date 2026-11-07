// backend/models/User.js
const { sequelize, DataTypes } = require('../config/database');

const User = sequelize.define('User', {
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
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'manager', 'pharmacist_sales', 'cashier', 'lab_tech'),
    allowNull: false,
    defaultValue: 'cashier'
  },
  status: {
    type: DataTypes.ENUM('active', 'blocked'),
    allowNull: false,
    defaultValue: 'active'
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      const bcrypt = require('bcryptjs');
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      const bcrypt = require('bcryptjs');
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

User.prototype.comparePassword = async function (password) {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(password, this.password);
};

/**
 * Accounts still using one of the passwords printed on the demo sign-in screen.
 * A database carried over from a demo install keeps its hashes, so production
 * checks at boot (to name them in the log) and at login (to refuse them).
 */
User.demoPasswordAccounts = async function () {
  const { DEMO_PASSWORDS } = require('../utils/environment');
  const users = await this.findAll({ attributes: ['id', 'email', 'role', 'password'] });
  const found = [];
  for (const user of users) {
    for (const candidate of DEMO_PASSWORDS) {
      if (await user.comparePassword(candidate)) {
        found.push({ id: user.id, email: user.email, role: user.role });
        break;
      }
    }
  }
  return found;
};

module.exports = User;