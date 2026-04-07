const mongoose = require('mongoose');

const passengerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  passportNumber: { type: String, default: '' },
  seatNumber: { type: String, default: '' }
});

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  flightId: { type: mongoose.Schema.Types.ObjectId, ref: 'Flight', required: true },
  bookingRef: { type: String, unique: true },
  passengers: [passengerSchema],
  class: { type: String, enum: ['Economy', 'Business', 'First Class'], required: true },
  totalAmount: { type: Number, required: true },
  baseFare: { type: Number, required: true },
  taxes: { type: Number, required: true },
  status: { type: String, enum: ['confirmed', 'pending', 'cancelled', 'completed'], default: 'confirmed' },
  paymentStatus: { type: String, enum: ['paid', 'pending', 'refunded', 'partial_refund'], default: 'paid' },
  paymentMethod: { type: String, default: 'card' },
  contactEmail: { type: String, required: true },
  contactPhone: { type: String, required: true },
  specialRequests: { type: String, default: '' },
  checkinStatus: { type: Boolean, default: false },
  boardingPass: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

bookingSchema.pre('save', function(next) {
  if (!this.bookingRef) {
    this.bookingRef = 'LX' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
