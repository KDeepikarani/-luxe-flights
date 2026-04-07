const mongoose = require('mongoose');

const supportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  subject: { type: String, required: true },
  category: {
    type: String,
    enum: ['booking_issue', 'refund_query', 'flight_info', 'cancellation', 'payment', 'baggage', 'other'],
    default: 'other'
  },
  messages: [{
    sender: { type: String, enum: ['user', 'admin', 'ai'], required: true },
    senderName: { type: String },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false }
  }],
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  adminViewed: { type: Boolean, default: false },
  adminReplied: { type: Boolean, default: false },
  emailReplySent: { type: Boolean, default: false },
  ticketRef: { type: String, unique: true },
  bookingRef: { type: String, default: '' },
  flagged: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

supportSchema.pre('save', function(next) {
  if (!this.ticketRef) {
    this.ticketRef = 'TK' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Support', supportSchema);
