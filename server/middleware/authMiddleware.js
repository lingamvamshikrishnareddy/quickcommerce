const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AuthenticationError, ForbiddenError } = require('../utils/errors');

/**
 * Utility function to extract token from Authorization header
 * @param {Object} req - Express request object
 * @returns {string|null} - Extracted token or null
 */
const extractToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

/**
 * Utility function to handle JWT verification errors
 * @param {Error} err - Error object
 * @param {Object} res - Express response object
 */
const handleJWTError = (err, res) => {
  let message = 'Authentication failed. Please log in again.';
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token. Please log in again!';
  } else if (err.name === 'TokenExpiredError') {
    message = 'Your token has expired! Please log in again.';
  }
  res.status(401).json({ success: false, message });
};

/**
 * Authentication middleware for protected routes
 * Verifies JWT token and attaches user to request object
 */
exports.protect = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'You are not logged in. Please log in to get access.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const currentUser = await User.findById(decoded.userId);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // Check if user changed password after token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'User recently changed password. Please log in again.'
      });
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    next();
  } catch (error) {
    handleJWTError(error, res);
  }
};

/**
 * Authorization middleware for role-based access control
 * @param {...String} roles - Allowed roles
 * @returns {Function} - Express middleware function
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};
