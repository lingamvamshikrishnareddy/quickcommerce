const axios = require('axios');
const Location = require('../models/location');
const mongoose = require('mongoose');

/**
 * Location Controller
 * Handles geocoding and user location management
 */
class LocationController {
  constructor() {
    // Bind all methods to this instance
    this.reverseGeocode = this.reverseGeocode.bind(this);
    this.getLocationSuggestions = this.getLocationSuggestions.bind(this);
    this.checkDeliverability = this.checkDeliverability.bind(this);
    this.getUserAddresses = this.getUserAddresses.bind(this);
    this.saveUserAddress = this.saveUserAddress.bind(this);
    this.deleteUserAddress = this.deleteUserAddress.bind(this);
  }

  /**
   * Convert coordinates to address using OpenCage API
   * @param {Object} req - Express request object with latitude/longitude query params
   * @param {Object} res - Express response object
   */
  async reverseGeocode(req, res) {
    const { latitude, longitude } = this.getCoordinates(req.query);
    const OPENCAGE_API_KEY = process.env.OPENCAGE_API_KEY;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    if (!OPENCAGE_API_KEY) {
      return res.status(500).json({ success: false, message: 'Location service is not configured properly' });
    }

    try {
      const url = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${OPENCAGE_API_KEY}&pretty=1&no_annotations=1`;
      const response = await axios.get(url);

      if (!response.data?.results?.length) {
        return res.status(404).json({ success: false, message: 'Address not found for given coordinates' });
      }

      const result = response.data.results[0];
      res.status(200).json({ success: true, address: { formatted: result.formatted, components: result.components } });
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return res.status(500).json({ success: false, message: 'An error occurred during geocoding' });
    }
  }

  /**
   * Get location suggestions from address query string
   * @param {Object} req - Express request object with query param
   * @param {Object} res - Express response object
   */
  async getLocationSuggestions(req, res) {
    const { query } = req.query;
    const OPENCAGE_API_KEY = process.env.OPENCAGE_API_KEY;

    if (!query || query.length < 2) {
      return res.status(400).json({ success: false, message: 'Query parameter must be at least 2 characters' });
    }

    if (!OPENCAGE_API_KEY) {
      return res.status(500).json({ success: false, message: 'Location service is not configured properly' });
    }

    try {
      const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${OPENCAGE_API_KEY}&limit=5`;
      const response = await axios.get(url);

      if (!response.data?.results?.length) {
        return res.status(200).json([]);
      }

      const suggestions = response.data.results.map(result => ({
        formatted: result.formatted,
        components: result.components,
        geometry: result.geometry
      }));

      res.status(200).json(suggestions);
    } catch (error) {
      console.error('Location suggestions error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch location suggestions' });
    }
  }

  /**
   * Check if delivery is available at the provided postal code
   * @param {Object} req - Express request object with postalCode query param
   * @param {Object} res - Express response object
   */
  async checkDeliverability(req, res) {
    const code = req.query.postalCode || req.query.zipCode || req.query.pincode;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Postal code is required' });
    }

    try {
      const isDeliverable = await this.isDeliveryAvailable(code);
      res.status(200).json({ success: true, isDeliverable });
    } catch (error) {
      console.error('Deliverability check error:', error);
      return res.status(500).json({ success: false, message: 'Failed to check delivery availability' });
    }
  }

  /**
   * Helper method to check if delivery is available
   * Replace with actual implementation that connects to your database
   * @param {string} postalCode
   * @returns {Promise<boolean>}
   */
  async isDeliveryAvailable(postalCode) {
    try {
      const deliverablePostalCodes = ['10001', '90210', '60601', '75001', '20001'];
      return deliverablePostalCodes.includes(postalCode);
    } catch (error) {
      console.error('Error checking delivery availability:', error);
      return false;
    }
  }

  /**
   * Get all saved addresses for the authenticated user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserAddresses(req, res) {
    try {
      const userId = req.user.id;
      const addresses = await Location.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 }).lean();
      res.status(200).json({ success: true, data: addresses });
    } catch (error) {
      console.error('Error fetching user addresses:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch addresses' });
    }
  }

  /**
   * Save a new address for the authenticated user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async saveUserAddress(req, res) {
    try {
      const userId = req.user.id;
      const { type, latitude, longitude, address, label, isDefault } = req.body;

      if (!type || !latitude || !longitude || !address) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      if (isDefault) {
        await Location.updateMany({ user: userId, isDefault: true }, { $set: { isDefault: false } });
      }

      const location = new Location({
        user: userId,
        type,
        latitude,
        longitude,
        address,
        label: label || '',
        isDefault: !!isDefault
      });

      await location.save();
      res.status(201).json({ success: true, data: location });
    } catch (error) {
      console.error('Error saving address:', error);
      res.status(500).json({ success: false, message: 'Failed to save address' });
    }
  }

  /**
   * Delete a user address by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteUserAddress(req, res) {
    try {
      const userId = req.user.id;
      const { locationId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(locationId)) {
        return res.status(400).json({ success: false, message: 'Invalid location ID' });
      }

      const deletedLocation = await Location.findOneAndDelete({ _id: locationId, user: userId });

      if (!deletedLocation) {
        return res.status(404).json({ success: false, message: 'Address not found or not authorized to delete' });
      }

      if (deletedLocation.isDefault) {
        const anyLocation = await Location.findOne({ user: userId }).sort({ createdAt: -1 });
        if (anyLocation) {
          anyLocation.isDefault = true;
          await anyLocation.save();
        }
      }

      res.status(200).json({ success: true, message: 'Address deleted successfully' });
    } catch (error) {
      console.error('Error deleting address:', error);
      res.status(500).json({ success: false, message: 'Failed to delete address' });
    }
  }

  /**
   * Helper method to extract coordinates from query params
   * @param {Object} query - Express query object
   * @returns {Object} - Object containing latitude and longitude
   */
  getCoordinates(query) {
    return {
      latitude: query.latitude || query.lat,
      longitude: query.longitude || query.lon
    };
  }
}

module.exports = new LocationController();