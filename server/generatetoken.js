const jwt = require('jsonwebtoken');

// Payload data - replace with your own
const payload = {
  userId: 123,
  username: 'your_username',
  role: 'admin'
};

// Secret key - keep this safe and private
const secretKey = 'your_super_secret_key';

// Options (optional)
const options = {
  expiresIn: '1h', // token will expire in 1 hour
  issuer: 'yourapp.com'
};

// Generate the token
const token = jwt.sign(payload, secretKey, options);

console.log("JWT Token:\n", token);
