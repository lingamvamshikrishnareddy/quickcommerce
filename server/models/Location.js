const mongoose = require('mongoose');

/**
 * Location Schema
 * Stores user's saved locations like home, work, etc.
 */
const locationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['current', 'home', 'work', 'other'],
    required: true
  },
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  label: {
    type: String,
    trim: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create geospatial index
locationSchema.index({ longitude: 1, latitude: 1 }, { type: '2dsphere' });

// Update timestamp middleware
locationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add virtual for GeoJSON Point representation
locationSchema.virtual('location').get(function() {
  return {
    type: 'Point',
    coordinates: [this.longitude, this.latitude]
  };
});

module.exports = mongoose.model('Location', locationSchema);