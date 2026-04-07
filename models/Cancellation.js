const mongoose = require('mongoose');

const cancellationSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cancellationRef: { type: String, unique: true },
  reason: {
    type: String,
    enum: ['change_of_plans','found_better_deal','emergency','weather_conditions',
           'health_issues','travel_restrictions','double_booking','work_commitment',
           'visa_issues','family_emergency','other'],
    required: true
  },
  reasonDetails: { type: String, default: '' },
  originalAmount: { type: Number, required: true },
  refundAmount: { type: Number, required: true },
  refundPercentage: { type: Number, required: true },
  refundPolicy: { type: String, required: true },
  refundStatus: {
    type: String,
    enum: ['pending', 'processing', 'processed', 'completed', 'rejected'],
    default: 'pending'
  },
  refundMethod: { type: String, default: 'original_payment' },
  adminNotes: { type: String, default: '' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: { type: Date },
  expectedDate: { type: Date },
  completedAt: { type: Date },
  timeline: [{
    status: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

cancellationSchema.pre('save', function(next) {
  if (!this.cancellationRef) {
    this.cancellationRef = 'RF' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Cancellation', cancellationSchema);
