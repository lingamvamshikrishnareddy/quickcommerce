const mongoose = require('mongoose');
const crypto = require('crypto');

const deliverySchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driver: { // Delivery agent
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Assuming drivers are users with a 'driver' role
  },
  status: {
    type: String,
    enum: ['pending_assignment', 'assigned', 'out_for_delivery', 'delivered', 'cancelled', 'failed_delivery'],
    default: 'pending_assignment'
  },
  currentLocation: { // Driver's current location
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number] // [longitude, latitude]
    },
    timestamp: Date
  },
  deliveryAddress: { // Copied from order for potentially denormalization/updates
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  trackingNumber: {
    type: String,
    unique: true
  },
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  otp: {
    code: String,
    expiresAt: Date
  },
  otpVerified: {
    type: Boolean,
    default: false
  },
  deliveryProof: { // URL to image/signature
    type: String
  },
  notes: String // Notes from driver or customer
}, {
  timestamps: true
});

// Geospatial index for driver location
deliverySchema.index({ currentLocation: '2dsphere' });

// Generate tracking number and update timestamp
deliverySchema.pre('save', function(next) {
  if (this.isNew && !this.trackingNumber) {
    this.trackingNumber = `QCK-${Date.now().toString().slice(-6)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model('Delivery', deliverySchema);