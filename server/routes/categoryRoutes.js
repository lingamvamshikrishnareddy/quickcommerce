// routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController'); // Ensure this imports the INSTANCE
const { protect, restrictTo } = require('../middleware/authMiddleware'); // Assuming this middleware exists

// --- Public Routes ---

// GET /api/v1/categories - Get all categories with filtering, pagination, sorting
router.get('/', categoryController.getAllCategories);

// GET /api/v1/categories/main - Get grouped main categories (no parent) for display
router.get('/main', categoryController.getMainCategories);

// GET /api/v1/categories/featured - Get featured categories (e.g., based on product count)
router.get('/featured', categoryController.getFeaturedCategories);

// GET /api/v1/categories/slug/:slug - Get a specific category by its slug
router.get('/slug/:slug', categoryController.getCategoryBySlug);

// GET /api/v1/categories/:id - Get a specific category by its ID
router.get('/:id', categoryController.getCategoryById);


// --- Protected Routes (Admin Only) ---

// Apply authentication middleware globally for subsequent routes
router.use(protect);

// Apply authorization middleware (admin only) for subsequent routes
router.use(restrictTo('admin'));

// POST /api/v1/categories - Create a new category
router.post('/', categoryController.createCategory);

// PUT /api/v1/categories/:id - Update an existing category
router.put('/:id', categoryController.updateCategory);

// DELETE /api/v1/categories/:id - Delete a category (with checks for subcategories/products)
router.delete('/:id', categoryController.deleteCategory);


module.exports = router;