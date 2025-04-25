// models/user.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator'); // Using validator for email check

// Define schema only once
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
    index: true, // Add index for faster queries
  },
  phone: {
    type: String,
    required: false,
    sparse: true, // Allow multiple null values but unique if provided
    trim: true,
    // Add specific phone validation if needed using validator library
  },
  password: {
    type: String,
    // Password is required only if it's not a social login
    required: [
      function() { return !this.googleAuth?.googleId; },
      'Password is required for standard registration'
    ],
    minlength: [6, 'Password must be at least 6 characters long'], // Match controller logic
    select: false, // Hide password by default
  },
  username: {
    type: String,
    unique: true,
    sparse: true, // Allows null/undefined, but if present must be unique
    trim: true,
    lowercase: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'manager'], // Define allowed roles
    default: 'user',
  },
  // Removed single 'address' field, prefer 'addresses' array
  addresses: [
    {
      addressLine1: { type: String, trim: true },
      addressLine2: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      country: { type: String, trim: true },
      isDefault: { type: Boolean, default: false },
    }
  ],
  googleAuth: {
    googleId: String,
    provider: String,
  },
  passwordChangedAt: Date,
  // Removed passwordResetToken and passwordResetExpires as controller uses in-memory store
  active: {
    type: Boolean,
    default: true,
    select: false, // Hide 'active' field by default
  },
  isEmailVerified: { // Added based on controller's verifyEmail method
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically (alternative to default Date.now)
});

// ----- Middleware -----

// Hash password before saving (only if modified)
userSchema.pre('save', async function(next) {
  // Only run this function if password was actually modified (or is new) AND is present
  if (!this.isModified('password') || !this.password) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  next();
});

// Update passwordChangedAt timestamp (only if password modified and not new)
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  // Subtract 1 second to ensure token generated AFTER password change is valid
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Query middleware to hide inactive users by default
userSchema.pre(/^find/, function(next) {
  // 'this' points to the current query
  this.find({ active: { $ne: false } });
  next();
});

// ----- Methods -----

// Instance method to check password (select: false needs explicit selection in query)
userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword // The hashed password from the user document
) {
  // Ensure userPassword exists (might not if selected: false and not explicitly requested)
  if (!userPassword) return false;
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance method to check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    // console.log(changedTimestamp, JWTTimestamp); // For debugging
    return JWTTimestamp < changedTimestamp; // True if changed AFTER token issued
  }

  // False means NOT changed after the token was issued
  return false;
};

// ----- Model Export -----

// Check if model exists before compiling it (for Next.js/serverless compatibility)
module.exports = mongoose.models.User || mongoose.model('User', userSchema);