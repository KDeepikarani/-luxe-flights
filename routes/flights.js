const express = require('express');
const router = express.Router();
const Flight = require('../models/Flight');
const { protect, adminOnly } = require('../middleware/auth');

// Get available airport codes — MUST be before /:id
router.get('/meta/airports', async (req, res) => {
  try {
    const froms = await Flight.distinct('from.code');
    const tos = await Flight.distinct('to.code');
    res.json({ success: true, codes: [...new Set([...froms, ...tos])] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Search flights — MUST be before /:id
router.get('/search', async (req, res) => {
  try {
    const { from, to, date, class: cls, passengers = 1 } = req.query;
    const query = { isActive: true, availableSeats: { $gte: parseInt(passengers) } };
    if (from) query['from.code'] = from.toUpperCase();
    if (to) query['to.code'] = to.toUpperCase();
    if (cls) query.class = cls;
    if (date) {
      const d = new Date(date);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      query.date = { $gte: d, $lt: next };
    }
    const flights = await Flight.find(query).sort({ price: 1 });
    res.json({ success: true, flights });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Get all active flights
router.get('/', async (req, res) => {
  try {
    const flights = await Flight.find({ isActive: true }).sort({ date: 1 }).limit(100);
    res.json({ success: true, flights });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ADMIN: Create flight
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const flight = await Flight.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, message: 'Flight created', flight });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Get single flight — after all specific routes
router.get('/:id', async (req, res) => {
  try {
    const flight = await Flight.findById(req.params.id);
    if (!flight) return res.status(404).json({ success: false, message: 'Flight not found' });
    res.json({ success: true, flight });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ADMIN: Update flight
router.put('/:id/toggle', protect, adminOnly, async (req, res) => {
  try {
    const flight = await Flight.findById(req.params.id);
    if (!flight) return res.status(404).json({ success: false, message: 'Flight not found' });
    flight.isActive = !flight.isActive;
    await flight.save();
    res.json({ success: true, isActive: flight.isActive });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const flight = await Flight.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: false });
    if (!flight) return res.status(404).json({ success: false, message: 'Flight not found' });
    res.json({ success: true, flight });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ADMIN: Delete flight
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Flight.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Flight deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;

