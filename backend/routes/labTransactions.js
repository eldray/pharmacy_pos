const express = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const LabTransaction = require('../models/LabTransaction');
const LabTest = require('../models/LabTest');
const User = require('../models/User');
const Company = require('../models/Company');
const { auth, adminAuth, labAuth } = require('../middleware/auth');

const router = express.Router();

// Get all lab transactions
router.get('/', auth, async (req, res) => {
    try {
        const { status, paymentStatus, startDate, endDate, patientName } = req.query;
        const where = {};

        if (status) where.status = status;
        if (paymentStatus) where.paymentStatus = paymentStatus;
        if (patientName) where.patientName = { [Op.iLike]: `%${patientName}%` };

        if (startDate && endDate) {
            where.createdAt = {
                [Op.gte]: new Date(startDate),
                [Op.lte]: new Date(endDate)
            };
        }

        const transactions = await LabTransaction.findAll({
            where,
            include: [
                {
                    model: LabTest,
                    as: 'labTests'
                },
                {
                    model: User,
                    as: 'requester',
                    attributes: ['id', 'name', 'email']
                }
            ],
            order: [['createdAt', 'DESC']]
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
                { model: User, as: 'requester', attributes: ['id', 'name', 'email'] }
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
            patientName,
            patientPhone,
            patientEmail,
            patientAge,
            patientGender,
            totalAmount,
            paidAmount,
            paymentMethod,
            paymentReference,
            paymentStatus,
            notes,
            tests
        } = req.body;

        if (!patientName) {
            await t.rollback();
            return res.status(400).json({ msg: 'Patient name is required' });
        }

        if (!tests || tests.length === 0) {
            await t.rollback();
            return res.status(400).json({ msg: 'At least one test is required' });
        }

        // Generate transaction number
        const transactionNumber = `LAB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const receiptNumber = `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Create lab transaction
        const transaction = await LabTransaction.create({
            transactionNumber,
            patientName,
            patientPhone,
            patientEmail,
            patientAge: patientAge ? parseInt(patientAge) : null,
            patientGender,
            totalAmount: parseFloat(totalAmount) || 0,
            paidAmount: parseFloat(paidAmount) || 0,
            paymentMethod,
            paymentReference,
            paymentStatus: paymentStatus || 'paid',
            status: 'pending',
            notes,
            requestedBy: req.user.userId,
            requestedByName: user.name,
            receiptNumber,
            receiptPrintedAt: new Date()
        }, { transaction: t });

        // Create lab tests
        const labTests = [];
        for (const testData of tests) {
            const testNumber = `TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const test = await LabTest.create({
                testNumber,
                labTransactionId: transaction.id,
                testType: testData.testType,
                testCategory: testData.testCategory || 'General',
                testPrice: parseFloat(testData.testPrice) || 0,
                priority: testData.priority || 'normal',
                sampleType: testData.sampleType || null,
                status: 'pending',
                notes: testData.notes || null
            }, { transaction: t });
            labTests.push(test);
        }

        await t.commit();

        const result = await LabTransaction.findByPk(transaction.id, {
            include: [{ model: LabTest, as: 'labTests' }]
        });

        res.status(201).json({
            ...result.toJSON(),
            totalAmount: parseFloat(result.totalAmount) || 0,
            paidAmount: parseFloat(result.paidAmount) || 0,
        });

    } catch (err) {
        await t.rollback();
        console.error('Create lab transaction error:', err);
        res.status(400).json({ msg: 'Invalid data', error: err.message });
    }
});

// Update lab transaction
router.put('/:id', auth, async (req, res) => {
    try {
        const transaction = await LabTransaction.findByPk(req.params.id);
        if (!transaction) {
            return res.status(404).json({ msg: 'Lab transaction not found' });
        }

        const updates = { ...req.body };

        if (updates.status === 'completed' && !transaction.completedAt) {
            updates.completedAt = new Date();
        }

        if (updates.status === 'cancelled') {
            updates.cancelledAt = new Date();
            updates.cancelledBy = req.user.userId;
        }

        await transaction.update(updates);

        const updated = await LabTransaction.findByPk(transaction.id, {
            include: [{ model: LabTest, as: 'labTests' }]
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

        const updates = { ...req.body };

        if (updates.status === 'completed') {
            updates.completedAt = new Date();
            updates.performedBy = req.user.userId;
            const user = await User.findByPk(req.user.userId);
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
        if (user) {
            updates.performedByName = user.name;
        }

        await test.update(updates);

        // Check if all tests in the transaction are completed
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
        const [total, pending, inProgress, completed, cancelled] = await Promise.all([
            LabTransaction.count(),
            LabTransaction.count({ where: { status: 'pending' } }),
            LabTransaction.count({ where: { status: 'in_progress' } }),
            LabTransaction.count({ where: { status: 'completed' } }),
            LabTransaction.count({ where: { status: 'cancelled' } })
        ]);

        const [totalTests, completedTests, pendingTests] = await Promise.all([
            LabTest.count(),
            LabTest.count({ where: { status: 'completed' } }),
            LabTest.count({ where: { status: 'pending' } })
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
            total,
            pending,
            inProgress,
            completed,
            cancelled,
            totalTests,
            completedTests,
            pendingTests,
            today: {
                count: todayTransactions.length,
                revenue: todayRevenue
            }
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

module.exports = router;