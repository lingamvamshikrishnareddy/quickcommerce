const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// Profile Routes
router.put('/profile', protect, UserController.updateProfile);
router.get('/profile', protect, UserController.getUserProfile);
router.put('/change-password', protect, UserController.changePassword);

// Address Routes
router.post('/address', protect, UserController.addAddress);
router.put('/address/:addressId', protect, UserController.updateAddress);
router.delete('/address/:addressId', protect, UserController.deleteAddress);
router.put('/address/:addressId/default', protect, UserController.setDefaultAddress);

module.exports = router;