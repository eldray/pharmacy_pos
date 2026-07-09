const express = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const LabTest = require('../models/LabTest');
const LabTestTemplate = require('../models/LabTestTemplate');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { auth, adminAuth, labAuth } = require('../middleware/auth');

const router = express.Router();

// ==================== TEST TEMPLATES ====================

// Get all test templates - accessible by lab and admin
router.get('/templates', auth, async (req, res) => {
    try {
        const templates = await LabTestTemplate.findAll({
            where: { isActive: true },
            order: [['category', 'ASC'], ['name', 'ASC']]
        });
        res.json(templates);
    } catch (err) {
        console.error('Get templates error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Create test template - admin only
router.post('/templates', auth, adminAuth, async (req, res) => {
    try {
        const template = await LabTestTemplate.create(req.body);
        res.status(201).json(template);
    } catch (err) {
        console.error('Create template error:', err);
        res.status(400).json({ msg: 'Invalid data', error: err.message });
    }
});

// Update test template - admin only
router.put('/templates/:id', auth, adminAuth, async (req, res) => {
    try {
        const template = await LabTestTemplate.findByPk(req.params.id);
        if (!template) return res.status(404).json({ msg: 'Template not found' });
        await template.update(req.body);
        res.json(template);
    } catch (err) {
        res.status(400).json({ msg: 'Invalid data', error: err.message });
    }
});

// Delete test template - admin only
router.delete('/templates/:id', auth, adminAuth, async (req, res) => {
    try {
        const template = await LabTestTemplate.findByPk(req.params.id);
        if (!template) return res.status(404).json({ msg: 'Template not found' });
        await template.destroy();
        res.json({ msg: 'Template deleted' });
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
});

// ==================== LAB TESTS ====================

// Get all lab tests - accessible by lab, admin, pharmacist
router.get('/', auth, async (req, res) => {
    try {
        const { status, startDate, endDate, patientName, testType } = req.query;
        const where = {};

        if (status) where.status = status;
        if (testType) where.testType = { [Op.iLike]: `%${testType}%` };
        if (patientName) where.patientName = { [Op.iLike]: `%${patientName}%` };

        if (startDate && endDate) {
            where.createdAt = {
                [Op.gte]: new Date(startDate),
                [Op.lte]: new Date(endDate)
            };
        }

        const tests = await LabTest.findAll({
            where,
            include: [
                { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'performer', attributes: ['id', 'name', 'email'] },
                { model: Transaction, as: 'transaction', attributes: ['id', 'transactionNumber'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        const normalized = tests.map(t => ({
            ...t.toJSON(),
            testPrice: parseFloat(t.testPrice) || 0
        }));

        res.json(normalized);
    } catch (err) {
        console.error('Get lab tests error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Get lab test by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const test = await LabTest.findByPk(req.params.id, {
            include: [
                { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'performer', attributes: ['id', 'name', 'email'] },
                { model: Transaction, as: 'transaction', attributes: ['id', 'transactionNumber'] }
            ]
        });
        if (!test) return res.status(404).json({ msg: 'Lab test not found' });

        const normalized = {
            ...test.toJSON(),
            testPrice: parseFloat(test.testPrice) || 0
        };

        res.json(normalized);
    } catch (err) {
        console.error('Get lab test error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Create lab test request - accessible by cashier, admin, pharmacist
// backend/routes/labTests.js - Update the POST route
router.post('/', auth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.userId);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const testNumber = `LAB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Clean and prepare the data
        const testData = {
            testNumber,
            requestedBy: req.user.userId,
            requestedByName: user.name,
            status: 'pending',
            // Only include fields that are provided
            ...(req.body.patientName && { patientName: req.body.patientName }),
            ...(req.body.patientPhone && { patientPhone: req.body.patientPhone }),
            ...(req.body.patientEmail && { patientEmail: req.body.patientEmail }),
            ...(req.body.patientAge && { patientAge: parseInt(req.body.patientAge) }),
            ...(req.body.patientGender && { patientGender: req.body.patientGender }),
            ...(req.body.testType && { testType: req.body.testType }),
            ...(req.body.testCategory && { testCategory: req.body.testCategory }),
            ...(req.body.testPrice && { testPrice: parseFloat(req.body.testPrice) }),
            ...(req.body.priority && { priority: req.body.priority }),
            ...(req.body.notes && { notes: req.body.notes }),
            ...(req.body.sampleType && { sampleType: req.body.sampleType }),
            ...(req.body.quantity && { quantity: parseInt(req.body.quantity) }),
            ...(req.body.transactionId && { transactionId: parseInt(req.body.transactionId) }),
        };

        // Ensure required fields
        if (!testData.patientName) {
            return res.status(400).json({ msg: 'Patient name is required' });
        }
        if (!testData.testType) {
            return res.status(400).json({ msg: 'Test type is required' });
        }

        const test = await LabTest.create(testData);
        res.status(201).json(test);
    } catch (err) {
        console.error('Create lab test error:', err);
        res.status(400).json({ msg: 'Invalid data', error: err.message });
    }
});

// Update lab test - lab can update results, admin can update anything
router.put('/:id', auth, async (req, res) => {
    try {
        const test = await LabTest.findByPk(req.params.id);
        if (!test) return res.status(404).json({ msg: 'Lab test not found' });

        const user = await User.findByPk(req.user.userId);
        const updates = { ...req.body };

        // Lab users can only update results, status, and notes
        if (user.role === 'lab') {
            const allowedFields = ['status', 'results', 'resultSummary', 'resultInterpretation', 'notes', 'sampleReceivedAt'];
            Object.keys(updates).forEach(key => {
                if (!allowedFields.includes(key)) {
                    delete updates[key];
                }
            });
        }

        // Handle status transitions
        if (updates.status === 'completed' && !test.completedAt) {
            updates.completedAt = new Date();
            updates.performedBy = req.user.userId;
            updates.performedByName = user.name;
            updates.resultDate = new Date();
        }

        if (updates.status === 'cancelled') {
            updates.cancelledAt = new Date();
            updates.cancelledBy = req.user.userId;
            if (!updates.cancellationReason) {
                updates.cancellationReason = 'Cancelled by lab technician';
            }
        }

        if (updates.testPrice !== undefined) {
            updates.testPrice = parseFloat(updates.testPrice) || 0;
        }

        await test.update(updates);

        const updated = await LabTest.findByPk(test.id, {
            include: [
                { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'performer', attributes: ['id', 'name', 'email'] }
            ]
        });

        res.json(updated);
    } catch (err) {
        console.error('Update lab test error:', err);
        res.status(400).json({ msg: 'Invalid data', error: err.message });
    }
});

// Add results to lab test - lab only
router.post('/:id/results', auth, labAuth, async (req, res) => {
    try {
        const test = await LabTest.findByPk(req.params.id);
        if (!test) return res.status(404).json({ msg: 'Lab test not found' });

        const user = await User.findByPk(req.user.userId);
        const { results, resultSummary, resultInterpretation } = req.body;

        const updates = {
            results: results || {},
            resultSummary: resultSummary || '',
            resultInterpretation: resultInterpretation || '',
            status: 'completed',
            completedAt: new Date(),
            resultDate: new Date(),
            performedBy: req.user.userId,
            performedByName: user.name
        };

        await test.update(updates);

        const updated = await LabTest.findByPk(test.id, {
            include: [
                { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'performer', attributes: ['id', 'name', 'email'] }
            ]
        });

        res.json(updated);
    } catch (err) {
        console.error('Add results error:', err);
        res.status(400).json({ msg: 'Invalid data', error: err.message });
    }
});

// Get lab test statistics
router.get('/stats/summary', auth, async (req, res) => {
    try {
        const [total, pending, inProgress, completed, cancelled] = await Promise.all([
            LabTest.count(),
            LabTest.count({ where: { status: 'pending' } }),
            LabTest.count({ where: { status: 'in_progress' } }),
            LabTest.count({ where: { status: 'completed' } }),
            LabTest.count({ where: { status: 'cancelled' } })
        ]);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayTests = await LabTest.findAll({
            where: {
                createdAt: { [Op.gte]: today, [Op.lt]: tomorrow }
            }
        });

        const todayRevenue = todayTests.reduce((sum, t) => sum + parseFloat(t.testPrice), 0);

        res.json({
            total,
            pending,
            inProgress,
            completed,
            cancelled,
            today: {
                count: todayTests.length,
                revenue: todayRevenue
            }
        });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;