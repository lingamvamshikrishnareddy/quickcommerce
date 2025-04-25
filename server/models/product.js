// Inside models/product.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema; // Good practice to alias Schema

const productSchema = new Schema({
  // Explicitly define _id to handle numeric values
  _id: {
    type: Schema.Types.Mixed, // Or use Number if ALWAYS a number, Mixed is safer
    required: true // Assuming _id should always exist
  },
  // Explicitly define _original_id
  _original_id: {
    type: Schema.Types.ObjectId, // Match the corrected DB type
    required: true, // Assuming this should always exist now
    index: true     // Good to index if you query by it
  },
  productId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  sku: {
    type: String,
    required: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  subCategory: {
    type: String,
    index: true
  },
  quantity: { // This might represent package size/unit, not inventory
    value: {
      type: Number,
      required: true
    },
    unit: {
      type: String, // e.g., 'kg', 'litre', 'pack', 'unit'
      required: true
    }
  },
  pricing: {
    mrp: {
      type: Number,
      required: true,
      min: 0
    },
    salePrice: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      },
      amount: {
        type: Number,
        min: 0,
        default: 0
      }
    }
  },
   // --- ADD THE STOCK FIELD (Inventory Count) ---
   // Inside models/product.js, ensure this field exists:
stock: {
  type: Number,
  required: true,
  min: 0,
  default: 0
},
  // --- END STOCK FIELD ---
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: String,
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  brand: {
    type: String,
    trim: true
  },
  searchKeywords: [{
    type: String,
    trim: true
  }],
  metadata: {
    createdAt: {
      // Use timestamps option below instead
      // type: Date,
      // default: Date.now
    },
    updatedAt: {
       // Use timestamps option below instead
      // type: Date,
      // default: Date.now
    },
    isActive: { // Controls if product is visible/orderable
      type: Boolean,
      default: true
    },
    inStock: { // Consider if this boolean is still needed, or derive from stock > 0
      type: Boolean, // Might represent overall availability status, distinct from count
      default: true
    }
  },
  variants: [{ // If using variants, stock might be managed per variant
    name: String,
    price: Number,
    // quantity: Number, // Usually stock is per variant SKU
    sku: String,
    stock: { type: Number, min: 0, default: 0 } // STOCK PER VARIANT
  }],
  attributes: [{
    name: String,
    value: String
  }],
  tags: [{
    type: String,
    trim: true
  }],
  rating: {
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  nutritionalInfo: {
    type: Map,
    of: String
  },
  apiEndpoint: String,
  apiQuery: {
    byId: String,
    bySlug: String,
    byCategory: String
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  _id: false // Since we're defining our own _id
});

// Indexes for better query performance
productSchema.index({ title: 'text', description: 'text', searchKeywords: 'text' });
productSchema.index({ 'metadata.isActive': 1, stock: 1 }); // Index stock with isActive
productSchema.index({ 'pricing.salePrice': 1 });
productSchema.index({ brand: 1 });
productSchema.index({ _original_id: 1 });
productSchema.index({ category: 1 }); // Added index for category queries
productSchema.index({ sku: 1 }); // Added index for SKU lookups

// Pre-save hook to update timestamp (timestamps: true handles this, but keep custom logic)
productSchema.pre('save', function(next) {
  // Mongoose 'timestamps: true' handles updatedAt automatically on save
  // this.metadata.updatedAt = Date.now(); // Can remove if using timestamps: true

  // Calculate discount if not provided
  if (this.isModified('pricing') && this.pricing.mrp > this.pricing.salePrice) {
    const discountAmount = this.pricing.mrp - this.pricing.salePrice;
    this.pricing.discount.amount = discountAmount;
    // Prevent division by zero if mrp is 0
    this.pricing.discount.percentage = this.pricing.mrp > 0 ? Math.round((discountAmount / this.pricing.mrp) * 100) : 0;
  } else if (this.isModified('pricing') && this.pricing.mrp <= this.pricing.salePrice) {
      // Reset discount if salePrice >= mrp
      this.pricing.discount.amount = 0;
      this.pricing.discount.percentage = 0;
  }

  // Update inStock boolean based on stock quantity? (Optional logic)
  // this.metadata.inStock = this.stock > 0;

  next();
});

// Virtual for checking if product is on sale
productSchema.virtual('isOnSale').get(function() {
  return this.pricing.mrp > this.pricing.salePrice;
});

// Method to check stock availability (use the actual stock number)
productSchema.methods.hasStock = function(quantityRequired = 1) {
  // If using variants, logic needs to check variant stock
  if (this.variants && this.variants.length > 0) {
      // Implement variant stock checking logic here if needed
      console.warn("hasStock method needs update for variant stock checking.");
      return this.metadata.inStock; // Fallback to boolean for now
  }
  // Otherwise check top-level stock
  return this.stock >= quantityRequired;
};

// Static method to find featured products (adjusted criteria slightly)
productSchema.statics.getFeatured = function() {
  return this.find({
    'metadata.isActive': true,
    'stock': { $gt: 0 }, // Only feature items with stock > 0
    'pricing.discount.percentage': { $gte: 10 } // Example: discount >= 10%
  })
  .sort({ 'pricing.discount.percentage': -1 }) // Sort by highest discount
  .limit(10);
};


// Ensure the model name is consistent ('Product')
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

module.exports = Product;


