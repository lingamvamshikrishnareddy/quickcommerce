const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

// Redis connection configuration
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD
});

// General rate limiter configuration
const createRateLimiter = ({
  windowMs = 15 * 60 * 1000, // 15 minutes
  max = 100, // Limit each IP to 100 requests per windowMs
  message = 'Too many requests, please try again later',
  standardHeaders = true, // Return rate limit info in RateLimit-* headers
  legacyHeaders = false, // Disable the X-RateLimit-* headers
}) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      status: 'error',
      message
    },
    standardHeaders,
    legacyHeaders,
    // Use Redis store for distributed rate limiting
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args)
    }),
    // Custom handler for rate limit exceeded
    handler: (req, res) => {
      res.status(429).json({
        status: 'error',
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
      });
    },
    // Skip rate limiting for certain requests
    skip: (req) => {
      // Exempt authenticated users or internal services
      return req.user && req.user.role === 'admin';
    }
  });
};

// Specific rate limiters for different routes
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit login attempts
  message: 'Too many login attempts, please try again later'
});

const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Limit general API requests
});

const createAccountLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit account creation
  message: 'Too many accounts created, please try again later'
});

module.exports = {
  authLimiter,
  apiLimiter,
  createAccountLimiter,
  createRateLimiter
};