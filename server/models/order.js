const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: { // Price at the time of order
    type: Number,
    required: true,
    min: 0
  },
  variation: { // Add variation if applicable
    type: mongoose.Schema.Types.Mixed
  }
}, { _id: false }); // No separate _id for subdocuments unless needed

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  shippingAddress: { // Can be an object or reference to Address model
    type: mongoose.Schema.Types.Mixed, // Keep simple for now, or use ref: 'Address'
    required: true
    /* Example structure if object:
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String, required: true }
    */
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['razorpay', 'cod'] // Example methods
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentDetails: { // Store payment related IDs
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }, // Link to Payment model
    razorpayOrderId: String,
    razorpayPaymentId: String
  },
  deliveryInstructions: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'failed'],
    default: 'pending',
    index: true
  },
  delivery: { // Link to Delivery model
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery'
  },
  // Consider adding coupon details if used
  // coupon: { code: String, discountAmount: Number }
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  // Recalculate total amount if items change (optional, safer to calculate on creation)
  // this.totalAmount = this.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  next();
});

// Method to check if order can be cancelled
orderSchema.methods.canCancel = function() {
  const nonCancellableStatuses = ['shipped', 'out_for_delivery', 'delivered', 'cancelled', 'failed'];
  return !nonCancellableStatuses.includes(this.status);
};

module.exports = mongoose.model('Order', orderSchema);