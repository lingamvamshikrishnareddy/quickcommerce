// middleware/adminMiddleware.js
const adminMiddleware = (req, res, next) => {
    // Check if user exists and has admin role
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Admin access required',
        error: 'Forbidden'
      });
    }
    
    next();
  };
  
  module.exports = adminMiddleware;