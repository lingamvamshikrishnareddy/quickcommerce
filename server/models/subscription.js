const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'weekly'
  },
  deliveryDay: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    default: 'monday'
  },
  nextDeliveryDate: {
    type: Date,
    required: true
  },
  totalCost: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'cancelled'],
    default: 'active'
  },
  cancelledAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);