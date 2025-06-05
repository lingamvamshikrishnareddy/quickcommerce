// models/Location.js
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['delivery', 'current', 'home', 'work', 'other'],
    required: true,
    default: 'delivery'
  },
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90,
    validate: {
      validator: function(v) {
        return !isNaN(v) && isFinite(v);
      },
      message: 'Latitude must be a valid number'
    }
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180,
    validate: {
      validator: function(v) {
        return !isNaN(v) && isFinite(v);
      },
      message: 'Longitude must be a valid number'
    }
  },
  address: {
    type: String,
    required: true,
    trim: true,
    maxLength: 500
  },
  label: {
    type: String,
    trim: true,
    maxLength: 100,
    default: ''
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  // Additional fields for better location management
  components: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    postalCode: { type: String, trim: true }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
locationSchema.index({ user: 1, isDefault: -1 });
locationSchema.index({ user: 1, type: 1 });
locationSchema.index({ user: 1, isActive: 1 });

// GeoSpatial index for location-based queries
locationSchema.index({ 
  location: '2dsphere' 
});

// Virtual for GeoJSON Point representation
locationSchema.virtual('location').get(function() {
  return {
    type: 'Point',
    coordinates: [this.longitude, this.latitude]
  };
});

// Virtual for formatted display
locationSchema.virtual('displayName').get(function() {
  if (this.label && this.label.trim()) {
    return this.label;
  }
  
  if (this.components?.city) {
    return this.components.state ? 
      `${this.components.city}, ${this.components.state}` : 
      this.components.city;
  }
  
  // Fallback to first part of address
  return this.address.split(',')[0].trim();
});

// Pre-save middleware to ensure only one default address per user
locationSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // Unset other default addresses for this user
    await this.constructor.updateMany(
      { 
        user: this.user, 
        _id: { $ne: this._id }, 
        isDefault: true 
      },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Static method to get user's default address
locationSchema.statics.getDefaultAddress = function(userId) {
  return this.findOne({ 
    user: userId, 
    isDefault: true, 
    isActive: true 
  }).sort({ updatedAt: -1 });
};

// Static method to get all user addresses
locationSchema.statics.getUserAddresses = function(userId, options = {}) {
  const query = { 
    user: userId, 
    isActive: true 
  };
  
  if (options.type) {
    query.type = options.type;
  }
  
  return this.find(query)
    .sort({ isDefault: -1, updatedAt: -1 })
    .limit(options.limit || 50);
};

// Instance method to set as default
locationSchema.methods.setAsDefault = async function() {
  // Unset other defaults
  await this.constructor.updateMany(
    { 
      user: this.user, 
      _id: { $ne: this._id }, 
      isDefault: true 
    },
    { $set: { isDefault: false } }
  );
  
  // Set this as default
  this.isDefault = true;
  return this.save();
};

// Instance method to calculate distance from another point
locationSchema.methods.distanceFrom = function(lat, lng) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat - this.latitude) * Math.PI / 180;
  const dLng = (lng - this.longitude) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.latitude * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Ensure virtuals are included in JSON output
locationSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

locationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Location', locationSchema);
