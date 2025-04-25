const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/DeliveryController');
const { protect, restrictTo } = require('../middleware/authMiddleware');


router.use(protect);

 
router.post('/:deliveryId/request-otp', deliveryController.requestDeliveryOTP);
router.post('/:deliveryId/verify-otp', deliveryController.verifyDeliveryOTP);


router.get('/by-order/:orderId', deliveryController.getDeliveryStatusByOrderId);


router.put('/:deliveryId/location', deliveryController.updateDriverLocation);


 router.post('/', deliveryController.createDelivery);
 router.get('/', deliveryController.getUserDeliveries);
 router.get('/:id', deliveryController.getDeliveryById);

 router.put('/:id/status', restrictTo('admin'), deliveryController.updateDeliveryStatus);
 router.get('/admin', restrictTo('admin'), deliveryController.getAllDeliveries);

module.exports = router;