// routes/backup.js
const express = require('express');
const { sequelize } = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');

const router = express.Router();
const { numericIdParams } = require('../utils/numericIdParams');

numericIdParams(router);

/**
 * Tables to export. Order matters for restore (parents before children)
 * because we truncate + insert in this order.
 */
const TABLES = [
    // Core
    'users',
    'branches',
    'company',
    'insurance_providers',
    'lab_test_templates',

    // Catalog
    'products',
    'suppliers',

    // CRM
    'customers',
    'customer_insurances',

    // Ops
    'purchase_orders',
    'purchase_order_items',
    'inventory_logs',
    'transactions',
    'transaction_items',

    // Sales orders
    'sales_orders',
    'sales_order_items',

    // Lab
    'lab_transactions',
    'lab_tests',

    // Audit
    'audit_logs',
];

/**
 * Real column names for a table, from the catalogue rather than from the
 * request. Restore interpolates identifiers into SQL, so anything not in this
 * set is dropped — that is what makes a crafted key like `x"); DROP ...` inert.
 */
async function columnsOf(table, transaction) {
    const rows = await sequelize.query(
        `SELECT column_name FROM information_schema.columns
          WHERE table_name = ?
            AND table_schema = current_schema()`,
        { replacements: [table], type: sequelize.QueryTypes.SELECT, transaction }
    );
    return new Set(rows.map((r) => r.column_name));
}

// GET /api/backup/export  → JSON download
router.get('/export', auth, adminAuth, async (req, res) => {
    try {
        const qi = sequelize.getQueryInterface();
        const existingTables = await qi.showAllTables();
        const existingSet = new Set(existingTables.map((t) => (typeof t === 'string' ? t : t.tableName)));

        const data = {};
        for (const table of TABLES) {
            if (!existingSet.has(table)) continue;
            try {
                const rows = await sequelize.query(`SELECT * FROM "${table}"`, {
                    type: sequelize.QueryTypes.SELECT,
                });
                data[table] = rows;
            } catch (err) {
                console.warn(`Backup: skipping table ${table} —`, err.message);
                data[table] = [];
            }
        }

        const payload = {
            metadata: {
                name: 'pharmacy-pos-backup',
                createdAt: new Date().toISOString(),
                version: 1,
                tables: Object.keys(data).length,
                rows: Object.values(data).reduce((n, rows) => n + rows.length, 0),
            },
            tables: data,
        };

        await recordAudit(req, {
            action: 'backup',
            entity: 'Database',
            entityId: 'all',
            changes: { tables: Object.keys(data).length, rows: payload.metadata.rows },
        });

        res.setHeader('Content-Type', 'application/json');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="pharmacy-backup-${new Date().toISOString().slice(0, 10)}.json"`
        );
        res.send(JSON.stringify(payload, null, 2));
    } catch (err) {
        console.error('Backup export error:', err);
        res.status(500).json({ success: false, message: 'Backup failed' });
    }
});

// POST /api/backup/restore  { metadata, tables: { tableName: [rows...] } }
router.post('/restore', auth, adminAuth, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { tables, metadata } = req.body || {};
        if (!tables || typeof tables !== 'object') {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Missing "tables" object in body' });
        }

        const qi = sequelize.getQueryInterface();
        const existingTables = await qi.showAllTables();
        const existingSet = new Set(existingTables.map((t) => (typeof t === 'string' ? t : t.tableName)));
        // Identifier allow-list, resolved once per restore.
        const allowedColumns = new Map();
        for (const table of TABLES) {
            if (existingSet.has(table)) allowedColumns.set(table, await columnsOf(table, t));
        }

        // Disable FK checks while we swap data.
        await sequelize.query('SET session_replication_role = replica;', { transaction: t });

        // Wipe in reverse order, insert in forward order.
        for (const table of [...TABLES].reverse()) {
            if (!existingSet.has(table)) continue;
            if (!(table in tables)) continue;
            await sequelize.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`, { transaction: t });
        }

        for (const table of TABLES) {
            if (!existingSet.has(table)) continue;
            const rows = tables[table];
            if (!Array.isArray(rows) || rows.length === 0) continue;

            // Build a parameterised bulk insert. Column list is intersected with
            // the real schema — unknown/injected keys are ignored.
            const known = allowedColumns.get(table) || new Set();
            const columns = Object.keys(rows[0]).filter((c) => known.has(c));
            if (columns.length === 0) {
                console.warn(`Backup restore: no usable columns for ${table}, skipped`);
                continue;
            }
            const columnList = columns.map((c) => `"${c}"`).join(', ');
            const placeholders = columns.map(() => '?').join(', ');

            for (const row of rows) {
                const values = columns.map((c) => {
                    const v = row[c];
                    if (v !== null && typeof v === 'object') return JSON.stringify(v); // JSONB / arrays
                    return v;
                });
                await sequelize.query(
                    `INSERT INTO "${table}" (${columnList}) VALUES (${placeholders})`,
                    { replacements: values, transaction: t }
                );
            }
        }

        await sequelize.query('SET session_replication_role = DEFAULT;', { transaction: t });

        // Bump sequences so future inserts don't collide with restored IDs.
        for (const table of TABLES) {
            if (!existingSet.has(table)) continue;
            try {
                await sequelize.query(
                    `SELECT setval(
             pg_get_serial_sequence('"${table}"', 'id'),
             COALESCE((SELECT MAX(id) FROM "${table}"), 1)
           )`,
                    { transaction: t }
                );
            } catch {
                // Table without an `id` sequence — safe to skip.
            }
        }

        await t.commit();

        await recordAudit(req, {
            action: 'restore',
            entity: 'Database',
            entityId: 'all',
            changes: { tables: Object.keys(tables).length, source: metadata?.name || 'unknown' },
        });

        res.json({ success: true, tables: Object.keys(tables).length });
    } catch (err) {
        await t.rollback();
        console.error('Backup restore error:', err);
        res.status(500).json({ success: false, message: 'Restore failed' });
    }
});

module.exports = router;