const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const Cancellation = require('../models/Cancellation');
const { protect } = require('../middleware/auth');

// Calculate refund
function calculateRefund(booking) {
  const now = new Date();
  const flightDate = new Date(booking.flightId.date || booking.createdAt);
  const hoursUntilFlight = (flightDate - now) / (1000 * 60 * 60);

  let refundPercentage = 0, policy = '';
  if (hoursUntilFlight <= 0) { refundPercentage = 0; policy = 'No refund — flight has departed'; }
  else if (hoursUntilFlight <= 24) { refundPercentage = 50; policy = '50% refund — cancelled within 24 hours of departure'; }
  else if (hoursUntilFlight <= 72) { refundPercentage = 75; policy = '75% refund — cancelled within 72 hours'; }
  else if (hoursUntilFlight <= 168) { refundPercentage = 90; policy = '90% refund — cancelled within 7 days'; }
  else { refundPercentage = 100; policy = 'Full refund — cancelled more than 7 days before departure'; }

  return { refundPercentage, policy, refundAmount: (booking.totalAmount * refundPercentage) / 100, hoursUntilFlight };
}

// Get my refunds — MUST be before /:id
router.get('/my/refunds', protect, async (req, res) => {
  try {
    const cancellations = await Cancellation.find({ userId: req.user._id })
      .populate({ path: 'bookingId', populate: { path: 'flightId' } })
      .sort({ createdAt: -1 });
    res.json({ success: true, cancellations });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Get my bookings
router.get('/', protect, async (req, res) => {
  try {
    const { status } = req.query;
    const query = { userId: req.user._id };
    if (status) query.status = status;
    const bookings = await Booking.find(query).populate('flightId').sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Get single booking
router.get('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id }).populate('flightId');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, booking });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Create booking
router.post('/', protect, async (req, res) => {
  try {
    const { flightId, passengers, class: cls, contactEmail, contactPhone, specialRequests, paymentMethod } = req.body;
    const flight = await Flight.findById(flightId);
    if (!flight) return res.status(404).json({ success: false, message: 'Flight not found' });
    if (flight.availableSeats < passengers.length) return res.status(400).json({ success: false, message: 'Not enough seats available' });

    const baseFare = flight.price * passengers.length;
    const taxes = Math.round(baseFare * 0.18);
    const totalAmount = baseFare + taxes;

    const booking = await Booking.create({
      userId: req.user._id, flightId, passengers, class: cls || flight.class,
      baseFare, taxes, totalAmount, contactEmail: contactEmail || req.user.email,
      contactPhone: contactPhone || req.user.phone, specialRequests: specialRequests || '',
      paymentMethod: paymentMethod || 'card'
    });

    flight.availableSeats -= passengers.length;
    await flight.save();

    const populated = await Booking.findById(booking._id).populate('flightId');
    res.status(201).json({ success: true, message: 'Booking confirmed!', booking: populated });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Refund preview
router.get('/:id/refund-preview', protect, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id }).populate('flightId');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    const preview = calculateRefund(booking);
    res.json({ success: true, refundPreview: { ...preview, originalAmount: booking.totalAmount } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Cancel booking
router.post('/:id/cancel', protect, async (req, res) => {
  try {
    const { reason, reasonDetails } = req.body;
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id }).populate('flightId');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status === 'cancelled') return res.status(400).json({ success: false, message: 'Already cancelled' });
    if (booking.status === 'completed') return res.status(400).json({ success: false, message: 'Cannot cancel completed booking' });

    const { refundPercentage, policy, refundAmount } = calculateRefund(booking);
    const expectedDate = new Date(); expectedDate.setDate(expectedDate.getDate() + 5);

    const cancellation = await Cancellation.create({
      bookingId: booking._id, userId: req.user._id, reason,
      reasonDetails: reasonDetails || '', originalAmount: booking.totalAmount,
      refundAmount, refundPercentage, refundPolicy: policy,
      expectedDate: refundAmount > 0 ? expectedDate : null,
      refundStatus: refundAmount > 0 ? 'pending' : 'completed',
      timeline: [{ status: 'pending', message: `Cancellation submitted. ${policy}`, timestamp: new Date() }]
    });

    booking.status = 'cancelled';
    booking.paymentStatus = refundPercentage === 100 ? 'refunded' : refundPercentage > 0 ? 'partial_refund' : 'paid';
    await booking.save();

    // Restore seats
    await Flight.findByIdAndUpdate(booking.flightId._id, { $inc: { availableSeats: booking.passengers.length } });

    res.json({ success: true, message: 'Booking cancelled', cancellation, refundAmount, refundPercentage });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
