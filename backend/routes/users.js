// backend/routes/users.js
const express = require('express');
const User = require('../models/User');
const { auth, adminAuth, adminOrManagerAuth } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');
const { validatePassword, validateEmail } = require('../utils/validators');
const { StaffProfile, Branch } = require('../models');

const router = express.Router();

// Never let passwords reach the audit log.
const safeUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role, status: u.status,
});

const STAFF_INCLUDE = {
  model: StaffProfile,
  as: 'staffProfile',
  required: false,
  include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }],
};

// ─── List users (admin + manager) ────────────────────────────────
router.get('/', auth, adminOrManagerAuth, async (req, res) => {
  try {
    const { role, status } = req.query;
    const where = {};
    if (role && role !== 'all') where.role = role;
    if (status && status !== 'all') where.status = status;

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      include: [STAFF_INCLUDE],
      order: [['createdAt', 'DESC']],
    });
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── Get current user profile ────────────────────────────────────
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ['password'] },
      include: [STAFF_INCLUDE],
    });
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── Create user (admin) — optionally creates staff profile ──────
router.post('/', auth, adminAuth, async (req, res) => {
  try {
    const { name, email, password, role, staffProfile } = req.body;

    const emailErr = validateEmail(email);
    if (emailErr) return res.status(400).json({ msg: emailErr });
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ msg: pwErr });

    const VALID_ROLES = ['admin', 'manager', 'pharmacist_sales', 'cashier', 'lab_tech'];
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ msg: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ msg: 'User with this email already exists' });

    const user = await User.create({ name, email, password, role });

    // Optionally create staff profile in the same request
    if (staffProfile && staffProfile.employeeId && staffProfile.designation) {
      try {
        await StaffProfile.create({
          userId: user.id,
          branchId: staffProfile.branchId || null,
          employeeId: staffProfile.employeeId,
          department: staffProfile.department || 'Pharmacy',
          designation: staffProfile.designation,
          phoneNumber: staffProfile.phoneNumber || null,
          address: staffProfile.address || null,
          dob: staffProfile.dob || null,
          gender: staffProfile.gender || null,
          hireDate: staffProfile.hireDate || new Date().toISOString().split('T')[0],
          employmentType: staffProfile.employmentType || 'full_time',
          salary: staffProfile.salary || 0,
          emergencyContactName: staffProfile.emergencyContactName || null,
          emergencyContactPhone: staffProfile.emergencyContactPhone || null,
          status: 'active',
        });
      } catch (profileErr) {
        console.error('Staff profile creation failed:', profileErr);
        // Don't fail the whole request — user was created successfully
        await recordAudit(req, {
          action: 'create', entity: 'User', entityId: user.id,
          changes: { after: safeUser(user), profileError: profileErr.message },
        });
        const result = await User.findByPk(user.id, {
          attributes: { exclude: ['password'] },
          include: [STAFF_INCLUDE],
        });
        return res.status(201).json({
          ...result.toJSON(),
          warning: 'User created but staff profile failed: ' + profileErr.message,
        });
      }
    }

    await recordAudit(req, {
      action: 'create', entity: 'User', entityId: user.id,
      changes: { after: safeUser(user), withProfile: !!staffProfile },
    });

    const result = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [STAFF_INCLUDE],
    });
    res.status(201).json(result);
  } catch (err) {
    console.error('Create user error:', err);
    res.status(400).json({ msg: 'Invalid data', error: err.message });
  }
});

// ─── Update user (admin) ─────────────────────────────────────────
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (req.body.email !== undefined && req.body.email !== user.email) {
      const emailErr = validateEmail(req.body.email);
      if (emailErr) return res.status(400).json({ msg: emailErr });
      const clash = await User.findOne({ where: { email: req.body.email } });
      if (clash) return res.status(400).json({ msg: 'Another user has this email' });
    }
    if (req.body.password) {
      const pwErr = validatePassword(req.body.password);
      if (pwErr) return res.status(400).json({ msg: pwErr });
    }
    if (req.body.role) {
      const VALID_ROLES = ['admin', 'manager', 'pharmacist_sales', 'cashier', 'lab_tech'];
      if (!VALID_ROLES.includes(req.body.role)) {
        return res.status(400).json({ msg: 'Invalid role' });
      }
    }

    const before = safeUser(user);
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.email !== undefined) updates.email = req.body.email;
    if (req.body.role !== undefined) updates.role = req.body.role;
    if (req.body.password) updates.password = req.body.password;

    await user.update(updates);

    await recordAudit(req, {
      action: 'update', entity: 'User', entityId: user.id,
      changes: {
        before, after: safeUser(user),
        passwordChanged: user.changed('password') || undefined,
      },
    });

    const result = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [STAFF_INCLUDE],
    });
    res.json(result);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(400).json({ msg: 'Invalid data', error: err.message });
  }
});

// ─── Block / unblock user (admin) — soft delete alternative ──────
router.patch('/:id/status', auth, adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'blocked'].includes(status)) {
      return res.status(400).json({ msg: 'Status must be "active" or "blocked"' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (user.id === req.user.userId) {
      return res.status(400).json({ msg: 'Cannot change your own status' });
    }

    await user.update({ status });

    await recordAudit(req, {
      action: status === 'blocked' ? 'block' : 'unblock',
      entity: 'User',
      entityId: user.id,
      changes: { name: user.name, email: user.email, status },
    });

    res.json({ success: true, user: safeUser(user) });
  } catch (err) {
    console.error('Block/unblock user error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── Delete user (admin) — hard delete ───────────────────────────
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (user.id === req.user.userId) {
      return res.status(400).json({ msg: 'Cannot delete your own account' });
    }

    const deleted = safeUser(user);

    // Remove staff profile first (cascade would handle this, but being explicit)
    await StaffProfile.destroy({ where: { userId: user.id } });
    await user.destroy();

    await recordAudit(req, {
      action: 'delete', entity: 'User', entityId: deleted.id,
      changes: { deleted },
    });

    res.json({ msg: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── Update own profile ──────────────────────────────────────────
router.patch('/profile', auth, async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ msg: 'Current password required to change password' });
      }
      const valid = await user.comparePassword(currentPassword);
      if (!valid) return res.status(400).json({ msg: 'Current password is incorrect' });

      const pwErr = validatePassword(newPassword);
      if (pwErr) return res.status(400).json({ msg: pwErr });
    }

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (newPassword) updates.password = newPassword;

    await user.update(updates);
    const result = await User.findByPk(user.id, { attributes: { exclude: ['password'] } });
    res.json(result);
  } catch (err) {
    res.status(400).json({ msg: 'Invalid data', error: err.message });
  }
});

module.exports = router;