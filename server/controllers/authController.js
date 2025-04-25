// controllers/AuthController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const twilio = require('twilio');
const crypto = require('crypto');
const validator = require('validator');
const nodemailer = require('nodemailer');

class AuthController {
  constructor() {
    this.twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN ? 
      twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : null;

    this.googleOAuthClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.otpStore = new Map(); // Temporary in-memory OTP storage
    this.tokenBlacklist = new Set(); // Simple in-memory token blacklist
    this.passwordResetTokens = new Map(); // In-memory password reset tokens

    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  generateTokens(userId, role = 'user') {
    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      { userId, role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '15m' }
    );
    
    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(
      { userId, role, tokenType: 'refresh' }, 
      process.env.JWT_REFRESH_SECRET, 
      { expiresIn: '30d' }
    );
    
    return { accessToken, refreshToken };
  }

  async register(req, res) {
    try {
      const { username, email, password, name, phone, address } = req.body;
  
      // Basic validation
      if (!email || !validator.isEmail(email)) {
        return res.status(400).json({ message: 'Valid email is required' });
      }
      
      if (!password || password.length < 6) { // Reduced to 6 characters for easier onboarding
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }
  
      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
  
      // Create user with minimal required fields
      const user = new User({
        username: username?.toLowerCase() || email.split('@')[0],
        email: email.toLowerCase(),
        password,
        name: name || email.split('@')[0],
      });
  
      await user.save();
  
      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(user._id, user.role);
  
      // Return user data and tokens
      res.status(201).json({
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: error.message || 'An error occurred during registration' });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const sanitizedEmail = email.trim().toLowerCase();

      if (!validator.isEmail(sanitizedEmail)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      // Find user and explicitly select password field
      const user = await User.findOne({ email: sanitizedEmail }).select('+password');
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials', field: 'email' });
      }

      // Check password
      if (!user.password) {
        return res.status(400).json({ 
          message: 'This account uses social login. Please use the appropriate login method.',
          field: 'auth_method' 
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials', field: 'password' });
      }

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(user._id, user.role);

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          name: user.name,
          phone: user.phone,
          address: user.address,
          role: user.role
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'An error occurred during login', error: error.message });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
      }
      
      // Check if token is blacklisted
      if (this.tokenBlacklist.has(refreshToken)) {
        return res.status(401).json({ message: 'Token has been revoked' });
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      // Ensure it's a refresh token
      if (!decoded.tokenType || decoded.tokenType !== 'refresh') {
        return res.status(401).json({ message: 'Invalid token type' });
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { userId: user._id, role: user.role }, 
        process.env.JWT_SECRET, 
        { expiresIn: '15m' }
      );

      res.json({ accessToken });
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      res.status(401).json({ message: 'Authentication failed' });
    }
  }

  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (refreshToken) {
        // Add token to blacklist
        this.tokenBlacklist.add(refreshToken);
      }
      
      res.status(200).json({ message: 'Successfully logged out' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'An error occurred during logout' });
    }
  }

  async googleAuth(req, res) {
    try {
      const { idToken } = req.body;
      
      const ticket = await this.googleOAuthClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const { email, name, sub: googleId } = payload;

      let user = await User.findOne({
        $or: [{ email }, { 'googleAuth.googleId': googleId }],
      });

      if (!user) {
        user = new User({
          name,
          email,
          googleAuth: { googleId, provider: 'google' },
          status: 'active',
        });
        await user.save();
      } else if (!user.googleAuth?.googleId) {
        // Link Google account to existing user
        user.googleAuth = { googleId, provider: 'google' };
        await user.save();
      }

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(user._id, user.role);

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          username: user.username,
          phone: user.phone,
          address: user.address
        },
      });
    } catch (error) {
      console.error('Google Auth Error:', error);
      res.status(401).json({ message: 'Google authentication failed' });
    }
  }

  // New method for forgot password
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const sanitizedEmail = email.trim().toLowerCase();

      if (!validator.isEmail(sanitizedEmail)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      // Find user
      const user = await User.findOne({ email: sanitizedEmail });
      
      // Don't reveal if user exists or not for security
      if (!user) {
        // Return success even if user doesn't exist to prevent email enumeration
        return res.status(200).json({ 
          message: 'If your email is registered, you will receive a password reset link shortly' 
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = Date.now() + 3600000; // 1 hour
      
      // Store token in memory map with user ID
      this.passwordResetTokens.set(resetToken, {
        userId: user._id.toString(),
        expiry: resetTokenExpiry
      });

      // Generate reset URL
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

      // Prepare email
      const mailOptions = {
        from: `"${process.env.APP_NAME}" <${process.env.EMAIL_FROM}>`,
        to: user.email,
        subject: 'Password Reset Request',
        html: `
          <p>Hello ${user.name || user.username},</p>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <p><a href="${resetUrl}">Reset Password</a></p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
        `
      };

      // Send email
      await this.emailTransporter.sendMail(mailOptions);

      res.status(200).json({ 
        message: 'If your email is registered, you will receive a password reset link shortly' 
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'An error occurred. Please try again later.' });
    }
  }

  // New method to reset password using token
  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      if (!token) {
        return res.status(400).json({ message: 'Token is required' });
      }

      if (!password || password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }

      // Verify token exists and is not expired
      const tokenData = this.passwordResetTokens.get(token);
      if (!tokenData || tokenData.expiry < Date.now()) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }

      // Find user
      const user = await User.findById(tokenData.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update password
      user.password = password; // Password will be hashed by mongoose pre-save hook
      await user.save();

      // Delete the used token
      this.passwordResetTokens.delete(token);

      res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'An error occurred. Please try again later.' });
    }
  }

  // Optional: Add a method to verify email with token
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;
      
      // Verify token exists
      const tokenData = this.emailVerificationTokens.get(token);
      if (!tokenData) {
        return res.status(400).json({ message: 'Invalid verification token' });
      }

      // Find and update user
      const user = await User.findById(tokenData.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Mark email as verified
      user.isEmailVerified = true;
      await user.save();

      // Delete the used token
      this.emailVerificationTokens.delete(token);

      res.status(200).json({ message: 'Email verified successfully' });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ message: 'An error occurred during email verification' });
    }
  }
}

module.exports = new AuthController();