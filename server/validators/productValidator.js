// validators/productValidator.js
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

module.exports = {
  /**
   * Validate product data for create/update operations
   * @param {Object} data - Product data to validate
   * @param {Boolean} isUpdate - Whether this is for an update operation
   * @returns {Object} - Validation result {valid: Boolean, errors: Array}
   */
  validateProductData: (data, isUpdate = false) => {
    const errors = [];
    
    // Required fields check (only for creation)
    if (!isUpdate) {
      const requiredFields = ['title', 'category', 'stock'];
      requiredFields.forEach(field => {
        if (!data[field] && data[field] !== 0) {
          errors.push(`${field} is required`);
        }
      });
    }

    // Type checks
    if (data.title && typeof data.title !== 'string') {
      errors.push('Title must be a string');
    }

    if (data.category && typeof data.category !== 'string') {
      errors.push('Category must be a string');
    }

    if (data.stock !== undefined && data.stock !== null) {
      if (isNaN(data.stock)) {
        errors.push('Stock must be a number');
      } else if (data.stock < 0) {
        errors.push('Stock cannot be negative');
      }
    }

    // Pricing validation
    if (data.pricing) {
      if (typeof data.pricing !== 'object') {
        errors.push('Pricing must be an object');
      } else {
        if (data.pricing.salePrice !== undefined && isNaN(data.pricing.salePrice)) {
          errors.push('Sale price must be a number');
        }
        if (data.pricing.originalPrice !== undefined && isNaN(data.pricing.originalPrice)) {
          errors.push('Original price must be a number');
        }
        if (data.pricing.salePrice !== undefined && data.pricing.originalPrice !== undefined) {
          if (data.pricing.salePrice > data.pricing.originalPrice) {
            errors.push('Sale price cannot be higher than original price');
          }
        }
      }
    }

    // Quantity validation
    if (data.quantity) {
      if (typeof data.quantity !== 'object') {
        errors.push('Quantity must be an object');
      } else {
        if (data.quantity.value !== undefined && isNaN(data.quantity.value)) {
          errors.push('Quantity value must be a number');
        }
        if (data.quantity.unit && typeof data.quantity.unit !== 'string') {
          errors.push('Quantity unit must be a string');
        }
      }
    }

    // Images validation
    if (data.images && !Array.isArray(data.images)) {
      errors.push('Images must be an array');
    }

    // Variants validation
    if (data.variants) {
      if (!Array.isArray(data.variants)) {
        errors.push('Variants must be an array');
      } else {
        data.variants.forEach((variant, index) => {
          if (!variant.name || typeof variant.name !== 'string') {
            errors.push(`Variant ${index + 1} must have a name string`);
          }
          if (variant.price !== undefined && isNaN(variant.price)) {
            errors.push(`Variant ${index + 1} price must be a number`);
          }
          if (variant.sku && typeof variant.sku !== 'string') {
            errors.push(`Variant ${index + 1} SKU must be a string`);
          }
        });
      }
    }

    // Tags validation
    if (data.tags && !Array.isArray(data.tags)) {
      errors.push('Tags must be an array');
    }

    // Metadata validation
    if (data.metadata) {
      if (typeof data.metadata !== 'object') {
        errors.push('Metadata must be an object');
      } else {
        if (data.metadata.isActive !== undefined && typeof data.metadata.isActive !== 'boolean') {
          errors.push('metadata.isActive must be a boolean');
        }
        if (data.metadata.isFeatured !== undefined && typeof data.metadata.isFeatured !== 'boolean') {
          errors.push('metadata.isFeatured must be a boolean');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Express middleware for validating product data in requests
   */
  validateProductRequest: (isUpdate = false) => {
    return [
      // Validate and sanitize fields
      body('title').optional(!isUpdate).trim().notEmpty().withMessage('Title is required')
        .isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
      body('description').optional().trim(),
      body('category').optional(!isUpdate).trim().notEmpty().withMessage('Category is required'),
      body('subCategory').optional().trim(),
      body('quantity.value').optional().isNumeric().withMessage('Quantity value must be a number'),
      body('quantity.unit').optional().trim(),
      body('pricing.salePrice').optional().isFloat({ min: 0 }).withMessage('Sale price must be a positive number'),
      body('pricing.originalPrice').optional().isFloat({ min: 0 }).withMessage('Original price must be a positive number'),
      body('stock').optional(!isUpdate).isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
      body('brand').optional().trim(),
      body('images').optional().isArray().withMessage('Images must be an array'),
      body('variants').optional().isArray().withMessage('Variants must be an array'),
      body('variants.*.name').optional().trim().notEmpty().withMessage('Variant name is required'),
      body('variants.*.price').optional().isFloat({ min: 0 }).withMessage('Variant price must be a positive number'),
      body('variants.*.sku').optional().trim(),
      body('nutritionalInfo').optional().isObject().withMessage('Nutritional info must be an object'),
      body('tags').optional().isArray().withMessage('Tags must be an array'),
      body('attributes').optional().isArray().withMessage('Attributes must be an array'),
      body('metadata.isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
      body('metadata.isFeatured').optional().isBoolean().withMessage('isFeatured must be a boolean'),
      
      // Custom validation
      body().custom((value, { req }) => {
        if (req.body.pricing?.salePrice && req.body.pricing?.originalPrice) {
          if (req.body.pricing.salePrice > req.body.pricing.originalPrice) {
            throw new Error('Sale price cannot be higher than original price');
          }
        }
        return true;
      }),

      // Handle validation result
      (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => err.msg)
          });
        }
        next();
      }
    ];
  },

  /**
   * Validate product ID format
   */
  validateProductId: (id) => {
    if (!id) return false;
    // Check for numeric ID (legacy support)
    if (!isNaN(id)) return true;
    // Check for MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) return true;
    // Check for custom product ID format (CAT-123456-abc)
    if (typeof id === 'string' && /^[A-Z]{3}-\d{6}-[a-z0-9]{3}$/.test(id)) return true;
    return false;
  }
};