const express = require('express');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const { isProduction, isDemoPassword } = require('../utils/environment');
const { normalizeUsername } = require('../utils/validators');

const router = express.Router();
const { numericIdParams } = require('../utils/numericIdParams');

numericIdParams(router);

// Strict limiter for login: 10 attempts per 15 min per IP to slow brute force.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please try again in a few minutes.',
});

// Login — the credential is the username. `email` is still accepted as the
// field name so older clients keep working, and an address still resolves to
// the account that owns it.
router.post('/login', loginLimiter, async (req, res) => {
  const { password } = req.body;
  const identifier = normalizeUsername(req.body.username ?? req.body.email);

  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET not set');
    return res.status(500).json({ msg: 'Server configuration error' });
  }

  if (!identifier || !password) {
    return res.status(400).json({ msg: 'Username and password are required' });
  }

  try {
    const user = await User.findOne({
      where: {
        [Op.or]: [
          sequelize.where(sequelize.fn('LOWER', sequelize.col('username')), identifier),
          sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), identifier),
        ],
      },
    });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(400).json({ msg: 'Invalid credentials' });

    // A database carried over from a demo install still has the hashes for the
    // passwords printed on the sign-in screen. On a live till those are public
    // credentials, so refuse them and say what to do instead.
    if (isProduction() && isDemoPassword(password)) {
      console.warn(`Refused demo password at login for ${user.username}`);
      return res.status(403).json({
        msg: 'This account still uses a demo password. An administrator must reset it before it can sign in.'
      });
    }

    // A blocked account must not obtain a token at all, even for read-only access.
    if (user.status !== 'active') {
      return res.status(403).json({ msg: 'Account is blocked. Contact an administrator.' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role },
      token
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({
      msg: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ['password'] }
    });
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Health check (also available at /api/health via server.js)
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    jwtConfigured: !!process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV || 'development',
    database: 'PostgreSQL'
  });
});

module.exports = router;