const Razorpay = require('razorpay');
const crypto = require('crypto');
const logger = require('../utils/logger');

class PaymentManager {
  constructor() {
    this.razorpay = null;
    this.initializeRazorpay();
  }

  initializeRazorpay() {
    try {
      // Validate Razorpay credentials
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay Key ID or Key Secret is not defined');
      }

      // Initialize Razorpay with configuration
      this.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });

      logger.info('Razorpay payment gateway initialized successfully');
    } catch (error) {
      logger.error(`Failed to initialize Razorpay: ${error.message}`);
      throw error;
    }
  }

  // Method to create a payment order for quick commerce transactions
  async createPaymentOrder(amount, currency = 'INR', metadata = {}) {
    try {
      // Validate input
      if (!amount || amount <= 0) {
        throw new Error('Invalid payment amount');
      }

      // Razorpay works with paisa (cents), so convert rupees to paisa
      const amountInPaisa = Math.round(amount * 100);

      const orderOptions = {
        amount: amountInPaisa,
        currency: currency.toUpperCase(),
        receipt: metadata.orderId || `order_${Date.now()}`,
        notes: {
          ...metadata,
          platform: 'quick-commerce',
          created_at: new Date().toISOString()
        }
      };

      const order = await this.razorpay.orders.create(orderOptions);

      return order;
    } catch (error) {
      logger.error(`Payment Order Creation Error: ${error.message}`);
      throw error;
    }
  }

  // Method to verify payment signature
  verifyPayment(orderDetails) {
    try {
      const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature 
      } = orderDetails;

      // Create signature
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      // Compare signatures
      const isSignatureValid = generatedSignature === razorpay_signature;

      if (!isSignatureValid) {
        throw new Error('Payment signature verification failed');
      }

      return {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        isValid: true
      };
    } catch (error) {
      logger.error(`Payment Verification Error: ${error.message}`);
      throw error;
    }
  }

  // Method to handle refunds for quick commerce transactions
  async processRefund(paymentId, amount, reason = 'requested_by_customer') {
    try {
      // Razorpay refund amount is in paisa
      const amountInPaisa = Math.round(amount * 100);

      const refundOptions = {
        payment_id: paymentId,
        amount: amountInPaisa,
        notes: {
          reason: reason,
          platform: 'quick-commerce',
          refunded_at: new Date().toISOString()
        }
      };

      const refund = await this.razorpay.payments.refund(paymentId, refundOptions);

      return refund;
    } catch (error) {
      logger.error(`Refund Processing Error: ${error.message}`);
      throw error;
    }
  }

  // Method to fetch payment details
  async getPaymentDetails(paymentId) {
    try {
      const paymentDetails = await this.razorpay.payments.fetch(paymentId);
      return paymentDetails;
    } catch (error) {
      logger.error(`Payment Details Fetch Error: ${error.message}`);
      throw error;
    }
  }

  // Getter for Razorpay instance (for advanced use cases)
  getRazorpayInstance() {
    if (!this.razorpay) {
      throw new Error('Razorpay not initialized');
    }
    return this.razorpay;
  }

  // Additional method for webhook signature verification
  verifyWebhookSignature(payload, signature, webhookSecret) {
    try {
      const generatedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      return generatedSignature === signature;
    } catch (error) {
      logger.error(`Webhook Signature Verification Error: ${error.message}`);
      throw error;
    }
  }
}

// Create a singleton instance
const paymentManager = new PaymentManager();

module.exports = paymentManager;