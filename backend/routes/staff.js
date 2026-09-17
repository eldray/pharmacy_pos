// backend/routes/staff.js
const express = require('express');
const { StaffProfile, User, Branch } = require('../models');
const { auth, adminOrManagerAuth } = require('../middleware/auth');
const { recordAudit } = require('../utils/audit');

const router = express.Router();

const STAFF_INCLUDE = [
  { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role', 'status'] },
  { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] },
];

// ─── List all staff profiles (admin + manager) ────────────────────
router.get('/', auth, adminOrManagerAuth, async (req, res) => {
  try {
    const profiles = await StaffProfile.findAll({
      include: STAFF_INCLUDE,
      order: [['createdAt', 'DESC']],
    });
    res.json(profiles);
  } catch (err) {
    console.error('Fetch staff profiles error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Get one profile ──────────────────────────────────────────────
router.get('/:id', auth, adminOrManagerAuth, async (req, res) => {
  try {
    const profile = await StaffProfile.findByPk(req.params.id, { include: STAFF_INCLUDE });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    console.error('Fetch staff profile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Create or update profile (admin + manager) ───────────────────
router.post('/', auth, adminOrManagerAuth, async (req, res) => {
  try {
    const {
      userId, branchId, employeeId, department, designation,
      phoneNumber, address, dob, gender, hireDate,
      employmentType, salary, emergencyContactName, emergencyContactPhone, status,
    } = req.body;

    if (!userId || !employeeId || !designation) {
      return res.status(400).json({
        success: false,
        message: 'User ID, Employee ID, and Designation are required',
      });
    }

    // Ensure user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Linked user not found' });
    }

    let profile = await StaffProfile.findOne({ where: { userId } });
    let action;
    if (profile) {
      await profile.update({
        branchId, employeeId, department, designation,
        phoneNumber, address, dob, gender, hireDate,
        employmentType, salary, emergencyContactName, emergencyContactPhone, status,
      });
      action = 'update';
    } else {
      profile = await StaffProfile.create({
        userId, branchId, employeeId, department, designation,
        phoneNumber, address, dob, gender, hireDate,
        employmentType, salary, emergencyContactName, emergencyContactPhone, status,
      });
      action = 'create';
    }

    await recordAudit(req, {
      action,
      entity: 'StaffProfile',
      entityId: profile.id,
      changes: { userId, employeeId, designation, department },
    });

    const updated = await StaffProfile.findByPk(profile.id, { include: STAFF_INCLUDE });
    res.status(200).json(updated);
  } catch (err) {
    console.error('Save staff profile error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// ─── Delete profile (admin only) ──────────────────────────────────
router.delete('/:id', auth, adminOrManagerAuth, async (req, res) => {
  try {
    const profile = await StaffProfile.findByPk(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });

    const deleted = { userId: profile.userId, employeeId: profile.employeeId };
    await profile.destroy();

    await recordAudit(req, {
      action: 'delete', entity: 'StaffProfile', entityId: profile.id,
      changes: { deleted },
    });

    res.json({ success: true, message: 'Staff profile removed' });
  } catch (err) {
    console.error('Delete staff profile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;