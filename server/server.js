const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// Load environment variables
dotenv.config();

// Import Routes
const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const productRoutes = require('./routes/productRoutes');
const regularOrderRoutes = require('./routes/regularOrderRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const userRoutes = require('./routes/userRoutes');
const locationRoutes = require('./routes/locationRoutes');
const supportRoutes = require('./routes/supportRoutes.js');

// Create Express App
const app = express();

// CORS configuration
const allowedOrigins = [
  'https://www.setcart.in',
  'https://quickcommerce-qn1h.vercel.app',  // Production frontend URL
  'http://localhost:3000',                  // Local development frontend URL
  /^https:\/\/quickcommerce-.*\.vercel\.app$/  // Any Vercel preview deployments
];

// CORS middleware with proper configuration
app.use(cors({
  origin: function(origin, callback) {
    if(!origin) return callback(null, true);

    const allowed = allowedOrigins.some(allowedOrigin => {
      return typeof allowedOrigin === 'string'
        ? allowedOrigin === origin
        : allowedOrigin.test(origin);
    });

    if (allowed) {
      callback(null, true);
    } else {
      console.warn(`CORS rejected origin: ${origin}`);
      callback(null, true); // Still allow it but log it (for debugging)
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // CORS preflight cache time (24 hours)
}));

// Handle preflight requests properly
app.options('*', cors());

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for simpler deployment
}));
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Adjusted rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Increased limit for shared IP scenarios
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/ping'
});

// Apply rate limiting to API routes only
app.use('/api', limiter);

// Compression to reduce payload size
app.use(compression());

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced Database Connection
const connectWithRetry = () => {
  const dbOptions = {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000
  };

  mongoose.connect(process.env.MONGODB_URI, dbOptions)
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch(err => {
      console.error('!!!!!!!!!! MongoDB Connection Error !!!!!!!!!! :', err);
      console.log('Retrying MongoDB connection in 5 seconds...');
      setTimeout(connectWithRetry, 5000);
    });
};

// Initial connection attempt
connectWithRetry();

// Handle MongoDB connection events properly
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

// Enhanced ping route with database check
app.get('/api/ping', async (req, res) => {
  console.log(`BACKEND: Received ping request from origin: ${req.headers.origin}`);

  let dbStatus = 'unknown';

  if (mongoose.connection.readyState === 1) {
    dbStatus = 'connected';
  } else if (mongoose.connection.readyState === 2) {
    dbStatus = 'connecting';
  } else {
    dbStatus = 'disconnected';
  }

  res.status(200).json({
    message: 'pong',
    timestamp: new Date().toISOString(),
    status: 'Backend is alive!',
    db_status: dbStatus,
    environment: process.env.NODE_ENV || 'development',
    server_uptime: Math.floor(process.uptime()) + ' seconds'
  });
});

// Route Middleware
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', regularOrderRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/support', supportRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("!!!!!!!!!! GLOBAL ERROR HANDLER CATCH !!!!!!!!!!");
  console.error(`Error on ${req.method} ${req.originalUrl}:`, err.message);
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const errorResponse = {
    message: err.message || 'Something went wrong!',
    status: 'error',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  };

  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
});

// 404 Handler with better logging
app.use((req, res, next) => {
  console.log(`BACKEND: 404 - Route Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    message: `Route Not Found - Cannot ${req.method} ${req.originalUrl}`,
    status: 'error',
    timestamp: new Date().toISOString()
  });
});

// Server Configuration
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ ✅ ✅ Server running on port ${PORT} ✅ ✅ ✅`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n🚀 Backend Ready! Waiting for connections...`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});

module.exports = app;
