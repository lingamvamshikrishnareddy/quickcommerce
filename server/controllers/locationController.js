// controllers/locationController.js - Fixed version
const axios = require('axios');
const Location = require('../models/Location');
const mongoose = require('mongoose');

/**
 * Location Controller - Fixed version with proper error handling
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
   */
  async reverseGeocode(req, res) {
    try {
      const { latitude, longitude } = this.getCoordinates(req.query);
      const OPENCAGE_API_KEY = process.env.OPENCAGE_API_KEY;

      // Validate inputs
      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Valid latitude and longitude are required' 
        });
      }

      if (!OPENCAGE_API_KEY) {
        console.error('OPENCAGE_API_KEY not configured');
        return res.status(500).json({ 
          success: false, 
          message: 'Location service is not configured properly' 
        });
      }

      // Validate coordinate ranges
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinate values'
        });
      }

      const url = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${OPENCAGE_API_KEY}&pretty=1&no_annotations=1&language=en`;
      
      const response = await axios.get(url, {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'QuickCommerce/1.0'
        }
      });

      if (!response.data?.results?.length) {
        return res.status(404).json({ 
          success: false, 
          message: 'Address not found for given coordinates' 
        });
      }

      const result = response.data.results[0];
      
      // Return structured response
      return res.status(200).json({ 
        success: true, 
        address: { 
          formatted: result.formatted, 
          components: result.components 
        } 
      });

    } catch (error) {
      console.error('Reverse geocoding error:', error);
      
      if (error.code === 'ECONNABORTED') {
        return res.status(408).json({ 
          success: false, 
          message: 'Location service timeout. Please try again.' 
        });
      }
      
      if (error.response?.status === 402) {
        return res.status(503).json({ 
          success: false, 
          message: 'Location service quota exceeded. Please try again later.' 
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to get location details. Please try again.' 
      });
    }
  }

  /**
   * Get location suggestions from address query string
   */
  async getLocationSuggestions(req, res) {
    try {
      const { query } = req.query;
      const OPENCAGE_API_KEY = process.env.OPENCAGE_API_KEY;

      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        return res.status(400).json({ 
          success: false, 
          message: 'Query parameter must be at least 2 characters' 
        });
      }

      if (!OPENCAGE_API_KEY) {
        console.error('OPENCAGE_API_KEY not configured');
        return res.status(500).json({ 
          success: false, 
          message: 'Location service is not configured properly' 
        });
      }

      const cleanQuery = query.trim();
      const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(cleanQuery)}&key=${OPENCAGE_API_KEY}&limit=8&no_annotations=1&language=en&countrycode=in`;
      
      const response = await axios.get(url, {
        timeout: 8000,
        headers: {
          'User-Agent': 'QuickCommerce/1.0'
        }
      });

      if (!response.data?.results?.length) {
        return res.status(200).json({ success: true, data: [] });
      }

      // Filter and format suggestions
      const suggestions = response.data.results
        .filter(result => result.components && result.geometry)
        .map(result => ({
          formatted: result.formatted,
          components: result.components,
          geometry: result.geometry,
          properties: {
            place_id: result.annotations?.DMS?.lat + result.annotations?.DMS?.lng || Math.random().toString(36)
          }
        }))
        .slice(0, 5); // Limit to 5 results

      return res.status(200).json({ success: true, data: suggestions });

    } catch (error) {
      console.error('Location suggestions error:', error);
      
      if (error.code === 'ECONNABORTED') {
        return res.status(408).json({ 
          success: false, 
          message: 'Search timeout. Please try again.' 
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch location suggestions' 
      });
    }
  }

  /**
   * Check if delivery is available at the provided postal code
   */
  async checkDeliverability(req, res) {
    try {
      const code = req.query.postalCode || req.query.zipCode || req.query.pincode;

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: 'Postal code is required' 
        });
      }

      const cleanCode = code.trim();
      const isDeliverable = await this.isDeliveryAvailable(cleanCode);
      
      return res.status(200).json({ 
        success: true, 
        isDeliverable 
      });

    } catch (error) {
      console.error('Deliverability check error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to check delivery availability' 
      });
    }
  }

  /**
   * Enhanced delivery availability check
   */
  async isDeliveryAvailable(postalCode) {
    try {
      // Indian postal codes (6 digits)
      const indianPostalPattern = /^[1-9][0-9]{5}$/;
      
      if (!indianPostalPattern.test(postalCode)) {
        return false;
      }

      // Example deliverable postal codes - replace with your actual logic
      const deliverablePostalCodes = [
        // Major cities
        '110001', '110002', '110003', '110004', '110005', // Delhi
        '400001', '400002', '400003', '400004', '400005', // Mumbai
        '560001', '560002', '560003', '560004', '560005', // Bangalore
        '600001', '600002', '600003', '600004', '600005', // Chennai
        '700001', '700002', '700003', '700004', '700005', // Kolkata
        '500001', '500002', '500003', '500004', '500005', // Hyderabad
        '411001', '411002', '411003', '411004', '411005', // Pune
        '380001', '380002', '380003', '380004', '380005', // Ahmedabad
      ];
      
      // Check if the postal code is in deliverable areas
      return deliverablePostalCodes.includes(postalCode);
      
    } catch (error) {
      console.error('Error checking delivery availability:', error);
      return false;
    }
  }

  /**
   * Get all saved addresses for the authenticated user
   */
  async getUserAddresses(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }

      const userId = req.user.id;
      const addresses = await Location.find({ user: userId })
        .sort({ isDefault: -1, createdAt: -1 })
        .lean();
      
      return res.status(200).json({ 
        success: true, 
        data: addresses 
      });

    } catch (error) {
      console.error('Error fetching user addresses:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch addresses' 
      });
    }
  }

  /**
   * Save a new address for the authenticated user
   */
  async saveUserAddress(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required to save address' 
        });
      }

      const userId = req.user.id;
      const { type, latitude, longitude, address, label, isDefault } = req.body;

      // Validate required fields
      if (!type || !address) {
        return res.status(400).json({ 
          success: false, 
          message: 'Type and address are required fields' 
        });
      }

      // Validate latitude and longitude
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Valid latitude and longitude are required' 
        });
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinate values'
        });
      }

      // Start a transaction for consistency
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // If this is set as default, unset all other defaults for this user
        if (isDefault) {
          await Location.updateMany(
            { user: userId, isDefault: true }, 
            { $set: { isDefault: false } }, 
            { session }
          );
        }

        // Create new location
        const location = new Location({
          user: userId,
          type: type.toLowerCase(),
          latitude: lat,
          longitude: lng,
          address: address.trim(),
          label: label ? label.trim() : '',
          isDefault: !!isDefault
        });

        await location.save({ session });
        await session.commitTransaction();

        return res.status(201).json({ 
          success: true, 
          data: location,
          message: 'Address saved successfully' 
        });

      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }

    } catch (error) {
      console.error('Error saving address:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid address data: ' + error.message 
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to save address. Please try again.' 
      });
    }
  }

  /**
   * Delete a user address by ID
   */
  async deleteUserAddress(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }

      const userId = req.user.id;
      const { locationId } = req.params;

      if (!locationId || !mongoose.Types.ObjectId.isValid(locationId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid location ID' 
        });
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const deletedLocation = await Location.findOneAndDelete(
          { _id: locationId, user: userId }, 
          { session }
        );

        if (!deletedLocation) {
          await session.abortTransaction();
          return res.status(404).json({ 
            success: false, 
            message: 'Address not found or not authorized to delete' 
          });
        }

        // If deleted location was default, set another one as default
        if (deletedLocation.isDefault) {
          const anyLocation = await Location.findOne({ user: userId })
            .sort({ createdAt: -1 })
            .session(session);
          
          if (anyLocation) {
            anyLocation.isDefault = true;
            await anyLocation.save({ session });
          }
        }

        await session.commitTransaction();
        
        return res.status(200).json({ 
          success: true, 
          message: 'Address deleted successfully' 
        });

      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }

    } catch (error) {
      console.error('Error deleting address:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to delete address' 
      });
    }
  }

  /**
   * Helper method to extract and validate coordinates from query params
   */
  getCoordinates(query) {
    const latitude = parseFloat(query.latitude || query.lat);
    const longitude = parseFloat(query.longitude || query.lon);
    
    return {
      latitude: !isNaN(latitude) ? latitude : null,
      longitude: !isNaN(longitude) ? longitude : null
    };
  }
}

module.exports = new LocationController();
