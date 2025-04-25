const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class UserController {
  /**
   * Update User Profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const { 
        name, 
        email, 
        phone, 
        profilePicture,
        preferences 
      } = req.body;

      // Validate email uniqueness
      if (email) {
        const existingUser = await this._checkEmailUniqueness(email, userId);
        if (existingUser) {
          return res.status(400).json({ 
            message: 'Email already in use' 
          });
        }
      }

      // Prepare update data
      const updateData = this._prepareUpdateData(
        { name, email, phone, profilePicture, preferences }
      );

      // Update user profile
      const updatedUser = await this._updateUserProfile(
        userId, 
        updateData
      );

      res.json({
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error) {
      this._handleError(res, error, 'Error updating profile');
    }
  }

  /**
   * Change User Password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async changePassword(req, res) {
    try {
      const userId = req.user.userId;
      const { 
        currentPassword, 
        newPassword 
      } = req.body;

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ 
          message: 'User not found' 
        });
      }

      // Verify and update password
      await this._verifyAndUpdatePassword(
        user, 
        currentPassword, 
        newPassword
      );

      res.json({ 
        message: 'Password changed successfully' 
      });
    } catch (error) {
      this._handleError(res, error, 'Error changing password');
    }
  }

  /**
   * Add New Address
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async addAddress(req, res) {
    try {
      const userId = req.user.userId;
      const addressData = {
        street: req.body.street,
        city: req.body.city,
        state: req.body.state,
        zipCode: req.body.zipCode,
        country: req.body.country,
        type: req.body.type || 'home',
        isDefault: req.body.isDefault || false
      };

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ 
          message: 'User not found' 
        });
      }

      // Reset default addresses if needed
      await this._resetDefaultAddresses(
        userId, 
        addressData.type, 
        addressData.isDefault
      );

      // Add new address
      user.addresses.push(addressData);
      await user.save();

      res.json({
        message: 'Address added successfully',
        address: user.addresses[user.addresses.length - 1]
      });
    } catch (error) {
      this._handleError(res, error, 'Error adding address');
    }
  }

  /**
   * Get User Profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserProfile(req, res) {
    try {
      const userId = req.user.userId;
      const user = await User.findById(userId)
        .select('-password')
        .populate('addresses');
      
      if (!user) {
        return res.status(404).json({
          message: 'User not found'
        });
      }

      res.json({
        message: 'Profile retrieved successfully',
        user
      });
    } catch (error) {
      this._handleError(res, error, 'Error retrieving profile');
    }
  }

  /**
   * Update Existing Address
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateAddress(req, res) {
    try {
      const userId = req.user.userId;
      const { addressId } = req.params;
      const addressData = {
        street: req.body.street,
        city: req.body.city,
        state: req.body.state,
        zipCode: req.body.zipCode,
        country: req.body.country,
        type: req.body.type,
        isDefault: req.body.isDefault
      };

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          message: 'User not found'
        });
      }

      const addressToUpdate = user.addresses.id(addressId);
      if (!addressToUpdate) {
        return res.status(404).json({
          message: 'Address not found'
        });
      }

      // Reset default addresses if needed
      await this._resetDefaultAddresses(
        userId, 
        addressData.type || addressToUpdate.type, 
        addressData.isDefault
      );

      // Update address
      this._updateAddressFields(addressToUpdate, addressData);

      await user.save();

      res.json({
        message: 'Address updated successfully',
        address: addressToUpdate
      });
    } catch (error) {
      this._handleError(res, error, 'Error updating address');
    }
  }

  /**
   * Delete Address
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteAddress(req, res) {
    try {
      const userId = req.user.userId;
      const { addressId } = req.params;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          message: 'User not found'
        });
      }

      user.addresses.pull({ _id: addressId });
      await user.save();

      res.json({
        message: 'Address deleted successfully'
      });
    } catch (error) {
      this._handleError(res, error, 'Error deleting address');
    }
  }

  /**
   * Set Default Address
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async setDefaultAddress(req, res) {
    try {
      const userId = req.user.userId;
      const { addressId } = req.params;
      const { type } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          message: 'User not found'
        });
      }

      const addressToSetDefault = user.addresses.id(addressId);
      if (!addressToSetDefault) {
        return res.status(404).json({
          message: 'Address not found'
        });
      }

      // Reset default addresses
      await this._resetDefaultAddresses(
        userId, 
        addressToSetDefault.type, 
        true
      );

      // Set specific address as default
      addressToSetDefault.isDefault = true;
      await user.save();

      res.json({
        message: 'Default address set successfully',
        address: addressToSetDefault
      });
    } catch (error) {
      this._handleError(res, error, 'Error setting default address');
    }
  }

  // Private Helper Methods

  /**
   * Check email uniqueness
   * @param {string} email - Email to check
   * @param {string} userId - Current user ID
   * @returns {Promise<boolean>} - Whether email is already in use
   * @private
   */
  async _checkEmailUniqueness(email, userId) {
    return await User.findOne({ 
      email, 
      _id: { $ne: userId } 
    });
  }

  /**
   * Prepare update data for profile
   * @param {Object} data - Update data
   * @returns {Object} - Filtered update data
   * @private
   */
  _prepareUpdateData(data) {
    const updateData = {};
    const fields = ['name', 'email', 'phone', 'profilePicture', 'preferences'];
    
    fields.forEach(field => {
      if (data[field]) updateData[field] = data[field];
    });

    return updateData;
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} - Updated user
   * @private
   */
  async _updateUserProfile(userId, updateData) {
    return await User.findByIdAndUpdate(
      userId,
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    ).select('-password');
  }

  /**
   * Verify and update user password
   * @param {Object} user - User object
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @private
   */
  async _verifyAndUpdatePassword(user, currentPassword, newPassword) {
    // Verify current password
    const isMatch = await bcrypt.compare(
      currentPassword, 
      user.password
    );

    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();
  }

  /**
   * Reset default addresses
   * @param {string} userId - User ID
   * @param {string} type - Address type
   * @param {boolean} isDefault - Whether to reset default
   * @private
   */
  async _resetDefaultAddresses(userId, type, isDefault) {
    if (isDefault) {
      await User.updateMany(
        { _id: userId, 'addresses.type': type },
        { $set: { 'addresses.$.isDefault': false } }
      );
    }
  }

  /**
   * Update address fields
   * @param {Object} addressToUpdate - Address to update
   * @param {Object} newData - New address data
   * @private
   */
  _updateAddressFields(addressToUpdate, newData) {
    const fields = [
      'street', 'city', 'state', 
      'zipCode', 'country', 'type', 'isDefault'
    ];

    fields.forEach(field => {
      if (newData[field] !== undefined) {
        addressToUpdate[field] = newData[field];
      }
    });
  }

  /**
   * Handle errors consistently
   * @param {Object} res - Express response object
   * @param {Error} error - Error object
   * @param {string} message - Error message
   * @private
   */
  _handleError(res, error, message) {
    console.error(error);
    res.status(500).json({ 
      message,
      error: error.message 
    });
  }
}

module.exports = new UserController();