// server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors'); // Make sure cors is required
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
const categoryRoutes = require('./routes/categoryRoutes'); // Correct path assumed
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

// --- START CORS DEBUGGING ---
// Apply CORS Middleware FIRST
console.log('BACKEND: Applying permissive CORS settings for debugging...');
app.use(cors({
  origin: '*', // Allow ALL origins (DEBUGGING ONLY!)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', '*'], // Allow all headers
}));
// Optional: Handle preflight requests explicitly for all routes
app.options('*', cors()); // Enable pre-flight across-the-board
console.log('BACKEND: CORS setup complete.');
// --- END CORS DEBUGGING ---


// Security Middleware (Generally place after CORS, but check Helmet docs if issues arise)
app.use(helmet());
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased limit slightly for debugging
  message: 'Too many requests from this IP, please try again later'
});
// Apply limiter *after* CORS and essential middleware, but *before* routes
// Only apply to API routes if desired, applying globally for now
app.use(limiter);
console.log('BACKEND: Rate limiting applied.');


// Compression
app.use(compression());

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
console.log('BACKEND: Body parsers applied.');


// Database Connection
mongoose.connect(process.env.MONGODB_URI, {
  // useNewUrlParser: true, // Deprecated
  // useUnifiedTopology: true, // Deprecated
  serverSelectionTimeoutMS: 10000 // Increased timeout slightly
})
.then(() => console.log('MongoDB Connected Successfully'))
.catch(err => {
    console.error('!!!!!!!!!! MongoDB Connection Error !!!!!!!!!!:', err);
    // Consider exiting if DB connection fails on startup
    // process.exit(1);
});

// --- START SIMPLE PING ROUTE ---
// Add this *before* your main API routes
app.get('/api/ping', (req, res) => {
  console.log(`BACKEND: Received request to /api/ping from origin: ${req.headers.origin}`);
  res.status(200).json({
    message: 'pong',
    timestamp: new Date().toISOString(),
    status: 'Backend is alive!'
  });
});
console.log('BACKEND: /api/ping route configured.');
// --- END SIMPLE PING ROUTE ---

// Route Middleware
console.log('BACKEND: Configuring API routes...');
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', regularOrderRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/location',locationRoutes); 
app.use('/api/support', supportRoutes);
console.log('BACKEND: API routes configured.');


// Global Error Handler
app.use((err, req, res, next) => {
  console.error("!!!!!!!!!! GLOBAL ERROR HANDLER CATCH !!!!!!!!!!");
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.stack
  });
});

// 404 Handler (Place this last)
app.use((req, res, next) => {
  console.log(`BACKEND: 404 - Route Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    message: `Route Not Found - Cannot ${req.method} ${req.originalUrl}`
  });
});

// Server Configuration
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => { // Listen on all interfaces
  console.log(`\n✅ ✅ ✅ Server running on port ${PORT} ✅ ✅ ✅`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  // Log the specific origins allowed by CORS (based on our debug setting)
  console.log(`CORS Allowed Origins: * (DEBUGGING)`);
  console.log(`Frontend expected at: http://localhost:3000 (Ensure this matches browser)`);
  console.log(`\n🚀 Backend Ready! Waiting for connections...`);
});

// Graceful Shutdown & Unhandled Rejections (keep as is)
// ...

module.exports = app; // Keep if needed for tests