// 20261108-strip-auto-order-notes.js
//
// Paying an order used to stamp `Order #<orderNumber>` (or the lab-service
// variant) into the transaction's notes. That fabricated a Notes section on
// every receipt, showing a number that differs from the receipt's own — the
// order and the sale draw separate numbers from the same MED sequence.
// The pay routes now carry only notes a human wrote; this clears the stamps
// already in the ledger. The order-to-receipt link is not lost: it remains in
// the audit log (pay action) and the inventory logs.
//
// Reversible: down() re-derives each stamp by pairing a transaction with the
// order that has the same items, customer and total and was created just
// before it. Only exact matches are restored.
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize, transaction) => {
    const sequelize = queryInterface.sequelize;
    const [rows] = await sequelize.query(
      `UPDATE "transactions" SET "notes" = NULL
        WHERE "notes" ~ '^(Lab Service )?Order #MED-[0-9]+$'
        RETURNING id`,
      { transaction }
    );
    console.log(`   cleared auto-generated order notes on ${rows.length} transaction(s)`);
  },

  down: async (queryInterface, Sequelize, transaction) => {
    const sequelize = queryInterface.sequelize;
    // Best-effort restore: same items, same customer, same total, order created
    // within the hour before the sale. Ambiguous pairs are left null.
    const [pairs] = await sequelize.query(
      `SELECT t.id AS tx_id, o."orderNumber" AS order_number
         FROM "transactions" t
         JOIN "sales_orders" o
           ON o.items = t.items
          AND COALESCE(o."customerName", '') = COALESCE(t."customerName", '')
          AND o.total = t.total
          AND o."createdAt" <= t."createdAt"
          AND o."createdAt" >= t."createdAt" - INTERVAL '1 hour'
        WHERE t.notes IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM "sales_orders" o2
             WHERE o2.id <> o.id
               AND o2.items = t.items
               AND COALESCE(o2."customerName", '') = COALESCE(t."customerName", '')
               AND o2.total = t.total
               AND o2."createdAt" <= t."createdAt"
               AND o2."createdAt" >= t."createdAt" - INTERVAL '1 hour'
          )`,
      { transaction }
    );
    for (const p of pairs) {
      await sequelize.query(
        `UPDATE "transactions" SET "notes" = $1 WHERE id = $2`,
        { bind: [`Order #${p.order_number}`, p.tx_id], transaction }
      );
    }
    console.log(`   restored order notes on ${pairs.length} transaction(s)`);
  }
};