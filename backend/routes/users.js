const express = require('express');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

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
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Create user (admin only)
router.post('/', auth, adminAuth, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const user = await User.create({ name, email, password, role });
    
    // Return without password
    const userWithoutPassword = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] }
    });
    
    res.status(201).json(userWithoutPassword);
  } catch (err) {
    console.error('Create user error:', err);
    res.status(400).json({ msg: 'Invalid data', error: err.message });
  }
});

// Update user (admin only)
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    await user.update(req.body);
    
    // Return without password
    const userWithoutPassword = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] }
    });
    
    res.json(userWithoutPassword);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(400).json({ msg: 'Invalid data' });
  }
});

// Delete user (admin only)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Prevent self-deletion
    if (user.id === req.user.userId) {
      return res.status(400).json({ msg: 'Cannot delete your own account' });
    }
    
    await user.destroy();
    res.json({ msg: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update own profile
router.patch('/profile', auth, async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Verify current password if changing password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ msg: 'Current password is required to change password' });
      }
      
      const isValidPassword = await user.comparePassword(currentPassword);
      if (!isValidPassword) {
        return res.status(400).json({ msg: 'Current password is incorrect' });
      }
    }
    
    // Prepare updates
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (newPassword) updates.password = newPassword;
    
    await user.update(updates);
    
    // Return updated user without password
    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] }
    });
    
    res.json(updatedUser);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(400).json({ msg: 'Invalid data', error: err.message });
  }
});

module.exports = router;