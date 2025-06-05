// routes/locationRoutes.js
const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { protect } = require('../middleware/authMiddleware');
const { validateLocationData, validateCoordinates } = require('../middleware/validationMiddleware');

// Rate limiting middleware for location APIs
const rateLimit = require('express-rate-limit');

const locationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many location requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const searchRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit search requests to 30 per minute
  message: {
    success: false,
    message: 'Too many search requests, please slow down.'
  }
});

// Apply rate limiting to all location routes
router.use(locationRateLimit);

// Public routes - accessible without authentication
// These routes don't require user login but are rate-limited

/**
 * @route   GET /api/locations/geocode
 * @desc    Convert coordinates to address (reverse geocoding)
 * @access  Public
 * @params  latitude, longitude (query params)
 */
router.get('/geocode', validateCoordinates, locationController.reverseGeocode);

/**
 * @route   GET /api/locations/suggestions
 * @desc    Get location suggestions from search query
 * @access  Public
 * @params  query (query param)
 */
router.get('/suggestions', searchRateLimit, locationController.getLocationSuggestions);

/**
 * @route   GET /api/locations/check-deliverability
 * @desc    Check if delivery is available for a postal code
 * @access  Public
 * @params  postalCode/zipCode/pincode (query param)
 */
router.get('/check-deliverability', locationController.checkDeliverability);

// Protected routes - require user authentication
// All routes below this middleware require the user to be logged in
router.use(protect);

/**
 * @route   GET /api/locations/addresses
 * @desc    Get all saved addresses for the authenticated user
 * @access  Private
 */
router.get('/addresses', locationController.getUserAddresses);

/**
 * @route   POST /api/locations/addresses
 * @desc    Save a new address for the authenticated user
 * @access  Private
 * @body    { type, latitude, longitude, address, label?, isDefault? }
 */
router.post('/addresses', validateLocationData, locationController.saveUserAddress);

/**
 * @route   PUT /api/locations/addresses/:locationId
 * @desc    Update an existing address
 * @access  Private
 * @params  locationId (URL param)
 * @body    { type?, latitude?, longitude?, address?, label?, isDefault? }
 */
router.put('/addresses/:locationId', validateLocationData, locationController.updateUserAddress);

/**
 * @route   DELETE /api/locations/addresses/:locationId
 * @desc    Delete a user address by ID
 * @access  Private
 * @params  locationId (URL param)
 */
router.delete('/addresses/:locationId', locationController.deleteUserAddress);

/**
 * @route   PUT /api/locations/addresses/:locationId/default
 * @desc    Set an address as default
 * @access  Private
 * @params  locationId (URL param)
 */
router.put('/addresses/:locationId/default', locationController.setDefaultAddress);

/**
 * @route   GET /api/locations/addresses/default
 * @desc    Get user's default address
 * @access  Private
 */
router.get('/addresses/default', locationController.getDefaultAddress);

/**
 * @route   GET /api/locations/nearby
 * @desc    Find locations near given coordinates
 * @access  Private
 * @params  latitude, longitude, radius? (query params)
 */
router.get('/nearby', validateCoordinates, locationController.getNearbyLocations);

// Error handling middleware specific to location routes
router.use((error, req, res, next) => {
  // Handle specific location-related errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid location data',
      errors: Object.values(error.errors).map(err => err.message)
    });
  }

  if (error.name === 'CastError' && error.path === '_id') {
    return res.status(400).json({
      success: false,
      message: 'Invalid location ID format'
    });
  }

  // Handle geocoding API errors
  if (error.response?.status === 429) {
    return res.status(429).json({
      success: false,
      message: 'Location service rate limit exceeded. Please try again later.'
    });
  }

  if (error.code === 'ECONNABORTED') {
    return res.status(408).json({
      success: false,
      message: 'Location service timeout. Please try again.'
    });
  }

  // Pass to global error handler
  next(error);
});

module.exports = router;
