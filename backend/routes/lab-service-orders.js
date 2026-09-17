// backend/routes/lab-service-orders.js
const express = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const {
    LabServiceOrder,
    LabTransaction,
    LabTest,
    User,
    Company,
    Customer,
    Transaction,
} = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

const ORDER_INCLUDE = [
    { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
    {
        model: Customer,
        as: 'customer',
        attributes: ['id', 'fullName', 'phone', 'email', 'dob', 'gender'],
    },
];

// ─── GET /lab-service-orders/today ─────────────────────────────────
router.get('/today', auth, async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const orders = await LabServiceOrder.findAll({
            where: { createdAt: { [Op.between]: [startOfDay, endOfDay] } },
            include: ORDER_INCLUDE,
            order: [['createdAt', 'DESC']],
        });
        res.json(orders);
    } catch (err) {
        console.error('Fetch today lab orders error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ─── GET /lab-service-orders/search?q= ─────────────────────────────
router.get('/search', auth, async (req, res) => {
    try {
        const { q = '' } = req.query;
        if (!q.trim()) return res.json([]);

        const orders = await LabServiceOrder.findAll({
            where: {
                [Op.or]: [
                    { orderNumber: { [Op.iLike]: `%${q}%` } },
                    { patientName: { [Op.iLike]: `%${q}%` } },
                    { patientPhone: { [Op.iLike]: `%${q}%` } },
                ],
            },
            include: ORDER_INCLUDE,
            order: [['createdAt', 'DESC']],
            limit: 30,
        });
        res.json(orders);
    } catch (err) {
        console.error('Search lab orders error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ─── GET /lab-service-orders/stats/summary ─────────────────────────
router.get('/stats/summary', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const where = {};
        if (startDate && endDate) {
            where.createdAt = { [Op.gte]: new Date(startDate), [Op.lte]: new Date(endDate) };
        }

        const [total, pending, paid, cancelled] = await Promise.all([
            LabServiceOrder.count({ where }),
            LabServiceOrder.count({ where: { ...where, status: 'pending_payment' } }),
            LabServiceOrder.count({ where: { ...where, status: 'paid' } }),
            LabServiceOrder.count({ where: { ...where, status: 'cancelled' } }),
        ]);

        const paidOrders = await LabServiceOrder.findAll({
            where: { ...where, status: 'paid' },
            attributes: ['copayAmount', 'total'],
        });
        const revenue = paidOrders.reduce(
            (sum, o) => sum + Number(o.copayAmount || o.total || 0),
            0
        );

        res.json({ total, pending, paid, cancelled, revenue });
    } catch (err) {
        console.error('Lab service order stats error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ─── GET /lab-service-orders?status= ───────────────────────────────
// ─── GET /lab-service-orders?status= ───────────────────────────────
router.get('/', auth, async (req, res) => {
    try {
        const { status = 'pending_payment' } = req.query;

        // 'all' means "don't filter by status"
        const where = {};
        if (status && status !== 'all') {
            where.status = status;
        }

        const orders = await LabServiceOrder.findAll({
            where,
            include: ORDER_INCLUDE,
            order: [['createdAt', 'DESC']],
        });
        res.json(orders);
    } catch (err) {
        console.error('Fetch lab orders error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});
// ─── GET /lab-service-orders/:id ───────────────────────────────────
router.get('/:id', auth, async (req, res) => {
    try {
        const order = await LabServiceOrder.findByPk(req.params.id, {
            include: [
                ...ORDER_INCLUDE,
                { model: LabTransaction, as: 'labTransaction' },
            ],
        });
        if (!order) return res.status(404).json({ msg: 'Lab service order not found' });
        res.json(order);
    } catch (err) {
        console.error('Get lab order error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ─── POST /lab-service-orders ──────────────────────────────────────
router.post('/', auth, async (req, res) => {
    try {
        const {
            customerId,
            patientName, patientPhone, patientEmail, patientAge, patientGender,
            tests,
            subtotal, tax, total,
            insuranceProviderId, insuranceProviderName, policyNumber,
            insuranceCoverage = 0, copayAmount,
            notes, branchId,
        } = req.body;

        if (!tests || tests.length === 0) {
            return res.status(400).json({ msg: 'At least one test is required' });
        }

        const user = await User.findByPk(req.user.userId);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // Resolve patient info from Customer if only customerId given
        let resolvedName = patientName;
        let resolvedPhone = patientPhone;
        let resolvedEmail = patientEmail;
        let resolvedAge = patientAge ? parseInt(patientAge) : null;
        let resolvedGender = patientGender;

        if (customerId) {
            const cust = await Customer.findByPk(customerId);
            if (cust) {
                resolvedName = resolvedName || cust.fullName;
                resolvedPhone = resolvedPhone || cust.phone;
                resolvedEmail = resolvedEmail || cust.email;
                if (resolvedAge == null && cust.dob) {
                    const d = new Date(cust.dob);
                    resolvedAge = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                }
                if (!resolvedGender && cust.gender) {
                    resolvedGender = cust.gender.charAt(0).toUpperCase() + cust.gender.slice(1);
                }
            }
        }

        if (!resolvedName) {
            return res.status(400).json({ msg: 'Patient name is required' });
        }

        const orderNumber = `LSO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const order = await LabServiceOrder.create({
            orderNumber,
            branchId: branchId || null,
            createdById: req.user.userId,
            createdByName: user.name,
            customerId: customerId || null,
            patientName: resolvedName,
            patientPhone: resolvedPhone,
            patientEmail: resolvedEmail,
            patientAge: resolvedAge,
            patientGender: resolvedGender,
            tests,
            subtotal: parseFloat(subtotal) || 0,
            tax: parseFloat(tax) || 0,
            total: parseFloat(total) || 0,
            insuranceProviderId: insuranceProviderId || null,
            insuranceProviderName: insuranceProviderName || null,
            policyNumber: policyNumber || null,
            insuranceCoverage: parseFloat(insuranceCoverage) || 0,
            copayAmount: parseFloat(copayAmount || total) || 0,
            status: 'pending_payment',
            notes: notes || null,
        });

        const full = await LabServiceOrder.findByPk(order.id, { include: ORDER_INCLUDE });
        res.status(201).json(full);
    } catch (err) {
        console.error('Create lab service order error:', err);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});
// ─── POST /lab-service-orders/:id/pay ──────────────────────────────
// Cashier collects payment. Creates a LabTransaction + LabTest rows,
// links them via labTransactionId, and marks the order as paid.
router.post('/:id/pay', auth, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { paymentMethod, paymentReference } = req.body;

        const order = await LabServiceOrder.findByPk(req.params.id, { transaction: t });
        if (!order) {
            await t.rollback();
            return res.status(404).json({ msg: 'Lab service order not found' });
        }
        if (order.status === 'paid') {
            await t.rollback();
            return res.status(400).json({ msg: 'Order has already been paid' });
        }

        const cashier = await User.findByPk(req.user.userId, { transaction: t });

        // ── 1. Create the LabTransaction (the actual lab work record) ───
        const transactionNumber = `LAB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const receiptNumber = `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const labTx = await LabTransaction.create({
            transactionNumber,
            customerId: order.customerId,
            patientName: order.patientName,
            patientPhone: order.patientPhone,
            patientEmail: order.patientEmail,
            patientAge: order.patientAge,
            patientGender: order.patientGender,
            totalAmount: order.total,
            paidAmount: order.copayAmount || order.total,
            paymentMethod: paymentMethod || 'cash',
            paymentReference: paymentReference || null,
            paymentStatus: 'paid',
            status: 'pending',
            notes: order.notes,
            requestedBy: order.createdById,
            requestedByName: order.createdByName,
            receiptNumber,
            receiptPrintedAt: new Date(),
        }, { transaction: t });

        // ── 2. Create LabTest rows ────────────────────────────────────
        for (const testData of order.tests || []) {
            const testNumber = `TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            await LabTest.create({
                testNumber,
                labTransactionId: labTx.id,
                testType: testData.testType,
                testCategory: testData.testCategory || 'General',
                testPrice: parseFloat(testData.testPrice) || 0,
                priority: testData.priority || 'normal',
                sampleType: testData.sampleType || null,
                status: 'pending',
                notes: testData.notes || null,
            }, { transaction: t });
        }

        // ── 3. Create the general Transaction record (unified ledger) ─
        // This makes the lab payment show up on the same reports as POS sales.
        const txNumber = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await Transaction.create({
            transactionNumber: txNumber,
            cashierId: req.user.userId,
            customerId: order.customerId,
            cashierName: cashier ? cashier.name : 'Cashier',
            items: (order.tests || []).map((test) => ({
                productId: null,
                product: { name: test.testType, sku: '', category: test.testCategory || 'Lab' },
                quantity: test.quantity || 1,
                unitPrice: parseFloat(test.testPrice) || 0,
                total: (parseFloat(test.testPrice) || 0) * (test.quantity || 1),
                discount: 0,
            })),
            subtotal: order.subtotal,
            tax: order.tax,
            total: order.copayAmount || order.total,
            paymentMethod: paymentMethod || 'cash',
            paymentReference: paymentReference || null,
            customerName: order.patientName,
            customerPhone: order.patientPhone,
            notes: `Lab Service Order #${order.orderNumber}`,
        }, { transaction: t });

        // ── 4. Mark order paid ────────────────────────────────────────
        order.status = 'paid';
        order.cashierId = req.user.userId;
        order.cashierName = cashier ? cashier.name : 'Cashier';
        order.labTransactionId = labTx.id;
        await order.save({ transaction: t });

        await t.commit();

        const full = await LabServiceOrder.findByPk(order.id, {
            include: [
                ...ORDER_INCLUDE,
                { model: LabTransaction, as: 'labTransaction' },
            ],
        });
        res.json({ success: true, order: full, transaction: labTx });
    } catch (err) {
        await t.rollback();
        console.error('Pay lab service order error:', err);
        res.status(500).json({ msg: err.message || 'Server error' });
    }
});

// ─── POST /lab-service-orders/:id/cancel ───────────────────────────
router.post('/:id/cancel', auth, async (req, res) => {
    try {
        const order = await LabServiceOrder.findByPk(req.params.id);
        if (!order) return res.status(404).json({ msg: 'Lab service order not found' });
        if (order.status === 'paid') {
            return res.status(400).json({ msg: 'Cannot cancel a paid order' });
        }
        order.status = 'cancelled';
        await order.save();
        res.json(order);
    } catch (err) {
        console.error('Cancel lab order error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ─── POST /lab-service-orders/:id/refund ──────────────────────────
// Refund a PAID lab order. Creates a negative Transaction to reverse revenue.
// No stock to restore (lab tests don't consume inventory).
router.post('/:id/refund', auth, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const order = await LabServiceOrder.findByPk(req.params.id, { transaction: t });
        if (!order) {
            await t.rollback();
            return res.status(404).json({ msg: 'Lab service order not found' });
        }
        if (order.status !== 'paid') {
            await t.rollback();
            return res.status(400).json({ msg: 'Only paid orders can be refunded' });
        }
        if (order.refundedAt) {
            await t.rollback();
            return res.status(400).json({ msg: 'Order has already been refunded' });
        }

        const cashier = await User.findByPk(req.user.userId, { transaction: t });
        const refundNumber = `REF-${order.orderNumber}`;

        // Reversal Transaction (negative amounts)
        await Transaction.create({
            transactionNumber: refundNumber,
            cashierId: req.user.userId,
            customerId: order.customerId,
            cashierName: cashier ? cashier.name : 'Cashier',
            items: (order.tests || []).map((test) => ({
                productId: null,
                product: { name: test.testType, sku: '', category: test.testCategory || 'Lab' },
                quantity: -(test.quantity || 1),
                unitPrice: parseFloat(test.testPrice) || 0,
                total: -((parseFloat(test.testPrice) || 0) * (test.quantity || 1)),
                discount: 0,
            })),
            subtotal: -parseFloat(order.subtotal),
            tax: -parseFloat(order.tax),
            total: -(parseFloat(order.copayAmount || order.total)),
            paymentMethod: 'refund',
            paymentReference: `Refund for ${order.orderNumber}`,
            customerName: order.patientName,
            customerPhone: order.patientPhone,
            notes: `Refund of lab service order ${order.orderNumber}`,
        }, { transaction: t });

        // Update the lab order — flag refunded (we keep status='paid' for records,
        // but add a refundedAt timestamp so it doesn't get refunded twice)
        await order.update({
            refundedAt: new Date(),
            refundedBy: req.user.userId,
        }, { transaction: t });

        await t.commit();

        const { recordAudit } = require('../utils/audit');
        await recordAudit(req, {
            action: 'refund',
            entity: 'LabServiceOrder',
            entityId: order.id,
            changes: { orderNumber: order.orderNumber, refundNumber }
        });

        res.json({ success: true, message: 'Lab order refunded', refundNumber });
    } catch (err) {
        await t.rollback();
        console.error('Refund lab order error:', err);
        res.status(500).json({ msg: err.message || 'Server error' });
    }
});

module.exports = router;