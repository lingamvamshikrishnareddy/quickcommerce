const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Cart Item Schema (sub-document)
const CartItemSchema = new Schema({
  // Primary product reference - can be either _id or _original_id
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  // Reference the original ObjectId separately for more reliability
  productObjectId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  // Store product slug for additional lookup capability
  productSlug: {
    type: String,
    default: null
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  variation: {
    type: Schema.Types.Mixed,
    default: null
  }
}, { timestamps: true });

// Rest of the schema remains the same...
const CartSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [CartItemSchema],
  // Optional additional fields
  couponCode: {
    type: String,
    default: null
  },
  discount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Virtual for calculating total
CartSchema.virtual('total').get(function() {
  return this.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
});

// Set toJSON and toObject options to include virtuals
CartSchema.set('toJSON', { virtuals: true });
CartSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Cart', CartSchema);