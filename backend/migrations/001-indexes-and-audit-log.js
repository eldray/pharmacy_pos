// 001-indexes-and-audit-log.js
// Baseline migration for existing databases:
//   1. Adds performance indexes on FKs and common search/sort fields.
//   2. Creates the audit_logs table + its indexes.
// All statements use IF NOT EXISTS so this is safe to run on any existing DB.

module.exports = {
  async up({ sequelize, transaction }) {
    const q = (sql) => sequelize.query(sql, { transaction });

    // ---- Performance indexes (idempotent) ----
    const indexes = [
      ['idx_products_name', 'products', '("name")'],
      ['idx_products_category', 'products', '("category")'],
      ['idx_transactions_cashierId', 'transactions', '("cashierId")'],
      ['idx_transactions_createdAt', 'transactions', '("createdAt")'],
      ['idx_transactions_paymentMethod', 'transactions', '("paymentMethod")'],
      ['idx_inventory_logs_productId', 'inventory_logs', '("productId")'],
      ['idx_inventory_logs_userId', 'inventory_logs', '("userId")'],
      ['idx_inventory_logs_createdAt', 'inventory_logs', '("createdAt")'],
      ['idx_purchase_orders_supplierId', 'purchase_orders', '("supplierId")'],
      ['idx_purchase_orders_status', 'purchase_orders', '("status")'],
      ['idx_purchase_orders_orderDate', 'purchase_orders', '("orderDate")'],
      ['idx_lab_transactions_requestedBy', 'lab_transactions', '("requestedBy")'],
      ['idx_lab_transactions_status', 'lab_transactions', '("status")'],
      ['idx_lab_transactions_paymentStatus', 'lab_transactions', '("paymentStatus")'],
      ['idx_lab_transactions_createdAt', 'lab_transactions', '("createdAt")'],
      ['idx_lab_tests_labTransactionId', 'lab_tests', '("labTransactionId")'],
      ['idx_lab_tests_performedBy', 'lab_tests', '("performedBy")'],
      ['idx_lab_tests_status', 'lab_tests', '("status")'],
    ];

    for (const [name, table, cols] of indexes) {
      await q(`CREATE INDEX IF NOT EXISTS "${name}" ON "${table}" ${cols}`);
    }

    // ---- audit_logs table ----
    await q(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER,
        "userName" VARCHAR(255),
        "userRole" VARCHAR(255),
        "action" VARCHAR(255) NOT NULL,
        "entity" VARCHAR(255) NOT NULL,
        "entityId" VARCHAR(255),
        "changes" JSONB,
        "ipAddress" VARCHAR(255),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await q(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity" ON "audit_logs" ("entity", "entityId")`);
    await q(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_userId" ON "audit_logs" ("userId")`);
    await q(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs" ("action")`);
    await q(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_createdAt" ON "audit_logs" ("createdAt")`);
  },
};
