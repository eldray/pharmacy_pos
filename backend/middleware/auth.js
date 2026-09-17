// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
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