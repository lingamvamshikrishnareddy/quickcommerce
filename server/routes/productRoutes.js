const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Public routes
router.get('/', productController.getProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/:id', productController.getProductById);
router.get('/slug/:slug', productController.getProductBySlug);

// Protected routes - require authentication
router.post('/', protect, restrictTo('admin'), productController.createProduct);
router.put('/:id', protect, restrictTo('admin'), productController.updateProduct);
router.delete('/:id', protect, restrictTo('admin'), productController.deleteProduct);
router.post('/:id/reviews', protect, productController.addReview);


module.exports = router;