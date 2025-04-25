const Delivery = require('../models/delivery');
const Order = require('../models/order');
const User = require('../models/User'); // Assuming driver is a user
const mongoose = require('mongoose');
const crypto = require('crypto');
const nodemailer = require('nodemailer'); // If sending OTP via email

class DeliveryController {

    // --- OTP Generation ---
    static generateOTP() {
        return crypto.randomInt(100000, 999999).toString(); // 6-digit OTP
    }

    // --- Send OTP (Example: Email) ---
    static async sendOtpEmail(email, otp) {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn("Email credentials not set. Cannot send OTP email.");
            throw new Error("Email service not configured for sending OTP.");
        }
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail', // Or your email provider
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });

            await transporter.sendMail({
                from: `"Your App Name" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Your Delivery Verification Code',
                text: `Your delivery OTP is: ${otp}. It will expire in 5 minutes.`,
                html: `<p>Your delivery OTP is: <strong>${otp}</strong>. It will expire in 5 minutes.</p>`,
            });
            console.log(`OTP email sent to ${email}`);
        } catch (error) {
            console.error('Error sending OTP email:', error);
            throw new Error('Failed to send verification code via email.'); // Let caller handle
        }
    }

    // --- Generate and Store OTP for a Delivery ---
    async requestDeliveryOTP(req, res) {
        const { deliveryId } = req.params; // Get delivery ID from route params
        const userId = req.user._id; // User requesting OTP (should be the recipient)

        if (!mongoose.Types.ObjectId.isValid(deliveryId)) {
            return res.status(400).json({ success: false, message: 'Invalid delivery ID format' });
        }

        try {
            const delivery = await Delivery.findById(deliveryId).populate('user', 'email name'); // Populate user email
            if (!delivery) {
                return res.status(404).json({ success: false, message: 'Delivery record not found' });
            }

            // Authorization check: Ensure the request is from the correct user
            if (delivery.user._id.toString() !== userId.toString()) {
                 console.warn(`Unauthorized OTP request attempt by user ${userId} for delivery ${deliveryId} belonging to ${delivery.user._id}`);
                 return res.status(403).json({ success: false, message: 'You are not authorized to request OTP for this delivery.' });
            }

            // Check if delivery status allows OTP generation (e.g., 'out_for_delivery')
             if (delivery.status !== 'out_for_delivery') {
                return res.status(400).json({ success: false, message: `Cannot generate OTP when delivery status is '${delivery.status}'` });
            }
             if (delivery.otpVerified) {
                return res.status(400).json({ success: false, message: 'Delivery OTP has already been verified.' });
            }

            const otp = DeliveryController.generateOTP();
            const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

            // Update delivery record with OTP
            delivery.otp = {
                code: otp,
                expiresAt: expiryTime
            };
             delivery.otpVerified = false; // Ensure it's reset if re-requested

            await delivery.save();

            // Send OTP to user (e.g., via email)
            if (delivery.user && delivery.user.email) {
                 try {
                     await DeliveryController.sendOtpEmail(delivery.user.email, otp);
                 } catch (emailError) {
                      console.error(`Failed to send OTP email for delivery ${deliveryId}: ${emailError.message}`);
                 }
            } else {
                 console.warn(`Cannot send OTP email for delivery ${deliveryId}: User email not found.`);
            }

            res.status(200).json({ success: true, message: 'OTP generated and sent successfully.' }); // Don't send OTP in response

        } catch (error) {
            console.error('Error requesting delivery OTP:', error);
            res.status(500).json({ success: false, message: 'Failed to generate delivery OTP', error: error.message });
        }
    }

    // --- Verify Delivery OTP ---
    async verifyDeliveryOTP(req, res) {
        const { deliveryId } = req.params;
        const { otp } = req.body;
        const driverId = req.user._id; // Assuming the request comes from the logged-in driver

        if (!mongoose.Types.ObjectId.isValid(deliveryId)) {
            return res.status(400).json({ success: false, message: 'Invalid delivery ID format' });
        }
         if (!otp || typeof otp !== 'string' || otp.length !== 6) {
            return res.status(400).json({ success: false, message: 'Invalid OTP format. Must be a 6-digit string.' });
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const delivery = await Delivery.findById(deliveryId).populate('order').session(session);
            if (!delivery) {
                await session.abortTransaction();
                return res.status(404).json({ success: false, message: 'Delivery record not found' });
            }

            // Authorization: Ensure the driver making the request is assigned to this delivery
             if (!delivery.driver || delivery.driver.toString() !== driverId.toString()) {
                 await session.abortTransaction();
                 console.warn(`Unauthorized OTP verification attempt by driver ${driverId} for delivery ${deliveryId} assigned to ${delivery.driver}`);
                 return res.status(403).json({ success: false, message: 'You are not assigned to this delivery.' });
             }

            // Check current status - e.g., must be 'out_for_delivery'
             if (delivery.status !== 'out_for_delivery') {
                 await session.abortTransaction();
                 return res.status(400).json({ success: false, message: `Cannot verify OTP when delivery status is '${delivery.status}'` });
             }

            if (!delivery.otp || !delivery.otp.code || !delivery.otp.expiresAt) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: 'OTP has not been generated for this delivery.' });
            }

            if (new Date() > delivery.otp.expiresAt) {
                // Clear expired OTP
                 delivery.otp = undefined;
                 await delivery.save({session});
                 await session.commitTransaction(); // Commit the OTP clear
                return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
            }

            if (delivery.otp.code !== otp) {
                await session.abortTransaction(); // Don't commit if OTP is wrong
                return res.status(400).json({ success: false, message: 'Invalid OTP.' });
            }

            // --- OTP is Correct ---
            delivery.otpVerified = true;
            delivery.status = 'delivered'; // Update status to delivered
            delivery.actualDeliveryTime = new Date();
            // delivery.otp = undefined; // Clear OTP after successful verification

            await delivery.save({ session });

            // Update the associated Order status
            if (delivery.order) {
                const order = delivery.order;
                await Order.findByIdAndUpdate(order._id,
                    { status: 'delivered', paymentStatus: (order.paymentMethod === 'cod' ? 'paid' : order.paymentStatus) }, // Mark COD as paid on delivery
                    { session }
                );
            } else {
                console.warn(`Could not update order status for delivery ${deliveryId} as order was not populated or link is broken.`);
            }

            await session.commitTransaction();

            res.status(200).json({ success: true, message: 'Delivery confirmed successfully!' });

        } catch (error) {
            await session.abortTransaction();
            console.error('Error verifying delivery OTP:', error);
            res.status(500).json({ success: false, message: 'Failed to verify OTP', error: error.message });
        } finally {
             session.endSession();
        }
    }

    // --- Get Delivery Status by Order ID ---
    async getDeliveryStatusByOrderId(req, res) {
        const { orderId } = req.params;
         const userId = req.user._id; // Assuming user is fetching their own delivery status

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: 'Invalid order ID format' });
        }

        try {
            // Find the order first to check ownership
            const order = await Order.findOne({ _id: orderId, user: userId });
             if (!order) {
                 // Even if delivery exists, if order doesn't match user, deny access
                 return res.status(404).json({ success: false, message: 'Order not found or you are not authorized.' });
             }

            const delivery = await Delivery.findOne({ order: orderId })
                .populate('driver', 'name contact'); // Populate basic driver info if needed

            if (!delivery) {
                 // If order exists but no delivery record yet, return appropriate status
                return res.status(200).json({
                    success: true,
                    status: 'processing', // Or based on order status
                    message: 'Delivery record not yet created. Order is likely processing.',
                    data: { status: order.status } // Return order status
                 });
            }

            // Return relevant delivery details
            res.status(200).json({
                success: true,
                data: {
                    deliveryId: delivery._id,
                    status: delivery.status,
                    trackingNumber: delivery.trackingNumber,
                    estimatedDeliveryTime: delivery.estimatedDeliveryTime,
                    actualDeliveryTime: delivery.actualDeliveryTime,
                    currentLocation: delivery.currentLocation,
                    driver: delivery.driver ? { name: delivery.driver.name, contact: delivery.driver.contact } : null,
                    otpRequired: delivery.status === 'out_for_delivery' && !delivery.otpVerified, // Indicate if OTP needed now
                    otpVerified: delivery.otpVerified
                }
            });

        } catch (error) {
            console.error('Error fetching delivery status by order ID:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch delivery status', error: error.message });
        }
    }

    // --- Update Driver Location (Called by Driver App/Device) ---
    async updateDriverLocation(req, res) {
        const driverId = req.user._id; // Driver making the update
        const { deliveryId } = req.params; // The specific delivery they are updating location for
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ success: false, message: 'Latitude and longitude are required.' });
        }
        if (!mongoose.Types.ObjectId.isValid(deliveryId)) {
            return res.status(400).json({ success: false, message: 'Invalid delivery ID format' });
        }

        try {
            const delivery = await Delivery.findById(deliveryId);
            if (!delivery) {
                return res.status(404).json({ success: false, message: 'Delivery not found.' });
            }

            // Authorization: Check if the updater is the assigned driver
             if (!delivery.driver || delivery.driver.toString() !== driverId.toString()) {
                 return res.status(403).json({ success: false, message: 'You are not assigned to this delivery.' });
             }

            // Check if delivery is in a trackable state
             const trackableStatuses = ['assigned', 'out_for_delivery'];
             if (!trackableStatuses.includes(delivery.status)) {
                 return res.status(400).json({ success: false, message: `Cannot update location for delivery status: ${delivery.status}` });
             }

            delivery.currentLocation = {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)],
                timestamp: new Date()
            };

            await delivery.save();

            // TODO: Broadcast location update via WebSockets to the customer?
             // io.to(`order_${delivery.order}`).emit('driverLocationUpdate', delivery.currentLocation);

            res.status(200).json({ success: true, message: 'Location updated.' });

        } catch (error) {
            console.error(`Error updating driver location for delivery ${deliveryId}:`, error);
            res.status(500).json({ success: false, message: 'Failed to update location', error: error.message });
        }
    }

    // --- Create a new delivery ---
    async createDelivery(req, res) {
        const { orderId, deliveryAddress } = req.body;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: 'Invalid order ID format' });
        }

        try {
            // Check if order exists and belongs to this user
            const order = await Order.findOne({ _id: orderId, user: userId });
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found or you are not authorized' });
            }

            // Check if delivery already exists for this order
            const existingDelivery = await Delivery.findOne({ order: orderId });
            if (existingDelivery) {
                return res.status(400).json({ success: false, message: 'Delivery already exists for this order' });
            }

            // Create a new delivery
            const delivery = new Delivery({
                order: orderId,
                user: userId,
                deliveryAddress: deliveryAddress || order.shippingAddress,
                estimatedDeliveryTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
            });

            await delivery.save();

            res.status(201).json({
                success: true,
                message: 'Delivery created successfully',
                data: {
                    deliveryId: delivery._id,
                    trackingNumber: delivery.trackingNumber,
                    status: delivery.status,
                    estimatedDeliveryTime: delivery.estimatedDeliveryTime
                }
            });

        } catch (error) {
            console.error('Error creating delivery:', error);
            res.status(500).json({ success: false, message: 'Failed to create delivery', error: error.message });
        }
    }

    // --- Get user's deliveries ---
    async getUserDeliveries(req, res) {
        const userId = req.user._id;

        try {
            const deliveries = await Delivery.find({ user: userId })
                .populate('order', 'orderNumber totalAmount items')
                .sort({ createdAt: -1 });

            res.status(200).json({
                success: true,
                count: deliveries.length,
                data: deliveries
            });

        } catch (error) {
            console.error('Error fetching user deliveries:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch deliveries', error: error.message });
        }
    }

    // --- Get delivery by ID ---
    async getDeliveryById(req, res) {
        const { id } = req.params;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid delivery ID format' });
        }

        try {
            const delivery = await Delivery.findById(id)
                .populate('order', 'orderNumber totalAmount items')
                .populate('driver', 'name contact');

            if (!delivery) {
                return res.status(404).json({ success: false, message: 'Delivery not found' });
            }

            // Check authorization - user must be the recipient or admin
            if (delivery.user.toString() !== userId.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'You are not authorized to view this delivery' });
            }

            res.status(200).json({
                success: true,
                data: delivery
            });

        } catch (error) {
            console.error('Error fetching delivery by ID:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch delivery', error: error.message });
        }
    }

    // --- Admin: Update delivery status ---
    async updateDeliveryStatus(req, res) {
        const { id } = req.params;
        const { status, driverId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid delivery ID format' });
        }

        try {
            const delivery = await Delivery.findById(id);
            if (!delivery) {
                return res.status(404).json({ success: false, message: 'Delivery not found' });
            }

            // Update status
            delivery.status = status;

            // If assigning a driver
            if (driverId && status === 'assigned') {
                if (!mongoose.Types.ObjectId.isValid(driverId)) {
                    return res.status(400).json({ success: false, message: 'Invalid driver ID format' });
                }

                // Verify driver exists
                const driver = await User.findOne({ _id: driverId, role: 'driver' });
                if (!driver) {
                    return res.status(404).json({ success: false, message: 'Driver not found' });
                }

                delivery.driver = driverId;
            }

            await delivery.save();

            res.status(200).json({
                success: true,
                message: 'Delivery status updated successfully',
                data: { status: delivery.status }
            });

        } catch (error) {
            console.error('Error updating delivery status:', error);
            res.status(500).json({ success: false, message: 'Failed to update delivery status', error: error.message });
        }
    }

    // --- Admin: Get all deliveries ---
    async getAllDeliveries(req, res) {
        try {
            const deliveries = await Delivery.find()
                .populate('order', 'orderNumber totalAmount')
                .populate('user', 'name email')
                .populate('driver', 'name contact')
                .sort({ createdAt: -1 });

            res.status(200).json({
                success: true,
                count: deliveries.length,
                data: deliveries
            });

        } catch (error) {
            console.error('Error fetching all deliveries:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch deliveries', error: error.message });
        }
    }
}

module.exports = new DeliveryController();