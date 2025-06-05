const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { protect } = require('../middleware/authMiddleware');

// Public routes - accessible without login
router.get('/geocode', locationController.reverseGeocode);
router.get('/suggestions', locationController.getLocationSuggestions);
router.get('/check-deliverability', locationController.checkDeliverability);

// Protected routes - require user to be logged in
router.use(protect);

router.get('/addresses', locationController.getUserAddresses);
router.post('/addresses', locationController.saveUserAddress);
router.delete('/addresses/:locationId', locationController.deleteUserAddress);

module.exports = router;
