const express = require('express');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');
const { validatePassword, validateEmail } = require('../utils/validators');

const router = express.Router();

// Never let passwords reach the audit log.
const safeUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

// Get all users (admin only)
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ['password'] }
    });
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Create user (admin only)
router.post('/', auth, adminAuth, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const emailErr = validateEmail(email);
    if (emailErr) return res.status(400).json({ msg: emailErr });
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ msg: pwErr });

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ msg: 'User already exists' });

    const user = await User.create({ name, email, password, role });
    await recordAudit(req, { action: 'create', entity: 'User', entityId: user.id, changes: { after: safeUser(user) } });
    const result = await User.findByPk(user.id, { attributes: { exclude: ['password'] } });
    res.status(201).json(result);
  } catch (err) {
    console.error('Create user error:', err);
    res.status(400).json({ msg: 'Invalid data', error: err.message });
  }
});

// Update user (admin only)
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Validate only fields actually being changed.
    if (req.body.email !== undefined) {
      const emailErr = validateEmail(req.body.email);
      if (emailErr) return res.status(400).json({ msg: emailErr });
    }
    if (req.body.password) {
      const pwErr = validatePassword(req.body.password);
      if (pwErr) return res.status(400).json({ msg: pwErr });
    }

    const before = safeUser(user);
    await user.update(req.body);
    await recordAudit(req, {
      action: 'update', entity: 'User', entityId: user.id,
      changes: { before, after: safeUser(user), passwordChanged: user.changed('password') || undefined }
    });
    const result = await User.findByPk(user.id, { attributes: { exclude: ['password'] } });
    res.json(result);
  } catch (err) {
    res.status(400).json({ msg: 'Invalid data', error: err.message });
  }
});

// Delete user (admin only)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (user.id === req.user.userId) {
      return res.status(400).json({ msg: 'Cannot delete your own account' });
    }

    const deleted = safeUser(user);
    await user.destroy();
    await recordAudit(req, { action: 'delete', entity: 'User', entityId: deleted.id, changes: { deleted } });
    res.json({ msg: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update own profile
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