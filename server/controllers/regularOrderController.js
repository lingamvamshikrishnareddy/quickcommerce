const Order = require('../models/order');
const CartService = require('../services/cart.service');
const Product = require('../models/product');
const Payment = require('../models/payment'); // Keep if needed elsewhere, but not directly used in createOrder logic now
const Delivery = require('../models/delivery');
const mongoose = require('mongoose');
const PaymentController = require('./paymentController'); // Import the class
const paymentControllerInstance = new PaymentController(); // Create an instance ONCE
const DeliveryController = require('./DeliveryController'); // Keep if needed elsewhere

class OrderController {

    async createOrder(req, res) {
        // --- Conditional Transaction Logic ---
        const useTransactions = process.env.NODE_ENV !== 'development';
        let session = null;
        if (useTransactions) {
            session = await mongoose.startSession();
            session.startTransaction();
            console.log(`[OrderController Opt1] Starting order creation transaction.`);
        } else {
            console.log(`[OrderController Opt1] Skipping transactions (NODE_ENV=${process.env.NODE_ENV}).`);
        }
        // --- End Conditional Transaction Logic ---
    
        try {
            const userId = req.user._id;
            console.log(`[OrderController Opt1] User ID: ${userId}`);
    
            const {
                shippingAddress,
                paymentMethod,
                deliveryInstructions
            } = req.body;
    
            console.log(`[OrderController Opt1] Request details: Payment=${paymentMethod}, Shipping Address Present=${!!shippingAddress}`);
    
            if (!shippingAddress || !paymentMethod) {
                if (useTransactions && session?.inTransaction()) await session.abortTransaction();
                console.log(`[OrderController Opt1] Aborted: Missing shippingAddress or paymentMethod.`);
                return res.status(400).json({ success: false, message: 'Shipping address and payment method are required' });
            }
    
            // 1. Validate cart - Uses Refactored CartService (Option 1 style)
            console.log(`[OrderController Opt1] Validating cart...`);
            // Note: validateCart now returns { cart, isValid, invalidItems, validPlainItems }
            const { cart, isValid, invalidItems, validPlainItems } = await CartService.validateCart(userId);
    
            console.log(`[OrderController Opt1] Validation result: isValid=${isValid}, Valid Plain Items Count=${validPlainItems?.length || 0}, Invalid Items Count=${invalidItems.length}`);
    
            // Check if cart has valid items AFTER validation based on validPlainItems
            if (!isValid || !validPlainItems || validPlainItems.length === 0) {
                if (useTransactions && session?.inTransaction()) await session.abortTransaction();
                console.log(`[OrderController Opt1] Aborted: Cart empty or invalid after validation.`);
                return res.status(400).json({
                    success: false,
                    message: invalidItems.length > 0 ? 'Your cart contains invalid or unavailable items.' : 'Your cart is empty.',
                    details: invalidItems.length > 0 ? 'Some items were removed during validation.' : 'No valid items found to proceed.',
                    userId: userId,
                    cartId: cart?._id?.toString() || 'unknown',
                    invalidItems: invalidItems // Return details about invalid items
                });
            }
    
            // --- Stock Availability Check - Use validPlainItems ---
            console.log("[OrderController Opt1] Checking stock availability using validated plain items...");
            let insufficientStockItems = [];
    
            // Iterate through the VALIDATED PLAIN items
            for (const plainItem of validPlainItems) {
                const product = plainItem.populatedProduct; // Access populated data from plain item
    
                if (!product || typeof product !== 'object') {
                    console.error(`[Stock Check Opt1] CRITICAL ERROR: populatedProduct missing for VALIDATED plainItem ${plainItem._id}. Cannot check stock.`);
                    insufficientStockItems.push({ itemId: plainItem._id, title: plainItem.productName, reason: "Product data error after validation" });
                    continue; // Skip this item, but flag as issue
                }
    
                const productReferenceId = product._original_id || product._id;
                const currentStock = product.stock ?? 0;
    
                console.log(`[Stock Check Opt1] Product: ${product.title} (Ref: ${productReferenceId}), Required: ${plainItem.quantity}, Available: ${currentStock}`);
                if (currentStock < plainItem.quantity) {
                    insufficientStockItems.push({
                        itemId: plainItem._id, productRef: productReferenceId, title: product.title || plainItem.productName,
                        requested: plainItem.quantity, available: currentStock, reason: "Insufficient stock"
                    });
                }
            }
    
            if (insufficientStockItems.length > 0) {
                console.error("[OrderController Opt1] Aborted due to insufficient stock:", insufficientStockItems);
                if (useTransactions && session?.inTransaction()) await session.abortTransaction();
                return res.status(400).json({ success: false, message: "One or more items have insufficient stock.", error: "Insufficient Stock", details: insufficientStockItems });
            }
            console.log("[OrderController Opt1] Stock availability check passed.");
            // --- END: Stock Availability Check ---
    
            // --- Prepare order items - Use validPlainItems ---
            console.log(`[OrderController Opt1] Preparing order items using validated plain items...`);
            const orderItems = [];
            // Iterate through the VALIDATED PLAIN items again
            for (const plainItem of validPlainItems) {
                const product = plainItem.populatedProduct; // Access populated data
    
                if (!product || typeof product !== 'object') {
                    console.error(`[Order Items Opt1] CRITICAL: populatedProduct missing for plainItem ${plainItem._id}.`);
                    throw new Error(`Inconsistent state: Validated item ${plainItem._id} missing product data.`);
                }
                // Use the canonical ID from the populated product OR the plainItem's product field (which should have been corrected by validateCart)
                const productReferenceId = product._original_id || product._id || plainItem.product;
                if (!productReferenceId) {
                    console.error(`[Order Items Opt1] CRITICAL: Product for plainItem ${plainItem._id} missing reference ID.`);
                    throw new Error(`Inconsistent state: Product for item ${plainItem._id} lacks ID.`);
                }
    
                console.log(`[Order Items Opt1] Adding: ${product.title} (Ref: ${productReferenceId}), Qty: ${plainItem.quantity}`);
                orderItems.push({
                    product: productReferenceId, // <<< Use canonical ID
                    quantity: plainItem.quantity,
                    price: plainItem.price, // Use price from plain item (potentially updated)
                    productSnapshot: { // Create snapshot from populated product data
                        name: product.title || product.name || 'N/A',
                        slug: product.slug,
                        sku: product.sku, // Ensure sku is selected in getCart if needed
                        imageUrl: (product.images && product.images.length > 0) ? product.images[0].url : null
                    },
                    variation: plainItem.variation // Use variation from plain item
                });
            }
            if (orderItems.length === 0) {
                // Should not happen if validation passed, but safeguard
                if (useTransactions && session?.inTransaction()) await session.abortTransaction();
                console.error(`[OrderController Opt1] No order items created despite validation passing.`);
                return res.status(500).json({ success: false, message: 'Internal error preparing order items.' });
            }
            // --- END: Prepare order items ---
    
            // --- Calculate totals based on the prepared orderItems ---
            const orderTotal = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
            const deliveryCharge = orderTotal > 500 ? 0 : 40; // Example logic
            const handlingCharge = 5; // Example logic
            const grandTotal = orderTotal + deliveryCharge + handlingCharge;
            console.log(`[OrderController Opt1] Calculated Totals: Subtotal=${orderTotal}, Delivery=${deliveryCharge}, Handling=${handlingCharge}, GrandTotal=${grandTotal}`);
    
            // --- Pass session conditionally ---
            const saveOptions = useTransactions && session ? { session } : {};
    
            // 3. Create the Order document
            const order = new Order({
                user: userId,
                items: orderItems, // Use the prepared items array
                totalAmount: grandTotal,
                subTotal: orderTotal,
                shippingCost: deliveryCharge,
                handlingCost: handlingCharge,
                shippingAddress: shippingAddress,
                paymentMethod: paymentMethod,
                paymentStatus: 'pending',
                deliveryInstructions: deliveryInstructions,
                status: 'pending'
            });
    
            await order.save(saveOptions);
            console.log(`[OrderController Opt1] Order document created with ID: ${order._id}`);
    
            // 4. Handle Payment
            let paymentResponse = null;
            if (paymentMethod === 'razorpay') {
                try {
                    console.log(`[OrderController Opt1] Creating Razorpay order`);
                    const razorpayOrderResponse = await paymentControllerInstance.createRazorpayOrderInternal(
                        order.totalAmount, 'INR', order._id, userId, session
                    );
                    order.paymentDetails = {
                        paymentId: razorpayOrderResponse.paymentId,
                        razorpayOrderId: razorpayOrderResponse.razorpayOrderId
                    };
                    await order.save(saveOptions); // Save updated order with payment details
                    paymentResponse = { /* ... razorpay details ... */
                        paymentRequired: true,
                        razorpayOrderId: razorpayOrderResponse.razorpayOrderId,
                        amount: razorpayOrderResponse.amount,
                        currency: razorpayOrderResponse.currency,
                        key: process.env.RAZORPAY_KEY_ID,
                        prefill: { name: req.user.name || '', email: req.user.email || '', contact: shippingAddress.phone || '' },
                        notes: { internalOrderId: order._id.toString() }
                    };
                    console.log(`[OrderController Opt1] Razorpay order created: ${razorpayOrderResponse.razorpayOrderId}`);
                } catch (paymentError) {
                    console.error("[OrderController Opt1] Razorpay order creation failed:", paymentError);
                    if (useTransactions && session?.inTransaction()) await session.abortTransaction();
                    return res.status(500).json({ success: false, message: 'Failed to initiate payment.', error: paymentError.message });
                }
            } else if (paymentMethod === 'cod') {
                order.paymentStatus = 'pending';
                order.status = 'confirmed';
                await order.save(saveOptions);
                paymentResponse = { paymentRequired: false };
                console.log(`[OrderController Opt1] COD order ${order._id} status set to confirmed.`);
            } else {
                if (useTransactions && session?.inTransaction()) await session.abortTransaction();
                console.log(`[OrderController Opt1] Aborted: Invalid payment method ${paymentMethod}.`);
                return res.status(400).json({ success: false, message: 'Invalid payment method' });
            }
    
            // 5. Update Product Stock using default _id and findByIdAndUpdate
            // 5. Update Product Stock - Improved with Better Error Handling and Multiple Lookup Strategies
if (order.status === 'confirmed' || (paymentMethod === 'razorpay' && paymentResponse?.paymentRequired)) {
    console.log(`[OrderController Opt1] Updating stock...`);
    const stockUpdatePromises = orderItems.map(async orderItem => {
        const productId = orderItem.product;
        console.log(`[Stock Update Opt1] Decrementing stock for Product ID: ${productId} by ${orderItem.quantity}`);
        
        try {
            // Try findOneAndUpdate with both _id and _original_id for more reliable lookup
            const updatedProduct = await Product.findOneAndUpdate(
                { $or: [{ _id: productId }, { _original_id: productId }] },
                { $inc: { stock: -orderItem.quantity } },
                { ...saveOptions, new: true }
            ).exec();
            
            if (!updatedProduct) {
                // As a fallback, try to find the product by other means (similar to CartService)
                console.warn(`[Stock Update Opt1] Product not found by ID. Trying slug lookup...`);
                
                // Get product info from the order item, if available
                const productSnapshot = orderItem.productSnapshot || {};
                const productSlug = productSnapshot.slug;
                
                let fallbackProduct = null;
                if (productSlug) {
                    fallbackProduct = await Product.findOneAndUpdate(
                        { slug: productSlug },
                        { $inc: { stock: -orderItem.quantity } },
                        { ...saveOptions, new: true }
                    ).exec();
                }
                
                if (!fallbackProduct) {
                    throw new Error(`Failed to update stock for product ${productId}. Product may have been deleted or its ID changed.`);
                }
                
                console.log(`[Stock Update Opt1] Success using fallback for ${productId}. New stock: ${fallbackProduct.stock}`);
                return fallbackProduct;
            }
            
            if (updatedProduct.stock < 0) {
                console.warn(`[Stock Update Opt1] Warning: Stock negative for ${productId}: ${updatedProduct.stock}`);
            }
            
            console.log(`[Stock Update Opt1] Success for ${productId}. New stock: ${updatedProduct.stock}`);
            return updatedProduct;
        } catch (err) {
            console.error(`[Stock Update Opt1] Error for ${productId}:`, err);
            throw err;
        }
    });
    
    try {
        await Promise.all(stockUpdatePromises);
        console.log(`[OrderController Opt1] Stock updates complete.`);
    } catch (stockError) {
        // Handle stock update errors more gracefully
        console.error(`[OrderController Opt1] Stock update failed:`, stockError);
        
        // Decide whether to abort the transaction or continue
        if (useTransactions && session?.inTransaction()) {
            await session.abortTransaction();
            console.log(`[OrderController Opt1] Transaction aborted due to stock update failure.`);
        }
        
        throw new Error(`Order created but stock update failed: ${stockError.message}`);
    }
} else {
    console.log(`[OrderController Opt1] Stock update deferred for order ${order._id}.`);
}
    
            // 6. Clear User's Cart (use the original Mongoose cart object for context if needed)
            console.log(`[OrderController Opt1] Clearing user cart ${cart._id} for user ${userId}...`);
            try {
                await CartService.clearCart(userId, session); // Pass session if needed by clearCart
            } catch (clearCartError) {
                console.error(`[OrderController Opt1] Warning: Failed to clear cart ${cart._id}:`, clearCartError);
            }
    
            // 7. Commit transaction
            if (useTransactions && session?.inTransaction()) {
                await session.commitTransaction();
                console.log(`[OrderController Opt1] Transaction committed successfully for order ${order._id}.`);
            }
    
            // 8. Send Success Response
            res.status(201).json({
                success: true,
                message: 'Order placed successfully.',
                orderId: order._id,
                paymentInfo: paymentResponse,
                invalidItemsRemoved: invalidItems.length > 0 ? invalidItems : undefined
            });
    
        } catch (error) {
            console.error('[OrderController Opt1] Error during order creation:', error);
            if (useTransactions && session?.inTransaction()) {
                try { await session.abortTransaction(); console.log('[OrderController Opt1] Transaction aborted.'); }
                catch (abortError) { console.error('[OrderController Opt1] Error aborting transaction:', abortError); }
            }
            let statusCode = 500;
            if (error.message.includes("Insufficient stock") || error.message.includes("Failed to update stock")) { statusCode = 400; }
            else if (error.message.includes("Inconsistent state")) { statusCode = 500; }
    
            res.status(statusCode).json({
                success: false, message: error.message || 'Error creating order',
                error: error.name || 'OrderProcessingError',
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        } finally {
            if (useTransactions && session) {
                await session.endSession();
                console.log(`[OrderController Opt1] Order creation transaction session ended.`);
            }
            console.log(`[OrderController Opt1] Order creation process finished.`);
        }
    }
    

    // Get User Orders (Paginated)
    async getUserOrders(req, res) {
        try {
            const userId = req.user._id;
            
            // Validate userId is a valid ObjectId
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user ID format' // Changed from 'Invalid order ID format'
                });
            }
            
            const { page = 1, limit = 10, status, sort = 'createdAt:desc' } = req.query;
            const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
            const filter = { user: userId };
            
            if (status) {
                const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
                if (statuses.length > 0) {
                    filter.status = { $in: statuses };
                }
            }
            
            let sortOptions = { createdAt: -1 };
            if (sort) {
                const [field, direction] = sort.split(':');
                if (field && direction) {
                    sortOptions = { [field]: direction.toLowerCase() === 'asc' ? 1 : -1 };
                }
            }
            
            const orders = await Order.find(filter)
                .populate({
                    path: 'items.product',
                    select: 'name title images price slug sku', // Removed *original*id which might be causing problems
                })
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit, 10))
                .lean();
                
            const totalOrders = await Order.countDocuments(filter);
            const totalPages = Math.ceil(totalOrders / parseInt(limit, 10));
            
            res.status(200).json({
                success: true,
                data: orders,
                pagination: {
                    currentPage: parseInt(page, 10),
                    totalPages: totalPages,
                    totalOrders: totalOrders,
                    limit: parseInt(limit, 10),
                    hasNextPage: parseInt(page, 10) < totalPages,
                    hasPrevPage: parseInt(page, 10) > 1,
                }
            });
        } catch (error) {
            console.error('Get user orders error:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching orders',
                error: error.message
            });
        }
    }

    // Get Single Order Details
    async getOrderById(req, res) {
        try {
            const userId = req.user._id; // Assuming user should only get their own orders
            const { orderId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(orderId)) {
                return res.status(400).json({ success: false, message: 'Invalid order ID format' });
            }

            // Find order by ID and ensure it belongs to the requesting user
            const order = await Order.findOne({ _id: orderId, user: userId })
                 // Populate necessary details for the order view
                 // Populate using the stored _original_id reference in items.product
                .populate({
                    path: 'items.product', // Path in Order schema
                    model: 'Product', // Explicitly state the model
                    select: 'name title images price slug sku _original_id', // Fields needed from current product state (optional)
                    // Match using _original_id if your Product model has it indexed
                    match: { _original_id: { $exists: true } } // Optional filter if needed
                    // Note: Populating might fetch the *current* product state.
                    // Rely primarily on item.productSnapshot for historical data.
                })
                .populate('delivery') // Populate linked Delivery document
                .populate({ // Populate linked Payment document via paymentDetails.paymentId
                     path: 'paymentDetails.paymentId',
                     model: 'Payment',
                     select: 'razorpayPaymentId status amount method createdAt' // Select needed payment fields
                });
                // .populate('user', 'name email'); // Optionally populate user details

            if (!order) {
                // Check if the order exists at all, could be a permission issue or not found
                const orderExists = await Order.findById(orderId).select('_id').lean();
                if (orderExists) {
                     // Order exists but doesn't belong to the user
                    return res.status(403).json({ success: false, message: 'Access denied: You do not own this order.' });
                } else {
                    // Order truly not found
                    return res.status(404).json({ success: false, message: 'Order not found' });
                }
            }

             // Consider augmenting item data with snapshot if population fails or for consistency
            // order.items = order.items.map(item => ({
            //     ...item.toObject(), // Convert Mongoose subdoc to plain object if needed
            //     productDetails: item.product ? item.product.toObject() : null, // Populated current data
            //     snapshot: item.productSnapshot // Historical data
            // }));


            res.status(200).json({ success: true, data: order });
        } catch (error) {
            console.error('Get order by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching order details',
                error: error.message
            });
        }
    }

    // Cancel Order (User - with improved stock restoration)
    async cancelOrder(req, res) {
         // --- Conditional Transaction Logic for Cancellation ---
         const useTransactions = process.env.NODE_ENV !== 'development';
         let session = null;
         if (useTransactions) {
             session = await mongoose.startSession();
             session.startTransaction();
             console.log(`[OrderController.cancelOrder] Starting cancellation transaction for Order ID: ${req.params.orderId}`);
         } else {
             console.log(`[OrderController.cancelOrder] Skipping transactions.`);
         }
         // ---

        try {
            const userId = req.user._id;
            const { orderId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(orderId)) {
                 if (useTransactions && session?.inTransaction()) await session.abortTransaction();
                return res.status(400).json({ success: false, message: 'Invalid order ID format' });
            }

             // --- Pass session conditionally ---
             const findOptions = useTransactions && session ? { session } : {};
             const saveOptions = useTransactions && session ? { session } : {};
             const updateOptions = useTransactions && session ? { session } : {};
             // ---

            // Fetch the order ensuring it belongs to the user, within the transaction
            const order = await Order.findOne({ _id: orderId, user: userId }, null, findOptions);
                // No need to populate product heavily here, just need the reference ID (_original_id) and quantity

            if (!order) {
                 if (useTransactions && session?.inTransaction()) await session.abortTransaction();
                return res.status(404).json({ success: false, message: 'Order not found or access denied' });
            }

             // Use the canCancel method if defined in the Order model
            // Example: order.canCancel() might check status like 'pending', 'confirmed' but not 'shipped'
            const allowedCancelStatuses = ['pending', 'confirmed', 'processing']; // Example statuses
            if (!allowedCancelStatuses.includes(order.status)) {
                 if (useTransactions && session?.inTransaction()) await session.abortTransaction();
                return res.status(400).json({ success: false, message: `Order cannot be cancelled in its current status: ${order.status}` });
            }

            // --- Stock Restoration ---
            console.log(`[OrderController.cancelOrder] Restoring stock for cancelled order ${orderId}`);
            const stockRestorePromises = order.items.map(item => {
                 if (!item.product) { // item.product holds the _original_id
                     console.warn(`[OrderController.cancelOrder] Product reference missing for item in order ${orderId}. Cannot restore stock for this item.`);
                     return Promise.resolve(); // Skip this item
                 }
                // Restore stock using the _original_id stored in item.product
                return Product.findOneAndUpdate(
                    { _original_id: item.product }, // Find by original ID
                    { $inc: { stock: item.quantity } }, // Increment stock
                    { ...updateOptions, new: true } // Pass session, return updated doc
                ).exec()
                 .then(updatedProduct => {
                    if (!updatedProduct) {
                        // Product might have been deleted. Log this but don't necessarily fail cancellation.
                        console.warn(`[OrderController.cancelOrder] Product with _original_id ${item.product} not found during stock restoration for cancelled order ${orderId}. Stock not restored for this item.`);
                    } else {
                        console.log(`[OrderController.cancelOrder] Restored stock for product _original_id ${item.product} by ${item.quantity}. New stock: ${updatedProduct.stock}`);
                    }
                 })
                 .catch(err => {
                    // Log error but potentially allow cancellation to proceed? Or abort? Decide based on policy.
                    // Aborting might be safer if stock restoration is critical.
                    console.error(`[OrderController.cancelOrder] Error restoring stock for product _original_id ${item.product} in order ${orderId}:`, err);
                    throw new Error(`Failed to restore stock for product ${item.product}. Cancellation aborted.`); // Throw to abort transaction
                 });
            });

            // Wait for all stock restorations
            await Promise.all(stockRestorePromises);
            console.log(`[OrderController.cancelOrder] Stock restoration process completed for order ${orderId}.`);

            // --- Update Order Status ---
            const previousStatus = order.status;
            order.status = 'cancelled';
            // Adjust payment status based on previous state
            if (order.paymentStatus === 'paid' || order.paymentStatus === 'authorized') { // Check for paid/authorized states
                order.paymentStatus = 'refund_pending'; // Or initiate refund process here
                console.log(`[OrderController.cancelOrder] Order ${orderId} payment status set to refund_pending.`);
                // TODO: Trigger actual refund process if applicable (e.g., call Razorpay refund API)
            } else {
                // For pending, failed, etc., just mark as cancelled
                order.paymentStatus = 'cancelled';
                 console.log(`[OrderController.cancelOrder] Order ${orderId} payment status set to cancelled.`);
            }

            // Add a history entry (if using an audit log/history sub-document)
            if (order.history && Array.isArray(order.history)) {
                order.history.push({
                    status: 'cancelled',
                    timestamp: new Date(),
                    updatedBy: userId, // Or 'user' role
                    notes: `Order cancelled by user from status ${previousStatus}.`
                });
            }

            await order.save(saveOptions); // Save the updated order within the transaction

            // --- Update Delivery Status (if delivery record exists) ---
            if (order.delivery) {
                console.log(`[OrderController.cancelOrder] Updating delivery status for order ${orderId}. Delivery ID: ${order.delivery}`);
                await Delivery.findByIdAndUpdate(
                    order.delivery,
                    { $set: { status: 'cancelled', cancelledAt: new Date() } }, // Mark delivery as cancelled
                    updateOptions // Pass session
                );
            }

            // --- Commit transaction ---
            if (useTransactions && session?.inTransaction()) {
                 await session.commitTransaction();
                 console.log(`[OrderController.cancelOrder] Cancellation transaction committed for order ${orderId}.`);
            }
            // ---

            res.status(200).json({ success: true, message: 'Order cancelled successfully', data: order }); // Return updated order

        } catch (error) {
            console.error('Cancel order error:', error);
             // --- Abort transaction on error ---
             if (useTransactions && session?.inTransaction()) {
                 await session.abortTransaction();
                 console.log(`[OrderController.cancelOrder] Cancellation transaction aborted for order ${req.params.orderId}.`);
             }
             // ---
            res.status(500).json({ success: false, message: 'Error cancelling order', error: error.message });
        } finally {
             // --- End session ---
             if (useTransactions && session) {
                 await session.endSession();
                 console.log(`[OrderController.cancelOrder] Cancellation transaction session ended for order ${req.params.orderId}.`);
             }
             // ---
        }
    }


    // Update Order Status (Admin - with more robust logic and delivery handling)
    async updateOrderStatusAdmin(req, res) {
         // --- Conditional Transaction Logic for Status Update ---
         const useTransactions = process.env.NODE_ENV !== 'development';
         let session = null;
         if (useTransactions) {
             session = await mongoose.startSession();
             session.startTransaction();
             console.log(`[OrderController.updateOrderStatusAdmin] Starting status update transaction for Order ID: ${req.params.orderId}`);
         } else {
             console.log(`[OrderController.updateOrderStatusAdmin] Skipping transactions.`);
         }
         // ---

        try {
            const { orderId } = req.params;
            const { status, notes } = req.body; // Allow optional notes
             const adminUserId = req.user._id; // Assuming admin user is authenticated via req.user

            if (!mongoose.Types.ObjectId.isValid(orderId)) {
                 if (useTransactions && session?.inTransaction()) await session.abortTransaction();
                return res.status(400).json({ success: false, message: 'Invalid order ID format' });
            }

             // Define valid statuses and potentially transitions if needed
            const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'failed', 'on_hold'];
            if (!status || !validStatuses.includes(status)) {
                 if (useTransactions && session?.inTransaction()) await session.abortTransaction();
                return res.status(400).json({ success: false, message: `Invalid status value provided. Must be one of: ${validStatuses.join(', ')}` });
            }

             // --- Pass session conditionally ---
             const findOptions = useTransactions && session ? { session } : {};
             const saveOptions = useTransactions && session ? { session } : {};
             const updateOptions = useTransactions && session ? { session } : {};
             // ---

            // Find the order
            const order = await Order.findById(orderId, null, findOptions).populate('delivery'); // Populate delivery to check/update
            if (!order) {
                 if (useTransactions && session?.inTransaction()) await session.abortTransaction();
                return res.status(404).json({ success: false, message: 'Order not found' });
            }

            const previousStatus = order.status;

             // Prevent illogical status changes (e.g., from delivered back to pending) if needed
             // Example: if (order.status === 'delivered' && status !== 'delivered') return res.status(400)...

             // Handle 'cancelled' status specifically - may need stock restoration if not already cancelled by user
             if (status === 'cancelled' && previousStatus !== 'cancelled') {
                 console.log(`[OrderController.updateOrderStatusAdmin] Admin cancelling order ${orderId}. Restoring stock.`);
                 // Reuse stock restoration logic (consider extracting to a service method)
                 const stockRestorePromises = order.items.map(item => {
                     if (!item.product) return Promise.resolve();
                     return Product.findOneAndUpdate(
                         { _original_id: item.product },
                         { $inc: { stock: item.quantity } },
                         { ...updateOptions, new: true }
                     ).exec().then(p => {
                         if (!p) console.warn(`[Admin Cancel] Product ${item.product} not found for stock restore.`);
                         else console.log(`[Admin Cancel] Restored stock for ${item.product}, new: ${p.stock}`);
                     }).catch(err => {
                          console.error(`[Admin Cancel] Error restoring stock for ${item.product}`, err);
                          throw new Error(`Stock restoration failed for ${item.product}`);
                     });
                 });
                 await Promise.all(stockRestorePromises);

                 // Update payment status for cancellation
                if (order.paymentStatus === 'paid' || order.paymentStatus === 'authorized') {
                    order.paymentStatus = 'refund_pending'; // Or trigger refund
                } else {
                    order.paymentStatus = 'cancelled';
                }
             }

             // Handle 'delivered' status - update payment for COD
             if (status === 'delivered' && order.paymentMethod === 'cod' && order.paymentStatus !== 'paid') {
                 order.paymentStatus = 'paid';
                 console.log(`[OrderController.updateOrderStatusAdmin] Marked COD order ${orderId} as paid upon delivery.`);
                 // Optionally create a Payment record here if needed for COD tracking
             }


            // Update the order status
            order.status = status;

             // Add history entry
            if (order.history && Array.isArray(order.history)) {
                order.history.push({
                    status: status,
                    timestamp: new Date(),
                    updatedBy: adminUserId, // Track admin ID
                    notes: notes || `Status updated from ${previousStatus} to ${status} by admin.` // Include admin notes if provided
                });
            }

             // --- Delivery Handling ---
             let deliveryStatusNeedsUpdate = false;
             let targetDeliveryStatus = null;

             // Create Delivery record if moving to 'shipped' and one doesn't exist
             if (status === 'shipped' && !order.delivery) {
                 console.log(`[OrderController.updateOrderStatusAdmin] Creating Delivery record for order ${orderId} as status moves to shipped.`);
                 const delivery = new Delivery({
                     order: order._id,
                     user: order.user,
                     status: 'assigned', // Start with 'assigned' or similar when shipped
                     deliveryAddress: order.shippingAddress,
                     // Add other relevant fields like estimated delivery date if available
                 });
                 await delivery.save(saveOptions); // Save within transaction
                 order.delivery = delivery._id; // Link delivery to order
                 deliveryStatusNeedsUpdate = false; // Status set during creation
                 console.log(`[OrderController.updateOrderStatusAdmin] Delivery record ${delivery._id} created and linked.`);
             } else if (order.delivery) {
                 // Map order status to delivery status
                 switch (status) {
                     case 'shipped': targetDeliveryStatus = 'assigned'; break; // Or 'in_transit'
                     case 'out_for_delivery': targetDeliveryStatus = 'out_for_delivery'; break;
                     case 'delivered': targetDeliveryStatus = 'delivered'; break;
                     case 'cancelled': targetDeliveryStatus = 'cancelled'; break;
                     // Add other mappings as needed ('failed', 'returned', etc.)
                     default:
                         // If order status doesn't directly map, maybe don't update delivery status
                         // Or set to a generic state like 'processing_update'
                         console.log(`[OrderController.updateOrderStatusAdmin] No direct delivery status mapping for order status: ${status}`);
                 }

                 // Check if delivery status actually needs changing
                 // Need to access populated delivery status correctly
                 const currentDeliveryStatus = typeof order.delivery === 'object' ? order.delivery.status : null;
                 if (targetDeliveryStatus && currentDeliveryStatus !== targetDeliveryStatus) {
                     deliveryStatusNeedsUpdate = true;
                 }
             }

            // Save the order first (including potential new delivery link)
            await order.save(saveOptions);

            // Update Delivery status if needed AFTER order save
            if (deliveryStatusNeedsUpdate && order.delivery && targetDeliveryStatus) {
                console.log(`[OrderController.updateOrderStatusAdmin] Updating delivery ${order.delivery._id || order.delivery} status to ${targetDeliveryStatus}`);
                 await Delivery.findByIdAndUpdate(
                     order.delivery._id || order.delivery, // Handle populated vs ID
                     { $set: { status: targetDeliveryStatus, updatedAt: new Date() } }, // Update status and timestamp
                     updateOptions // Pass session
                 );
            }
            // --- End Delivery Handling ---

            // --- Commit transaction ---
            if (useTransactions && session?.inTransaction()) {
                await session.commitTransaction();
                console.log(`[OrderController.updateOrderStatusAdmin] Status update transaction committed for order ${orderId}.`);
            }
            // ---

            // Fetch the updated order again to return the latest state with populated fields if necessary
            const updatedOrder = await Order.findById(orderId).populate('delivery').populate('paymentDetails.paymentId'); // Re-populate needed fields

            res.status(200).json({
                success: true,
                message: `Order status updated to ${status}`,
                data: updatedOrder // Return the fully updated order
            });

        } catch (error) {
            console.error('Update order status admin error:', error);
             // --- Abort transaction on error ---
             if (useTransactions && session?.inTransaction()) {
                 await session.abortTransaction();
                 console.log(`[OrderController.updateOrderStatusAdmin] Status update transaction aborted for order ${req.params.orderId}.`);
             }
             // ---
            res.status(500).json({ success: false, message: 'Error updating order status', error: error.message });
        } finally {
             // --- End session ---
             if (useTransactions && session) {
                 await session.endSession();
                 console.log(`[OrderController.updateOrderStatusAdmin] Status update transaction session ended for order ${req.params.orderId}.`);
             }
             // ---
        }
    }

}

module.exports = new OrderController();