const { sequelize, DataTypes } = require('../database');

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
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'cashier', 'officer'),
    allowNull: false,
    defaultValue: 'cashier'
  }
}, {
  tableName: 'users',
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

User.prototype.comparePassword = async function(password) {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(password, this.password);
};

module.exports = User;