const AuditLog = require('../models/AuditLog');

// Record an audit entry. Fire-and-forget: a logging failure must NEVER break
// the request that triggered it, so errors are swallowed (and logged to stderr).
//
//   await recordAudit(req, { action: 'update', entity: 'Product',
//                            entityId: product.id, changes: { before, after } });
async function recordAudit(req, { action, entity, entityId, changes } = {}) {
  try {
    await AuditLog.create({
      userId: req?.user?.userId ?? null,
      userName: req?.user?.name || req?.user?.email || null,
      userRole: req?.user?.role || null,
      action,
      entity,
      entityId: entityId != null ? String(entityId) : null,
      changes: changes ?? null,
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || null,
    });
  } catch (err) {
    console.error('⚠️  Audit log write failed:', err.message);
  }
}

module.exports = { recordAudit };
