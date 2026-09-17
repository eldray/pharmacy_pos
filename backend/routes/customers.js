// backend/routes/customers.js
const express = require('express');
const { Op } = require('sequelize');
const { Customer, CustomerInsurance, InsuranceProvider, SalesOrder, LabTransaction } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// ─── Helper: always include insurances + provider ─────────────────
const CUSTOMER_INCLUDE = [
    {
        model: CustomerInsurance,
        as: 'insurances',
        include: [{ model: InsuranceProvider, as: 'provider' }],
    },
];

// ─── GET /customers — list (paginated) ────────────────────────────
router.get('/', auth, async (req, res) => {
    try {
        const { q = '' } = req.query;
        const where = {};
        if (q.trim()) {
            where[Op.or] = [
                { fullName: { [Op.iLike]: `%${q}%` } },
                { phone: { [Op.iLike]: `%${q}%` } },
                { email: { [Op.iLike]: `%${q}%` } },
            ];
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 100));

        const { count, rows } = await Customer.findAndCountAll({
            where,
            include: CUSTOMER_INCLUDE,
            order: [['createdAt', 'DESC']],
            limit,
            offset: (page - 1) * limit,
            distinct: true,
        });

        res.json({
            data: rows,
            pagination: { total: count, page, limit, pages: Math.ceil(count / limit) },
        });
    } catch (err) {
        console.error('List customers error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ─── GET /customers/search?q= — search by name OR phone ───────────
router.get('/search', auth, async (req, res) => {
    try {
        const { q = '' } = req.query;
        if (!q.trim()) return res.json([]);

        const customers = await Customer.findAll({
            where: {
                [Op.or]: [
                    { fullName: { [Op.iLike]: `%${q}%` } },
                    { phone: { [Op.iLike]: `%${q}%` } },
                ],
            },
            include: CUSTOMER_INCLUDE,
            order: [['fullName', 'ASC']],
            limit: 20,
        });
        res.json(customers);
    } catch (err) {
        console.error('Search customers error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ─── GET /customers/:id — detail + history ────────────────────────
router.get('/:id', auth, async (req, res) => {
    try {
        const customer = await Customer.findByPk(req.params.id, {
            include: [
                ...CUSTOMER_INCLUDE,
                { model: SalesOrder, as: 'salesOrders', limit: 20, order: [['createdAt', 'DESC']] },
                { model: LabTransaction, as: 'labTransactions', limit: 20, order: [['createdAt', 'DESC']] },
            ],
        });
        if (!customer) return res.status(404).json({ msg: 'Customer not found' });
        res.json(customer);
    } catch (err) {
        console.error('Get customer error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ─── POST /customers — create ─────────────────────────────────────
router.post('/', auth, async (req, res) => {
    try {
        const { fullName, phone, email, dob, gender, address, notes, insurances } = req.body;

        if (!fullName || !phone) {
            return res.status(400).json({ msg: 'fullName and phone are required' });
        }

        // Prevent duplicate phone
        const existing = await Customer.findOne({ where: { phone } });
        if (existing) {
            return res.status(409).json({ msg: 'A customer with this phone already exists', customer: existing });
        }

        const customer = await Customer.create({
            fullName, phone, email, dob, gender, address, notes,
        });

        // Attach insurances if provided
        if (Array.isArray(insurances) && insurances.length > 0) {
            await CustomerInsurance.bulkCreate(
                insurances.map((ins, i) => ({
                    customerId: customer.id,
                    insuranceProviderId: ins.insuranceProviderId,
                    policyNumber: ins.policyNumber,
                    isPrimary: ins.isPrimary ?? i === 0,
                    status: ins.status || 'active',
                    notes: ins.notes || null,
                }))
            );
        }

        const full = await Customer.findByPk(customer.id, { include: CUSTOMER_INCLUDE });
        res.status(201).json(full);
    } catch (err) {
        console.error('Create customer error:', err);
        res.status(400).json({ msg: 'Invalid data', error: err.message });
    }
});

// ─── PUT /customers/:id — update ──────────────────────────────────
router.put('/:id', auth, async (req, res) => {
    try {
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ msg: 'Customer not found' });

        const { fullName, phone, email, dob, gender, address, notes, status } = req.body;

        // If phone is changing, ensure unique
        if (phone && phone !== customer.phone) {
            const clash = await Customer.findOne({ where: { phone } });
            if (clash) return res.status(409).json({ msg: 'Another customer already has this phone' });
        }

        await customer.update({
            fullName: fullName ?? customer.fullName,
            phone: phone ?? customer.phone,
            email: email ?? customer.email,
            dob: dob ?? customer.dob,
            gender: gender ?? customer.gender,
            address: address ?? customer.address,
            notes: notes ?? customer.notes,
            status: status ?? customer.status,
        });

        const full = await Customer.findByPk(customer.id, { include: CUSTOMER_INCLUDE });
        res.json(full);
    } catch (err) {
        console.error('Update customer error:', err);
        res.status(400).json({ msg: 'Invalid data', error: err.message });
    }
});

// ─── DELETE /customers/:id — soft-ish (mark inactive) ─────────────
router.delete('/:id', auth, async (req, res) => {
    try {
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ msg: 'Customer not found' });

        // Prefer to keep history — mark inactive instead of hard delete
        await customer.update({ status: 'inactive' });
        res.json({ msg: 'Customer deactivated' });
    } catch (err) {
        console.error('Delete customer error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// INSURANCE SUB-ROUTES — manage customer's insurances
// ═══════════════════════════════════════════════════════════════════

// ─── GET /customers/:id/insurances ────────────────────────────────
router.get('/:id/insurances', auth, async (req, res) => {
    try {
        const list = await CustomerInsurance.findAll({
            where: { customerId: req.params.id },
            include: [{ model: InsuranceProvider, as: 'provider' }],
            order: [['isPrimary', 'DESC'], ['createdAt', 'ASC']],
        });
        res.json(list);
    } catch (err) {
        console.error('List insurances error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// ─── POST /customers/:id/insurances — attach new policy ───────────
router.post('/:id/insurances', auth, async (req, res) => {
    try {
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ msg: 'Customer not found' });

        const { insuranceProviderId, policyNumber, isPrimary, status, notes } = req.body;
        if (!insuranceProviderId || !policyNumber) {
            return res.status(400).json({ msg: 'insuranceProviderId and policyNumber are required' });
        }

        // If isPrimary, unset other primaries for this customer
        if (isPrimary) {
            await CustomerInsurance.update(
                { isPrimary: false },
                { where: { customerId: customer.id } }
            );
        }

        const insurance = await CustomerInsurance.create({
            customerId: customer.id,
            insuranceProviderId,
            policyNumber,
            isPrimary: isPrimary ?? false,
            status: status || 'active',
            notes: notes || null,
        });

        const full = await CustomerInsurance.findByPk(insurance.id, {
            include: [{ model: InsuranceProvider, as: 'provider' }],
        });
        res.status(201).json(full);
    } catch (err) {
        console.error('Attach insurance error:', err);
        res.status(400).json({ msg: 'Invalid data', error: err.message });
    }
});

// ─── PUT /customers/:id/insurances/:insId — update a policy ───────
router.put('/:id/insurances/:insId', auth, async (req, res) => {
    try {
        const insurance = await CustomerInsurance.findOne({
            where: { id: req.params.insId, customerId: req.params.id },
        });
        if (!insurance) return res.status(404).json({ msg: 'Insurance not found for this customer' });

        const { insuranceProviderId, policyNumber, isPrimary, status, notes } = req.body;

        // If setting primary, unset all others
        if (isPrimary === true) {
            await CustomerInsurance.update(
                { isPrimary: false },
                { where: { customerId: req.params.id } }
            );
        }

        await insurance.update({
            insuranceProviderId: insuranceProviderId ?? insurance.insuranceProviderId,
            policyNumber: policyNumber ?? insurance.policyNumber,
            isPrimary: isPrimary ?? insurance.isPrimary,
            status: status ?? insurance.status,
            notes: notes ?? insurance.notes,
        });

        const full = await CustomerInsurance.findByPk(insurance.id, {
            include: [{ model: InsuranceProvider, as: 'provider' }],
        });
        res.json(full);
    } catch (err) {
        console.error('Update insurance error:', err);
        res.status(400).json({ msg: 'Invalid data', error: err.message });
    }
});

// ─── DELETE /customers/:id/insurances/:insId ──────────────────────
router.delete('/:id/insurances/:insId', auth, async (req, res) => {
    try {
        const insurance = await CustomerInsurance.findOne({
            where: { id: req.params.insId, customerId: req.params.id },
        });
        if (!insurance) return res.status(404).json({ msg: 'Insurance not found' });

        await insurance.destroy();
        res.json({ msg: 'Insurance removed' });
    } catch (err) {
        console.error('Delete insurance error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;