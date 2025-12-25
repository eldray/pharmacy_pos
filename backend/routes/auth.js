// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // DEBUG: Log the login attempt
  console.log('Login attempt for email:', email);
  console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
  
  // Check if JWT_SECRET is set (critical for JWT signing)
  if (!process.env.JWT_SECRET) {
    console.error('❌ CRITICAL: JWT_SECRET environment variable is not set!');
    return res.status(500).json({ 
      msg: 'Server configuration error',
      details: 'JWT_SECRET is not configured'
    });
  }
  
  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('User not found:', email);
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('Invalid password for:', email);
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = { 
      userId: user.id, 
      role: user.role,
      email: user.email 
    };
    
    console.log('Creating JWT token for user:', user.email);
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, { 
      expiresIn: '24h'  // Increased for testing
    });

    console.log('✅ Login successful for:', email);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
    
  } catch (err) {
    console.error('❌ Login error:', err.message);
    console.error('Full error:', err);
    
    res.status(500).json({ 
      msg: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Health check endpoint (useful for debugging)
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    jwtConfigured: !!process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;