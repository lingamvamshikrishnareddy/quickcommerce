const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');

// Protect all routes with authentication
router.use(protect);

// Create Subscription
router.post('/', (req, res) => 
  subscriptionController.createSubscription(req, res)
);

// Get User Subscriptions
router.get('/', (req, res) => 
  subscriptionController.getUserSubscriptions(req, res)
);

// Update Subscription
router.put('/:subscriptionId', (req, res) => 
  subscriptionController.updateSubscription(req, res)
);

// Cancel Subscription
router.delete('/:subscriptionId', (req, res) => 
  subscriptionController.cancelSubscription(req, res)
);

module.exports = router;
