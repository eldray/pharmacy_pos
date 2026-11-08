// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// The JWT is only a claim; the database is the authority. Re-reading the user
// per request means a blocked or deleted account, or a changed role, takes
// effect immediately instead of surviving until the token expires.
const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ msg: 'Token is not valid' });
  }

  try {
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'name', 'username', 'email', 'role', 'status'],
    });
    if (!user) return res.status(401).json({ msg: 'User no longer exists' });
    if (user.status !== 'active') return res.status(403).json({ msg: 'Account is blocked' });

    req.user = { userId: user.id, id: user.id, name: user.name, username: user.username, email: user.email, role: user.role };
    next();
  } catch (err) {
    console.error('Auth middleware user lookup failed:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Admin only
const adminAuth = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Admin access required' });
  }
  next();
};

// Admin or Manager
const adminOrManagerAuth = (req, res, next) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ msg: 'Admin or Manager access required' });
  }
  next();
};

// Lab technicians, admins, and managers
const labAuth = (req, res, next) => {
  if (!['lab_tech', 'admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ msg: 'Lab access required' });
  }
  next();
};

// Cashier, Manager, Admin
const cashierAuth = (req, res, next) => {
  if (!['admin', 'manager', 'cashier'].includes(req.user.role)) {
    return res.status(403).json({ msg: 'Cashier or higher access required' });
  }
  next();
};

// Pharmacist, Manager, Admin
const pharmacistAuth = (req, res, next) => {
  if (!['admin', 'manager', 'pharmacist_sales'].includes(req.user.role)) {
    return res.status(403).json({ msg: 'Pharmacist or higher access required' });
  }
  next();
};

module.exports = {
  auth,
  adminAuth,
  adminOrManagerAuth,
  labAuth,
  cashierAuth,
  pharmacistAuth,
};