const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order: { // Link to the specific order
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  razorpayOrderId: { // From Razorpay order creation
    type: String,
    required: true,
    unique: true
  },
  razorpayPaymentId: { // From Razorpay success callback/webhook
    type: String,
    index: true
  },
  razorpaySignature: { // From Razorpay success callback/webhook
    type: String
  },
  amount: { // Amount in the smallest currency unit (e.g., paisa)
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  method: {
    type: String,
    default: 'razorpay' // Or could be based on what was initiated
  },
  status: {
    type: String,
    enum: ['created', 'authorized', 'captured', 'failed', 'refunded'],
    default: 'created'
  },
  notes: { // Optional notes
    type: mongoose.Schema.Types.Mixed
  },
  refundDetails: {
    refundId: String,
    amount: Number,
    status: String,
    refundedAt: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', PaymentSchema);