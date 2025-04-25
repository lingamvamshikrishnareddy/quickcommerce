const express = require('express');
const router = express.Router();
const orderController = require('../controllers/regularOrderController');
const { protect } = require('../middleware/authMiddleware');

// Protect all routes with authentication
router.use(protect);

// Create Order
router.post('/', (req, res) => 
  orderController.createOrder(req, res)
);

// Get User Orders
router.get('/', (req, res) => 
  orderController.getUserOrders(req, res)
);

// Add this to your routes file
router.get('/my', (req, res) => 
  orderController.getUserOrders(req, res)
);


// Get Single Order Details
router.get('/:orderId', (req, res) => 
  orderController.getOrderById(req, res)
);

// Cancel Order
router.delete('/:orderId', (req, res) => 
  orderController.cancelOrder(req, res)
);

module.exports = router;