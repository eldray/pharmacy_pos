const express = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const LabTransaction = require('../models/LabTransaction');
const LabTest = require('../models/LabTest');
const User = require('../models/User');
const Company = require('../models/Company');
const Customer = require('../models/Customer');
const { auth, adminAuth, labAuth } = require('../middleware/auth');
const { createdAtRange } = require('../utils/dateRange');
const { priceLabTests, resolveInsurance } = require('../utils/pricing');
const { nextReference } = require('../utils/references');
const { normalizePaymentMethod, pick } = require('../utils/validators');
const { isClientError, clientMessage } = require('../utils/errors');
const { LAB_TRANSACTION_FIELDS, labTestFieldsFor } = require('../utils/editableFields');

const router = express.Router();
const { numericIdParams } = require('../utils/numericIdParams');

numericIdParams(router);

// Get all lab transactions
router.get('/', auth, async (req, res) => {
    try {
        const {
            status,
            paymentStatus,
            startDate,
            endDate,
            patientName,
            customerId,
            q,
        } = req.query;
        const where = {};

        if (status) where.status = status;
        if (paymentStatus) where.paymentStatus = paymentStatus;
        if (customerId) where.customerId = customerId;

        // When the caller asks for pending only, hide cancelled rows.
        if (paymentStatus === 'pending' && !status) {
            where.status = { [Op.ne]: 'cancelled' };
        }

        if (patientName) {
            where.patientName = { [Op.iLike]: `%${patientName}%` };
        }

        if (startDate && endDate) {
            where.createdAt = createdAtRange(startDate, endDate);
        }

        // Free-text search across number / patient / phone
        if (q && q.trim()) {
            where[Op.or] = [
                { transactionNumber: { [Op.iLike]: `%${q}%` } },
                { receiptNumber: { [Op.iLike]: `%${q}%` } },
                { patientName: { [Op.iLike]: `%${q}%` } },
                { patientPhone: { [Op.iLike]: `%${q}%` } },
            ];
        }

        const transactions = await LabTransaction.findAll({
            where,
            include: [
                { model: LabTest, as: 'labTests' },
                { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'fullName', 'phone', 'email', 'dob', 'gender'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        const normalized = transactions.map(t => ({
            ...t.toJSON(),
            totalAmount: parseFloat(t.totalAmount) || 0,
            paidAmount: parseFloat(t.paidAmount) || 0,
        }));

        res.json(normalized);
    } catch (err) {
        console.error('Get lab transactions error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Get lab transaction by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const transaction = await LabTransaction.findByPk(req.params.id, {
            include: [
                {
                    model: LabTest,
                    as: 'labTests',
                    include: [{ model: User, as: 'performer', attributes: ['id', 'name'] }]
                },
                { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'fullName', 'phone', 'email', 'dob', 'gender'],
                    include: [{ model: require('../models/CustomerInsurance'), as: 'insurances' }],
                },
            ]
        });

        if (!transaction) {
            return res.status(404).json({ msg: 'Lab transaction not found' });
        }

        const company = await Company.getCompany();

        const normalized = {
            ...transaction.toJSON(),
            totalAmount: parseFloat(transaction.totalAmount) || 0,
            paidAmount: parseFloat(transaction.paidAmount) || 0,
            labTests: (transaction.labTests || []).map(test => ({
                ...test.toJSON(),
                testPrice: parseFloat(test.testPrice) || 0,
            })),
            company
        };

        res.json(normalized);
    } catch (err) {
        console.error('Get lab transaction error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Create lab transaction with tests
router.post('/', auth, async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const user = await User.findByPk(req.user.userId);
        if (!user) {
            await t.rollback();
            return res.status(404).json({ msg: 'User not found' });
        }

        const {
            customerId,
            patientName,
            patientPhone,
            patientEmail,
            patientAge,
            patientGender,
            paymentMethod,
            paymentReference,
            paymentStatus,
            notes,
            tests,
            insuranceProviderId,
            policyNumber
        } = req.body;

        if (!tests || tests.length === 0) {
            await t.rollback();
            return res.status(400).json({ msg: 'At least one test is required' });
        }

        // Resolve patient info from Customer if customerId is provided
        let resolvedName = patientName;
        let resolvedPhone = patientPhone;
        let resolvedEmail = patientEmail;
        let resolvedAge = patientAge ? parseInt(patientAge) : null;
        let resolvedGender = patientGender;

        if (customerId) {
            const cust = await Customer.findByPk(customerId, { transaction: t });
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
            await t.rollback();
            return res.status(400).json({ msg: 'Patient name is required' });
        }

        // Test prices come from the templates, so a tampered client cannot set
        // its own lab bill.
        const priced = await priceLabTests(tests, { transaction: t });

        // Same dual co-pay split as a POS order, derived from the provider row.
        // The patient owes the copay; the rest is the insurer's claim on the lab.
        const insurance = await resolveInsurance(insuranceProviderId, priced, { transaction: t });

        const transactionNumber = await nextReference('LAB', { transaction: t });
        const receiptNumber = await nextReference('REC', { transaction: t });

        const transaction = await LabTransaction.create({
            transactionNumber,
            customerId: customerId || null,
            patientName: resolvedName,
            patientPhone: resolvedPhone,
            patientEmail: resolvedEmail,
            patientAge: resolvedAge,
            patientGender: resolvedGender,
            totalAmount: priced.total,
            // The cashier collects the patient's share at /pay, so a pending
            // request is unpaid.
            paidAmount: paymentStatus === 'paid' ? insurance.copayAmount : 0,
            insuranceProviderId: insurance.insuranceProviderId,
            insuranceProviderName: insurance.insuranceProviderName,
            // Kept only when an insurer is actually on the request.
            policyNumber: insurance.insuranceProviderId ? (policyNumber || null) : null,
            insuranceCoverage: insurance.insuranceCoverage,
            // NULL = walk-in/full self-pay, so it is never confused with an
            // insurer covering 100%.
            copayAmount: insurance.insuranceProviderId ? insurance.copayAmount : null,
            paymentMethod: normalizePaymentMethod(paymentMethod),
            paymentReference,
            paymentStatus: paymentStatus || 'pending',
            status: 'pending',
            notes,
            requestedBy: req.user.userId,
            requestedByName: user.name,
            receiptNumber,
            receiptPrintedAt: new Date()
        }, { transaction: t });

        const labTests = [];
        for (const testData of priced.lines) {
            const test = await LabTest.create({
                testNumber: await nextReference('LAB', { transaction: t }),
                labTransactionId: transaction.id,
                testType: testData.testType,
                testCategory: testData.testCategory || 'General',
                // testPrice is the UNIT price; quantity is stored alongside it.
                testPrice: testData.testPrice,
                quantity: testData.quantity,
                priority: testData.priority || 'normal',
                sampleType: testData.sampleType || null,
                status: 'pending',
                notes: testData.notes || null
            }, { transaction: t });
            labTests.push(test);
        }

        await t.commit();

        const result = await LabTransaction.findByPk(transaction.id, {
            include: [
                { model: LabTest, as: 'labTests' },
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'fullName', 'phone', 'email'],
                },
            ]
        });

        res.status(201).json({
            ...result.toJSON(),
            totalAmount: parseFloat(result.totalAmount) || 0,
            paidAmount: parseFloat(result.paidAmount) || 0,
        });

    } catch (err) {
        await t.rollback();
        if (isClientError(err)) {
            return res.status(err.status || 400).json({ msg: clientMessage(err) });
        }
        console.error('Create lab transaction error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Update lab transaction
router.put('/:id', auth, async (req, res) => {
    try {
        const transaction = await LabTransaction.findByPk(req.params.id);
        if (!transaction) {
            return res.status(404).json({ msg: 'Lab transaction not found' });
        }

        // Only workflow/patient columns — money columns (paidAmount,
        // paymentStatus, paymentMethod) belong to the /pay route.
        const updates = pick(req.body, LAB_TRANSACTION_FIELDS);

        if (updates.status === 'completed' && !transaction.completedAt) {
            updates.completedAt = new Date();
        }

        if (updates.status === 'cancelled') {
            updates.cancelledAt = new Date();
            updates.cancelledBy = req.user.userId;
        }

        await transaction.update(updates);

        const updated = await LabTransaction.findByPk(transaction.id, {
            include: [
                { model: LabTest, as: 'labTests' },
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'fullName', 'phone', 'email'],
                },
            ]
        });

        res.json(updated);
    } catch (err) {
        console.error('Update lab transaction error:', err);
        res.status(400).json({ msg: 'Invalid data', error: err.message });
    }
});

// Update individual lab test
router.put('/tests/:testId', auth, async (req, res) => {
    try {
        const test = await LabTest.findByPk(req.params.testId);
        if (!test) {
            return res.status(404).json({ msg: 'Lab test not found' });
        }

        const user = await User.findByPk(req.user.userId);
        const allowedFields = labTestFieldsFor(user.role);
        if (!allowedFields.length) {
            return res.status(403).json({ msg: 'Lab staff only' });
        }
        const updates = pick(req.body, allowedFields);

        if (updates.status === 'completed') {
            updates.completedAt = new Date();
            updates.performedBy = req.user.userId;
            updates.performedByName = user.name;
            updates.resultDate = new Date();
        }

        await test.update(updates);

        const updated = await LabTest.findByPk(test.id, {
            include: [{ model: LabTransaction, as: 'transaction' }]
        });

        res.json(updated);
    } catch (err) {
        console.error('Update lab test error:', err);
        res.status(400).json({ msg: 'Invalid data', error: err.message });
    }
});

// Add results to lab test
router.post('/tests/:testId/results', auth, async (req, res) => {
    try {
        const test = await LabTest.findByPk(req.params.testId);
        if (!test) {
            return res.status(404).json({ msg: 'Lab test not found' });
        }

        const { results, resultSummary, resultInterpretation, referenceRanges } = req.body;

        const updates = {
            results: results || {},
            resultSummary: resultSummary || '',
            resultInterpretation: resultInterpretation || '',
            referenceRanges: referenceRanges || {},
            status: 'completed',
            completedAt: new Date(),
            resultDate: new Date(),
            performedBy: req.user.userId
        };

        const user = await User.findByPk(req.user.userId);
        if (user) updates.performedByName = user.name;

        await test.update(updates);

        const transaction = await LabTransaction.findByPk(test.labTransactionId, {
            include: [{ model: LabTest, as: 'labTests' }]
        });

        if (transaction) {
            const allCompleted = transaction.labTests.every(t => t.status === 'completed');
            if (allCompleted) {
                await transaction.update({ status: 'completed', completedAt: new Date() });
            }
        }

        const updated = await LabTest.findByPk(test.id, {
            include: [{ model: LabTransaction, as: 'transaction' }]
        });

        res.json(updated);
    } catch (err) {
        console.error('Add results error:', err);
        res.status(400).json({ msg: 'Invalid data', error: err.message });
    }
});

// Get statistics
router.get('/stats/summary', auth, async (req, res) => {
    try {
        const { startDate, endDate, status, paymentStatus } = req.query;

        // Every tile on the lab screen sits under the same date + status controls
        // as the list, so the counts have to answer to them too.
        const scopedWhere = {};
        if (status) scopedWhere.status = status;
        if (paymentStatus) scopedWhere.paymentStatus = paymentStatus;
        if (startDate && endDate) {
            scopedWhere.createdAt = createdAtRange(startDate, endDate);
        }
        const scope = Object.keys(scopedWhere).length ? { where: scopedWhere } : {};

        const countWhere = (extra) => ({
            where: { ...(scopedWhere || {}), ...extra },
        });

        const [total, pending, inProgress, completed, cancelled, paid] = await Promise.all([
            LabTransaction.count(scope),
            LabTransaction.count(countWhere({ status: 'pending' })),
            LabTransaction.count(countWhere({ status: 'in_progress' })),
            LabTransaction.count(countWhere({ status: 'completed' })),
            LabTransaction.count(countWhere({ status: 'cancelled' })),
            // 'paid' is paymentStatus, not workflow status: paying moves a request
            // to 'in_progress', so counting 'completed' here would always show 0.
            LabTransaction.count(countWhere({ paymentStatus: 'paid' })),
        ]);

        const scopedTransactionIds = startDate || endDate || status || paymentStatus
            ? (await LabTransaction.findAll({
                where: scopedWhere,
                attributes: ['id'],
                raw: true,
            })).map((r) => r.id)
            : null;

        const testScope = scopedTransactionIds
            ? { where: { labTransactionId: { [Op.in]: scopedTransactionIds } } }
            : {};
        const testCountWhere = (extra) => (scopedTransactionIds
            ? { where: { labTransactionId: { [Op.in]: scopedTransactionIds }, ...extra } }
            : { where: extra });

        const [totalTests, completedTests, pendingTests] = await Promise.all([
            LabTest.count(testScope),
            LabTest.count(testCountWhere({ status: 'completed' })),
            LabTest.count(testCountWhere({ status: 'pending' })),
        ]);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayTransactions = await LabTransaction.findAll({
            where: {
                createdAt: { [Op.gte]: today, [Op.lt]: tomorrow },
                status: 'completed'
            }
        });

        const todayRevenue = todayTransactions.reduce((sum, t) => sum + parseFloat(t.totalAmount), 0);

        res.json({
            total, pending, inProgress, completed, cancelled, paid,
            totalTests, completedTests, pendingTests,
            today: { count: todayTransactions.length, revenue: todayRevenue }
        });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Reprint receipt
router.post('/:id/reprint', auth, async (req, res) => {
    try {
        const transaction = await LabTransaction.findByPk(req.params.id, {
            include: [{ model: LabTest, as: 'labTests' }]
        });

        if (!transaction) {
            return res.status(404).json({ msg: 'Lab transaction not found' });
        }

        await transaction.update({ receiptPrintedAt: new Date() });

        const company = await Company.getCompany();

        res.json({
            transaction: {
                ...transaction.toJSON(),
                totalAmount: parseFloat(transaction.totalAmount) || 0,
                paidAmount: parseFloat(transaction.paidAmount) || 0,
            },
            company
        });
    } catch (err) {
        console.error('Reprint receipt error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// PAY a lab transaction (Cashier collects payment)
router.post('/:id/pay', auth, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { paymentMethod, paymentReference } = req.body;
        // Locked row: two cashiers paying one lab bill used to both succeed.
        const transaction = await LabTransaction.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });

        if (!transaction) {
            await t.rollback();
            return res.status(404).json({ msg: 'Lab transaction not found' });
        }
        if (transaction.paymentStatus === 'paid') {
            await t.rollback();
            return res.status(400).json({ msg: 'Lab transaction is already paid' });
        }
        if (transaction.status === 'cancelled') {
            await t.rollback();
            return res.status(400).json({ msg: 'Cannot pay a cancelled lab transaction' });
        }

        const cashier = await User.findByPk(req.user.userId, { transaction: t });

        // An insured request bills the patient their copay, not the full bill;
        // copayAmount is NULL when no insurer is on the request.
        const amountDue = transaction.copayAmount == null
            ? parseFloat(transaction.totalAmount) || 0
            : parseFloat(transaction.copayAmount) || 0;

        await transaction.update({
            paymentStatus: 'paid',
            paidAt: new Date(),
            paidAmount: amountDue,
            paymentMethod: normalizePaymentMethod(paymentMethod) || 'cash',
            paymentReference: paymentReference || null,
            cashierId: req.user.userId,
            cashierName: cashier ? cashier.name : 'Cashier',
            // Advance workflow from 'pending' → 'in_progress'; leave other statuses alone
            status: transaction.status === 'pending' ? 'in_progress' : transaction.status,
        }, { transaction: t });

        await t.commit();

        const updated = await LabTransaction.findByPk(transaction.id, {
            include: [
                { model: LabTest, as: 'labTests' },
                { model: Customer, as: 'customer', attributes: ['id', 'fullName', 'phone', 'email'] },
            ],
        });

        res.json({
            success: true,
            transaction: {
                ...updated.toJSON(),
                totalAmount: parseFloat(updated.totalAmount) || 0,
                paidAmount: parseFloat(updated.paidAmount) || 0,
            },
        });
    } catch (err) {
        await t.rollback();
        console.error('Pay lab transaction error:', err);
        res.status(500).json({ msg: err.message || 'Server error' });
    }
});

// CANCEL a lab transaction (only if not yet paid)
router.post('/:id/cancel', auth, async (req, res) => {
    try {
        const transaction = await LabTransaction.findByPk(req.params.id);
        if (!transaction) {
            return res.status(404).json({ msg: 'Lab transaction not found' });
        }
        if (transaction.paymentStatus === 'paid') {
            return res.status(400).json({ msg: 'Cannot cancel a paid lab transaction' });
        }
        if (transaction.status === 'cancelled') {
            return res.status(400).json({ msg: 'Lab transaction is already cancelled' });
        }

        await transaction.update({
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledBy: req.user.userId,
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Cancel lab transaction error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});



module.exports = router;