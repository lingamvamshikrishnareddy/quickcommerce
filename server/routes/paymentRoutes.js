const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// Import the PaymentController CLASS
const PaymentController = require('../controllers/paymentController');
// Create an INSTANCE of the controller so its methods can be called
const paymentControllerInstance = new PaymentController();

// Define routes with middleware
router.post('/create-order', protect, async (req, res) => {
    try {
        // Use the instance for createRazorpayOrder
        await paymentControllerInstance.createRazorpayOrder(req, res);
    } catch (error) {
        console.error("Error in /payments/create-order route handler:", error);
        res.status(500).json({ success: false, message: 'Order creation failed', error: error.message });
    }
});

router.post('/verify', protect, async (req, res) => {
    try {
        // Use the instance for verifyPayment
        await paymentControllerInstance.verifyPayment(req, res);
    } catch (error) {
        console.error("Error in /payments/verify route handler:", error);
        res.status(500).json({ success: false, message: 'Payment verification failed', error: error.message });
    }
});

router.post('/refund', protect, async (req, res) => {
    try {
        // Use the instance for refundPayment
        await paymentControllerInstance.refundPayment(req, res);
    } catch (error) {
        console.error("Error in /payments/refund route handler:", error);
        res.status(500).json({ success: false, message: 'Refund failed', error: error.message });
    }
});

router.get('/history', protect, async (req, res) => {
    try {
        // Use the instance for getPaymentHistory
        await paymentControllerInstance.getPaymentHistory(req, res);
    } catch (error) {
        console.error("Error in /payments/history route handler:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch payment history', error: error.message });
    }
});

module.exports = router;