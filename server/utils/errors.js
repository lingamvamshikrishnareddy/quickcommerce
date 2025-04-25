/**
 * @file errors.js
 * Custom error handling utilities for QuickCommerce API
 */

// Custom API Error class
class ApiError extends Error {
    constructor(statusCode, message, isOperational = true, stack = '') {
      super(message);
      this.statusCode = statusCode;
      this.isOperational = isOperational;
      
      if (stack) {
        this.stack = stack;
      } else {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  }
  
  // HTTP status codes for common errors
  const httpStatus = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500
  };
  
  // Error handler for async/await functions
  const catchAsync = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };
  
  // Factory for generating common errors
  const errorFactory = {
    badRequest: (message) => new ApiError(httpStatus.BAD_REQUEST, message),
    unauthorized: (message = 'Unauthorized') => new ApiError(httpStatus.UNAUTHORIZED, message),
    forbidden: (message = 'Forbidden') => new ApiError(httpStatus.FORBIDDEN, message),
    notFound: (message = 'Resource not found') => new ApiError(httpStatus.NOT_FOUND, message),
    conflict: (message) => new ApiError(httpStatus.CONFLICT, message),
    validationError: (message) => new ApiError(httpStatus.UNPROCESSABLE_ENTITY, message),
    internalError: (message = 'Internal server error') => 
      new ApiError(httpStatus.INTERNAL_SERVER_ERROR, message, true)
  };
  
  // Error handling middleware
  const errorHandler = (err, req, res, next) => {
    let error = err;
    
    // If error is not an instance of ApiError, convert it
    if (!(error instanceof ApiError)) {
      const statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
      const message = error.message || 'Internal server error';
      error = new ApiError(statusCode, message, false, err.stack);
    }
  
    // Send error response
    res.status(error.statusCode).json({
      success: false,
      status: error.statusCode,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  };
  
  module.exports = {
    ApiError,
    httpStatus,
    catchAsync,
    errorFactory,
    errorHandler
  };