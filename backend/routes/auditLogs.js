const express = require('express');
const { Op } = require('sequelize');
const AuditLog = require('../models/AuditLog');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/audit-logs — admin-only, paginated, filterable by entity/action/user.
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    const { entity, action, userId, entityId } = req.query;
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50')));

    const where = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (entityId) where.entityId = String(entityId);

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    res.json({
      data: rows,
      pagination: { total: count, page, limit, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    console.error('Get audit logs error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
