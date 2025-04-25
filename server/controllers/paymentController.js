const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/payment');
const Order = require('../models/order');
const mongoose = require('mongoose');

class PaymentController {
  constructor() {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.warn("RAZORPAY API keys are not configured in environment variables. Payment processing will fail.");
      this.razorpay = null;
    } else {
      this.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });
      console.log(`[PaymentController] Initialized with Razorpay key_id: ${process.env.RAZORPAY_KEY_ID.substring(0, 4)}...`);
    }
  }

  // Internal function for creating Razorpay order and Payment record
  async createRazorpayOrderInternal(amount, currency, internalOrderId, userId, session) {
    // Dynamic import of nanoid
    const { nanoid } = await import('nanoid');
    
    if (!this.razorpay) {
        throw new Error("Razorpay is not initialized. Check API keys.");
    }

    const amountInPaisa = Math.round(amount * 100); // Ensure amount is in paisa
    const uniqueReceiptId = nanoid(20); // Generate a 20-char unique ID

    const options = {
      amount: amountInPaisa,
      currency: currency || 'INR',
      receipt: `rcpt_${uniqueReceiptId}`, // Use the generated ID
      payment_capture: 1 // Auto capture payment
    };

    try {
        console.log(`[PaymentController] Creating Razorpay order for amount: ${amountInPaisa} ${currency || 'INR'}`);
        const razorpayOrder = await this.razorpay.orders.create(options);
        console.log(`[PaymentController] Razorpay order created: ${razorpayOrder.id}`);
        
        // Create Payment record in DB within the transaction
        const payment = new Payment({
          user: userId,
          order: internalOrderId, // Link to internal Order ID
          razorpayOrderId: razorpayOrder.id,
          amount: amountInPaisa, // Store amount in paisa
          currency: razorpayOrder.currency,
          status: 'created',
        });
        await payment.save({ session }); // Pass session if provided
        console.log(`[PaymentController] Payment record created: ${payment._id}`);

        return {
          paymentId: payment._id, // Internal Payment DB ID
          razorpayOrderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency
        };
    } catch (error) {
        console.error(`[PaymentController] Error creating Razorpay order internally: ${error.message}`, error);
        throw new Error(`Razorpay order creation failed: ${error.message}`);
    }
  }
  
  async verifyPayment(req, res) {
    console.log(`[PaymentController.verifyPayment] Starting payment verification`);
    
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error(`[PaymentController.verifyPayment] RAZORPAY_KEY_SECRET is not set!`);
      return res.status(500).json({ success: false, message: 'Payment configuration error' });
    }
    
    // Log request information for debugging
    console.log(`[PaymentController.verifyPayment] Request headers:`, {
      contentType: req.headers['content-type'],
      hasRazorpaySignature: !!req.headers['x-razorpay-signature']
    });
    console.log(`[PaymentController.verifyPayment] Request body type:`, typeof req.body);
    
    // ---------- SIGNATURE VERIFICATION LOGIC ----------
    const receivedSignature = req.headers['x-razorpay-signature'];
    let isValidSignature = false;
    let verificationSource = '';
    
    // Method 1: Webhook verification
    if (receivedSignature && req.body) {
      verificationSource = 'webhook';
      console.log(`[PaymentController.verifyPayment] Attempting webhook signature verification`);
      
      try {
        // For webhook verification, we need the raw body as a string
        let bodyData;
        if (typeof req.body === 'string') {
          bodyData = req.body;
        } else {
          bodyData = JSON.stringify(req.body);
        }
        
        const shasum = crypto.createHmac('sha256', secret);
        shasum.update(bodyData);
        const digest = shasum.digest('hex');
        
        console.log(`[PaymentController.verifyPayment] Webhook signature comparison:`, {
          calculated: digest,
          received: receivedSignature,
          match: digest === receivedSignature
        });
        
        isValidSignature = (digest === receivedSignature);
      } catch (error) {
        console.error(`[PaymentController.verifyPayment] Webhook signature verification error:`, error);
      }
    } 
    // Method 2: Frontend verification
    else {
      verificationSource = 'frontend';
      console.log(`[PaymentController.verifyPayment] Attempting frontend signature verification`);
      
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      
      console.log(`[PaymentController.verifyPayment] Frontend verification data:`, { 
        razorpay_order_id, 
        razorpay_payment_id, 
        hasSignature: !!razorpay_signature 
      });
      
      if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
        try {
          const hmac = crypto.createHmac('sha256', secret);
          const data = `${razorpay_order_id}|${razorpay_payment_id}`;
          hmac.update(data);
          const generated_signature = hmac.digest('hex');
          
          console.log(`[PaymentController.verifyPayment] Frontend signature comparison:`, {
            data: data,
            calculated: generated_signature,
            received: razorpay_signature,
            match: generated_signature === razorpay_signature
          });
          
          isValidSignature = (generated_signature === razorpay_signature);
        } catch (error) {
          console.error(`[PaymentController.verifyPayment] Frontend signature verification error:`, error);
        }
      } else {
        console.error(`[PaymentController.verifyPayment] Missing required verification parameters`);
      }
    }

    // Send early response if signature is invalid
    if (!isValidSignature) {
      console.warn(`[PaymentController.verifyPayment] Invalid Razorpay signature received from ${verificationSource}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid payment signature',
        source: verificationSource 
      });
    }
    
    console.log(`[PaymentController.verifyPayment] Signature verification successful from ${verificationSource}`);
    
    // ---------- TRANSACTION PROCESSING LOGIC ----------
    // Determine if we should use transactions
    const useTransactions = process.env.NODE_ENV !== 'development';
    let session = null;

    if (useTransactions) {
      session = await mongoose.startSession();
      session.startTransaction();
      console.log(`[PaymentController.verifyPayment] Starting verification transaction`);
    } else {
      console.log(`[PaymentController.verifyPayment] Skipping transactions (NODE_ENV=${process.env.NODE_ENV})`);
    }
    
    const saveOptions = session ? { session } : {}; // Options for save/update operations

    try {
      // Extract payment data
      let paymentData, razorpayOrderId, razorpayPaymentId, paymentStatus, amountPaid, currency;
      
      if (verificationSource === 'webhook') {
        // Extract from webhook payload
        paymentData = req.body?.payload?.payment?.entity;
        razorpayOrderId = paymentData?.order_id;
        razorpayPaymentId = paymentData?.id;
        paymentStatus = paymentData?.status;
        amountPaid = paymentData?.amount;
        currency = paymentData?.currency;
      } else {
        // Extract from frontend request
        razorpayOrderId = req.body.razorpay_order_id;
        razorpayPaymentId = req.body.razorpay_payment_id;
        paymentStatus = 'captured'; // Default for frontend callback
      }
      
      console.log(`[PaymentController.verifyPayment] Extracted payment data:`, {
        razorpayOrderId,
        razorpayPaymentId,
        paymentStatus
      });

      if (!razorpayOrderId) {
        if (useTransactions && session?.inTransaction()) await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'Razorpay Order ID missing' });
      }

      // Find the corresponding Payment record in your DB
      const payment = await Payment.findOne({ razorpayOrderId: razorpayOrderId }).session(session);
      if (!payment) {
        console.error(`[PaymentController.verifyPayment] Payment record not found for Razorpay Order ID: ${razorpayOrderId}`);
        if (useTransactions && session?.inTransaction()) await session.abortTransaction();
        // Acknowledge webhook, maybe return 404 for frontend
        return res.status(receivedSignature ? 200 : 404).json({
          success: !!receivedSignature, // True for webhook ack, false for frontend
          message: receivedSignature ? 'Acknowledged (Payment record not found)' : 'Payment record not found'
        });
      }
      
      console.log(`[PaymentController.verifyPayment] Found payment record: ${payment._id}, current status: ${payment.status}`);

      // Check if already processed
      if (payment.status === 'captured' || payment.status === 'failed') {
        console.log(`[PaymentController.verifyPayment] Payment ${payment._id} already processed with status: ${payment.status}`);
        if (useTransactions && session?.inTransaction()) await session.commitTransaction();
        return res.status(200).json({ success: true, message: 'Payment already processed' });
      }

      // Update Payment record
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.razorpaySignature = receivedSignature || req.body.razorpay_signature;
      payment.status = paymentStatus || 'captured'; // Default to captured if not provided
      // Store more details from paymentData if needed
      if (amountPaid) payment.amountPaid = amountPaid;
      await payment.save(saveOptions);
      
      console.log(`[PaymentController.verifyPayment] Updated payment record with status: ${payment.status}`);

      // Find and Update associated Order
      const order = await Order.findById(payment.order).session(session);
      if (!order) {
        console.error(`[PaymentController.verifyPayment] Order not found for Payment ID: ${payment._id}, Razorpay Order: ${razorpayOrderId}`);
        if (useTransactions && session?.inTransaction()) await session.abortTransaction();
        return res.status(404).json({ success: false, message: 'Associated order not found' });
      }
      
      console.log(`[PaymentController.verifyPayment] Found order: ${order._id}, current status: ${order.status}`);

      // Update order status based on payment status
      if (paymentStatus === 'captured' || paymentStatus === 'authorized') {
        order.paymentStatus = 'paid';
        order.status = 'confirmed';
        
        // Create Delivery record if needed
        // Create Delivery record if needed
if (!order.delivery) {
  console.log(`[PaymentController.verifyPayment] Creating delivery record for order ${order._id}`);
  const Delivery = require('../models/delivery'); // Ensure Delivery model is required
  const delivery = new Delivery({
    order: order._id,
    user: order.user,
    status: 'pending_assignment',
    deliveryAddress: order.shippingAddress,
    // FIX: Properly define currentLocation with coordinates
    currentLocation: {
      type: "Point",
      coordinates: [0, 0] // Default coordinates (longitude, latitude)
    }
  });
  await delivery.save(saveOptions);
  order.delivery = delivery._id;
}
      } else if (paymentStatus === 'failed') {
        order.paymentStatus = 'failed';
        order.status = 'failed';
      }

      // Update order's paymentDetails
      order.paymentDetails = {
        ...order.paymentDetails,
        paymentId: payment._id,
        razorpayPaymentId: razorpayPaymentId
      };
      await order.save(saveOptions);
      
      console.log(`[PaymentController.verifyPayment] Updated order to status: ${order.status}`);

      // Commit transaction if we started one
      if (useTransactions && session) {
        await session.commitTransaction();
        console.log(`[PaymentController.verifyPayment] Verification transaction committed`);
      }

      // Respond appropriately based on verification source
      if (verificationSource === 'webhook') {
        res.status(200).json({ success: true, message: 'Webhook processed successfully' });
      } else {
        res.status(200).json({
          success: true,
          message: 'Payment verified successfully',
          orderId: order._id,
          status: order.status
        });
      }

    } catch (error) {
      console.error(`[PaymentController.verifyPayment] Error processing payment:`, error);
      // Abort transaction if we started one and it's still active
      if (useTransactions && session?.inTransaction()) {
        await session.abortTransaction();
        console.log(`[PaymentController.verifyPayment] Verification transaction aborted due to error`);
      }
      res.status(500).json({ 
        success: false, 
        message: 'Error verifying payment', 
        error: error.message 
      });
    } finally {
      // End session if we started one
      if (session) {
        await session.endSession();
        console.log(`[PaymentController.verifyPayment] Session ended`);
      }
      console.log(`[PaymentController.verifyPayment] Verification process finished`);
    }
  }

  // Get payment details by ID
  async getPaymentById(req, res) {
    try {
      const paymentId = req.params.id;
      console.log(`[PaymentController.getPaymentById] Fetching payment: ${paymentId}`);
      
      const payment = await Payment.findById(paymentId)
        .populate('user', 'name email')
        .populate('order');
        
      if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
      }
      
      res.status(200).json({ success: true, payment });
    } catch (error) {
      console.error(`[PaymentController.getPaymentById] Error:`, error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
  
  // Process refund
  async processRefund(req, res) {
    if (!this.razorpay) {
      return res.status(500).json({ success: false, message: 'Razorpay is not initialized' });
    }
    
    const { paymentId, amount, notes } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({ success: false, message: 'Payment ID is required' });
    }
    
    let session = null;
    const useTransactions = process.env.NODE_ENV !== 'development';
    
    if (useTransactions) {
      session = await mongoose.startSession();
      session.startTransaction();
    }
    
    try {
      console.log(`[PaymentController.processRefund] Processing refund for payment: ${paymentId}`);
      
      // Find the payment record
      const payment = await Payment.findById(paymentId).session(session);
      if (!payment) {
        if (useTransactions && session) await session.abortTransaction();
        return res.status(404).json({ success: false, message: 'Payment record not found' });
      }
      
      if (!payment.razorpayPaymentId) {
        if (useTransactions && session) await session.abortTransaction();
        return res.status(400).json({ 
          success: false, 
          message: 'This payment cannot be refunded (missing Razorpay payment ID)' 
        });
      }
      
      // Determine refund amount
      const refundAmount = amount ? Math.round(amount * 100) : payment.amount; // Convert to paisa if provided
      
      // Process refund through Razorpay
      const refundOptions = {
        payment_id: payment.razorpayPaymentId,
        amount: refundAmount,
        notes: notes || { reason: 'Customer requested refund' }
      };
      
      console.log(`[PaymentController.processRefund] Sending refund request to Razorpay:`, {
        payment_id: payment.razorpayPaymentId,
        amount: refundAmount
      });
      
      const razorpayRefund = await this.razorpay.payments.refund(refundOptions);
      
      // Update payment record
      payment.refunds = payment.refunds || [];
      payment.refunds.push({
        refundId: razorpayRefund.id,
        amount: razorpayRefund.amount,
        status: razorpayRefund.status,
        createdAt: new Date(),
        notes: notes
      });
      
      // Update status if full refund
      if (refundAmount === payment.amount) {
        payment.status = 'refunded';
      } else {
        payment.status = 'partially_refunded';
      }
      
      await payment.save({ session });
      
      // Update the order status if needed
      const order = await Order.findById(payment.order).session(session);
      if (order) {
        // Update order status based on refund
        if (refundAmount === payment.amount) {
          order.paymentStatus = 'refunded';
          if (order.status !== 'cancelled') {
            order.status = 'refunded';
          }
        } else {
          order.paymentStatus = 'partially_refunded';
        }
        
        await order.save({ session });
      }
      
      // Commit transaction
      if (useTransactions && session) {
        await session.commitTransaction();
      }
      
      console.log(`[PaymentController.processRefund] Refund processed successfully: ${razorpayRefund.id}`);
      
      res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        refund: razorpayRefund
      });
      
    } catch (error) {
      console.error(`[PaymentController.processRefund] Error:`, error);
      
      // Abort transaction if needed
      if (useTransactions && session?.inTransaction()) {
        await session.abortTransaction();
      }
      
      res.status(500).json({
        success: false,
        message: 'Error processing refund',
        error: error.message
      });
    } finally {
      // End session if started
      if (session) {
        await session.endSession();
      }
    }
  }
  
  // Get payment history for user
  async getUserPaymentHistory(req, res) {
    try {
      const userId = req.user._id; // Assuming req.user is set by auth middleware
      
      console.log(`[PaymentController.getUserPaymentHistory] Fetching payments for user: ${userId}`);
      
      const payments = await Payment.find({ user: userId })
        .populate('order', 'orderNumber status createdAt totalAmount')
        .sort({ createdAt: -1 });
        
      res.status(200).json({
        success: true,
        count: payments.length,
        payments
      });
    } catch (error) {
      console.error(`[PaymentController.getUserPaymentHistory] Error:`, error);
      res.status(500).json({
        success: false,
        message: 'Error fetching payment history',
        error: error.message
      });
    }
  }
}

module.exports = PaymentController;