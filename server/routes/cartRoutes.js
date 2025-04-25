// In your routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

// Apply authentication middleware to all cart routes
router.use(protect);

// GET /api/cart - Get user's cart
router.get('/', cartController.getCart);

// POST /api/cart/items - Add item to cart
router.post('/items', cartController.addToCart);

// PUT /api/cart/items/:itemId - Update cart item
router.put('/items/:itemId', cartController.updateCartItem);

// Add this route to your routes/cartRoutes.js
// GET /api/cart/validate - Validate cart contents
router.get('/validate', cartController.validateCart);

// DELETE /api/cart/items/:itemId - Remove item from cart
router.delete('/items/:itemId', cartController.removeFromCart);

// DELETE /api/cart - Clear cart
router.delete('/', cartController.clearCart);

module.exports = router;