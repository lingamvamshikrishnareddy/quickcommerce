const dotenv = require('dotenv');
const path = require('path');
const logger = require('../utils/logger');

class AppConfig {
  constructor() {
    this.loadEnvironmentVariables();
    this.validateConfiguration();
  }

  // Load environment variables from appropriate .env file
  loadEnvironmentVariables() {
    const envFile = process.env.NODE_ENV 
      ? `.env.${process.env.NODE_ENV}` 
      : '.env';
    const envPath = path.resolve(process.cwd(), envFile);
    
    try {
      const result = dotenv.config({ path: envPath });
      if (result.error) {
        throw result.error;
      }
      logger.info(`Environment variables loaded from ${envFile}`);
    } catch (error) {
      logger.warn(`Error loading environment variables: ${error.message}`);
      // Fallback to default .env
      dotenv.config();
    }
  }

  // Validate critical configuration parameters
  validateConfiguration() {
    const requiredEnvVars = [
      'PORT',
      'MONGO_URI',
      'JWT_SECRET',
      'STRIPE_SECRET_KEY',
      'REDIS_URL',
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET'
    ];

    const missingVars = requiredEnvVars.filter(
      varName => !process.env[varName]
    );

    if (missingVars.length > 0) {
      logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
      throw new Error(`Configuration Error: Missing env vars - ${missingVars.join(', ')}`);
    }
  }

  // Get application configuration
  getConfig() {
    return {
      // Server configuration
      server: {
        port: parseInt(process.env.PORT, 10) || 3000,
        env: process.env.NODE_ENV || 'development',
        apiPrefix: process.env.API_PREFIX || '/api/v1'
      },
      
      // Database configuration
      database: {
        mongoUri: process.env.MONGO_URI,
        redisUrl: process.env.REDIS_URL
      },
      
      // Authentication configuration
      auth: {
        jwtSecret: process.env.JWT_SECRET,
        jwtExpiration: process.env.JWT_EXPIRATION || '1d'
      },
      
      // Payment configuration
      payment: {
        stripe: {
          secretKey: process.env.STRIPE_SECRET_KEY
        },
        razorpay: {
          keyId: process.env.RAZORPAY_KEY_ID,
          keySecret: process.env.RAZORPAY_KEY_SECRET
        }
      },
      
      // Logging configuration
      logging: {
        level: process.env.LOG_LEVEL || 'info'
      }
    };
  }

  // Get Razorpay configuration specifically
  getRazorpayConfig() {
    return {
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    };
  }
}

module.exports = new AppConfig();