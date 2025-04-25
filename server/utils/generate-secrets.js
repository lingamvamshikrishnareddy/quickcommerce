// utils/generate-secrets.js

const crypto = require('crypto');

// Generate a strong random secret (64 bytes -> 128 hex characters)
const generateSecret = (bytes = 64) => crypto.randomBytes(bytes).toString('hex');

const jwtSecret = generateSecret();
const jwtRefreshSecret = generateSecret(); // Generate a *different* one for refresh

console.log('Add these lines to your backend .env file:\n');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`JWT_REFRESH_SECRET=${jwtRefreshSecret}`);
console.log('\nRemember to keep your .env file secure and out of version control!');