const mongoose = require('mongoose');
const logger = require('../utils/logger'); // Assuming you have a centralized logger

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Add connection pooling for better performance
      maxPoolSize: 10, // Adjust based on expected concurrent database operations
      serverSelectionTimeoutMS: 5000, // 5 second timeout for server selection
      socketTimeoutMS: 45000, // 45 second socket timeout
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Optional: Add event listeners for connection monitoring
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

    return conn;
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;