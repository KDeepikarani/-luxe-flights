const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, protect } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'All fields required' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });
    const user = await User.create({ name, email, password, phone: phone || '' });
    const token = generateToken(user._id);
    res.status(201).json({ success: true, token, user: user.toSafeObject() });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
    // Always lowercase the email for lookup
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    if (!user.isActive) return res.status(401).json({ success: false, message: 'Account has been deactivated' });
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    const token = generateToken(user._id);
    res.json({ success: true, token, user: user.toSafeObject() });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (avatar !== undefined) user.avatar = avatar;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, user: user.toSafeObject() });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!(await user.comparePassword(currentPassword))) return res.status(400).json({ success: false, message: 'Current password incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
