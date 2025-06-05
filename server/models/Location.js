const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    // FIXED: Added 'delivery' to the list of allowed types to match the frontend.
    enum: ['delivery', 'current', 'home', 'work', 'other'],
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
  }
}, {
  timestamps: true // Use mongoose timestamps for createdAt/updatedAt
});

locationSchema.index({ user: 1 });
locationSchema.index({ "location": "2dsphere" });

// Add virtual for GeoJSON Point representation
locationSchema.virtual('location').get(function() {
  return {
    type: 'Point',
    coordinates: [this.longitude, this.latitude]
  };
});

module.exports = mongoose.model('Location', locationSchema);
