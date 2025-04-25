// locationRoutes.js

const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { protect } = require('../middleware/authMiddleware'); // Assuming you have auth middleware

/**
 * Location Routes
 * All routes are protected except the geocoding endpoints
 */

// Public geocoding routes
router.get('/geocode', locationController.reverseGeocode);
router.get('/suggestions', locationController.getLocationSuggestions);
router.get('/check-deliverability', locationController.checkDeliverability);

// All routes below this line require authentication
router.use(protect);

// User location management routes
router.get('/addresses', locationController.getUserAddresses);
router.post('/addresses', locationController.saveUserAddress);
router.delete('/addresses/:locationId', locationController.deleteUserAddress);

// Optional: Find nearby services route if you implement it
// router.get('/nearby', locationController.findNearbyServices);

module.exports = router;