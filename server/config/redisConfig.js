const Redis = require('ioredis');

// Configure Redis client based on environment
let redisClient;

if (process.env.REDIS_URL) {
  // For production with connection string
  redisClient = new Redis(process.env.REDIS_URL);
} else {
  // For local development
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: process.env.REDIS_DB || 0,
  });
}

// Add event listeners for connection issues
redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis server');
});

module.exports = redisClient;