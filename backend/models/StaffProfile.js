const { sequelize, DataTypes } = require('../config/database');

const StaffProfile = sequelize.define('StaffProfile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: 'users', key: 'id' }
  },
  branchId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'branches', key: 'id' }
  },
  employeeId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Pharmacy'
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phoneNumber: DataTypes.STRING,
  address: DataTypes.TEXT,
  dob: DataTypes.DATEONLY,
  gender: DataTypes.STRING,
  hireDate: DataTypes.DATEONLY,
  employmentType: {
    type: DataTypes.ENUM('full_time', 'part_time', 'contract', 'locum'),
    defaultValue: 'full_time'
  },
  salary: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  emergencyContactName: DataTypes.STRING,
  emergencyContactPhone: DataTypes.STRING,
  status: {
    type: DataTypes.ENUM('active', 'on_leave', 'suspended', 'terminated'),
    defaultValue: 'active'
  }
}, {
  tableName: 'staff_profiles',
  timestamps: true
});

module.exports = StaffProfile;
