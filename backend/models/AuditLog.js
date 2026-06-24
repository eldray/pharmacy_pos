const { sequelize, DataTypes } = require('../config/database');

// Immutable record of who changed what and when. Written by the audit helper
// (utils/audit.js) from the mutating routes. Never updated after creation.
const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true // may be null for system/unauthenticated actions
  },
  userName: DataTypes.STRING,
  userRole: DataTypes.STRING,
  action: {
    // e.g. 'create', 'update', 'delete', 'refund', 'login'
    type: DataTypes.STRING,
    allowNull: false
  },
  entity: {
    // e.g. 'Product', 'User', 'Company', 'Transaction'
    type: DataTypes.STRING,
    allowNull: false
  },
  entityId: DataTypes.STRING,
  changes: {
    // arbitrary before/after or payload snapshot
    type: DataTypes.JSONB,
    allowNull: true
  },
  ipAddress: DataTypes.STRING
}, {
  tableName: 'audit_logs',
  updatedAt: false, // audit rows are append-only
  indexes: [
    { fields: ['entity', 'entityId'] },
    { fields: ['userId'] },
    { fields: ['action'] },
    { fields: ['createdAt'] },
  ]
});

module.exports = AuditLog;
