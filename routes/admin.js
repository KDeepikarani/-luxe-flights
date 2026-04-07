const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const Cancellation = require('../models/Cancellation');
const Support = require('../models/Support');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

// Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalFlights, totalBookings, pendingRefunds] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Flight.countDocuments({ isActive: true }),
      Booking.countDocuments(),
      Cancellation.countDocuments({ refundStatus: 'pending' })
    ]);
    const revenue = await Booking.aggregate([
      { $match: { status: { $ne: 'cancelled' }, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const bookingsByStatus = await Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const topRoutes = await Booking.aggregate([
      { $lookup: { from: 'flights', localField: 'flightId', foreignField: '_id', as: 'flight' } },
      { $unwind: '$flight' },
      { $group: { _id: { from: '$flight.from.code', to: '$flight.to.code' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 5 }
    ]);
    const cancelReasons = await Cancellation.aggregate([{ $group: { _id: '$reason', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    const unreadSupport = await Support.countDocuments({ adminViewed: false });
    const recentBookings = await Booking.find().populate('userId', 'name email').populate('flightId').sort({ createdAt: -1 }).limit(6);
    const recentCancellations = await Cancellation.find().populate('userId', 'name email').populate({ path: 'bookingId', populate: { path: 'flightId' } }).sort({ createdAt: -1 }).limit(5);

    res.json({ success: true, stats: { totalUsers, totalFlights, totalBookings, pendingRefunds, totalRevenue: revenue[0]?.total || 0, unreadSupport }, bookingsByStatus, topRoutes, cancelReasons, recentBookings, recentCancellations });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Users
router.get('/users', async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const q = {};
    if (search) q.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (role) q.role = role;
    const users = await User.find(q).select('-password').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await User.countDocuments(q);
    res.json({ success: true, users, total });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/users/:id', async (req, res) => {
  try {
    const u = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
    res.json({ success: true, user: u });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/users/:id/toggle', async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    u.isActive = !u.isActive; await u.save({ validateBeforeSave: false });
    res.json({ success: true, isActive: u.isActive });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/create-admin', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email exists' });
    const admin = await User.create({ name, email, password, role: 'admin' });
    res.status(201).json({ success: true, user: admin.toSafeObject() });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// All bookings
router.get('/bookings', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const q = {};
    if (status) q.status = status;
    if (search) q.bookingRef = { $regex: search, $options: 'i' };
    const bookings = await Booking.find(q).populate('userId', 'name email').populate('flightId').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Booking.countDocuments(q);
    res.json({ success: true, bookings, total });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/bookings/:id', async (req, res) => {
  try {
    const b = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, booking: b });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/bookings/:id', async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// All refunds
router.get('/refunds', async (req, res) => {
  try {
    const { status } = req.query;
    const q = status ? { refundStatus: status } : {};
    const cancellations = await Cancellation.find(q).populate('userId', 'name email').populate({ path: 'bookingId', populate: { path: 'flightId' } }).sort({ createdAt: -1 });
    res.json({ success: true, cancellations });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/refunds/:id', async (req, res) => {
  try {
    const { refundStatus, adminNotes } = req.body;
    const c = await Cancellation.findById(req.params.id);
    c.refundStatus = refundStatus;
    if (adminNotes) c.adminNotes = adminNotes;
    c.processedBy = req.user._id; c.processedAt = new Date();
    if (refundStatus === 'completed') c.completedAt = new Date();
    c.timeline.push({ status: refundStatus, message: `Status updated to ${refundStatus}. ${adminNotes || ''}`, timestamp: new Date(), updatedBy: req.user._id });
    await c.save();
    res.json({ success: true, cancellation: c });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// All flights (admin)
router.get('/flights', async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const q = {};
    if (search) q.$or = [{ flightNumber: { $regex: search, $options: 'i' } }, { airline: { $regex: search, $options: 'i' } }, { 'from.city': { $regex: search, $options: 'i' } }, { 'to.city': { $regex: search, $options: 'i' } }];
    const flights = await Flight.find(q).sort({ date: 1 }).skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Flight.countDocuments(q);
    res.json({ success: true, flights, total });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
