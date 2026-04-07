const mongoose = require('mongoose');

const flightSchema = new mongoose.Schema({
  flightNumber: { type: String, required: true, unique: true, uppercase: true },
  airline: { type: String, required: true },
  airlineLogo: { type: String, default: '' },
  from: {
    city: { type: String, required: true },
    airport: { type: String, required: true },
    code: { type: String, required: true, uppercase: true }
  },
  to: {
    city: { type: String, required: true },
    airport: { type: String, required: true },
    code: { type: String, required: true, uppercase: true }
  },
  departureTime: { type: String, required: true },
  arrivalTime: { type: String, required: true },
  duration: { type: String, required: true },
  date: { type: Date, required: true },
  returnDate: { type: Date },
  class: { type: String, enum: ['Economy', 'Business', 'First Class'], default: 'Economy' },
  price: { type: Number, required: true },
  totalSeats: { type: Number, required: true, default: 150 },
  availableSeats: { type: Number, required: true },
  stops: { type: Number, default: 0 },
  stopDetails: { type: String, default: '' },
  amenities: [{ type: String }],
  baggage: { type: String, default: '23kg' },
  refundable: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

flightSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Flight', flightSchema);
