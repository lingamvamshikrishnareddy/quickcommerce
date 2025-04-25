// routes/authRoutes.js
const express = require('express');
const AuthController = require('../controllers/AuthController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes - simplified for quick user acquisition
router.post('/register', AuthController.register.bind(AuthController));
router.post('/login', AuthController.login.bind(AuthController));
router.post('/google-auth', AuthController.googleAuth.bind(AuthController));
router.post('/refresh', AuthController.refreshToken.bind(AuthController));
router.post('/logout', AuthController.logout.bind(AuthController));

// Protected routes
router.get('/profile', protect, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;