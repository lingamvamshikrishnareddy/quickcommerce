const winston = require('winston');

// Configure Winston logger
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Write all logs to console for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Central error handling middleware
const errorMiddleware = (err, req, res, next) => {
  // Log the error
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`, err);

  // Determine error response based on environment
  const errorResponse = process.env.NODE_ENV === 'production'
    ? {
        message: 'An unexpected error occurred',
        error: 'Internal Server Error'
      }
    : {
        message: err.message,
        error: err.stack,
        statusCode: err.status || 500
      };

  // Send error response
  res.status(err.status || 500).json(errorResponse);
};

// Catch 404 routes
const notFoundMiddleware = (req, res, next) => {
  const error = new Error(`Route Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

// Custom error class for consistent error handling
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorMiddleware,
  notFoundMiddleware,
  AppError,
  logger
};