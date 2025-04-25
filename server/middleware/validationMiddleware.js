// middleware/validationMiddleware.js
const { body, validationResult } = require('express-validator');

// Validation middleware for category input
exports.validateCategoryInput = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('parentCategory')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent category ID'),
  
  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL'),
  
  body('slug')
    .optional()
    .trim()
    .isSlug()
    .withMessage('Slug must be URL-friendly'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be either active or inactive'),
  
  // Middleware to check for validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];