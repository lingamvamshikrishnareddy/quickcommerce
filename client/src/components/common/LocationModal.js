import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, X, Plus } from 'lucide-react';
import { useToast } from "../ui/usetoast";
import { locationAPI } from '../../services/api';

const LocationModal = ({ isOpen, onClose, onLocationSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [manualAddress, setManualAddress] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India'
  });
  const [activeTab, setActiveTab] = useState('search');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSuggestions([]);
      setManualAddress({ street: '', city: '', state: '', postalCode: '', country: 'India' });
      setActiveTab('search');
    }
  }, [isOpen]);

  const searchLocations = useCallback(async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const response = await locationAPI.getLocationSuggestions(query);
      setSuggestions(response.data || []);
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      toast({
        title: "Search Error",
        description: "Unable to search locations. Please try again.",
        variant: "destructive"
      });
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleLocationSelectInternal = async (location) => {
    setLoading(true);
    const locationData = {
      display: location.components?.suburb || 
               location.components?.city_district || 
               location.components?.city || 
               location.formatted.split(',')[0] || 
               'Selected Location',
      coords: { latitude: location.geometry.lat, longitude: location.geometry.lng },
      fullAddress: {
        formatted: location.formatted,
        components: location.components
      },
    };

    try {
      await locationAPI.saveUserAddress({ 
        type: 'delivery',
        latitude: location.geometry.lat,
        longitude: location.geometry.lng,
        address: location.formatted,
        label: locationData.display,
      });
      onLocationSelect(locationData);
      onClose();
    } catch (error) {
      console.error('Error saving address:', error);
      toast({
        title: "Save Error",
        description: "Could not save this address for future use. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualAddress.street || !manualAddress.city || !manualAddress.postalCode) {
      toast({
        title: "Incomplete Address",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    const formattedAddress = `${manualAddress.street}, ${manualAddress.city}, ${manualAddress.state}, ${manualAddress.postalCode}, ${manualAddress.country}`;
    const locationData = {
      display: `${manualAddress.city}${manualAddress.state ? `, ${manualAddress.state}` : ''}`,
      coords: { latitude: 0, longitude: 0 }, // NOTE: Manual entry uses placeholder coords.
      fullAddress: {
        formatted: formattedAddress,
        components: {
          road: manualAddress.street,
          city: manualAddress.city,
          state: manualAddress.state,
          postcode: manualAddress.postalCode,
          country: manualAddress.country
        }
      },
    };

    try {
      await locationAPI.saveUserAddress({
        type: 'delivery',
        latitude: 0, 
        longitude: 0,
        address: formattedAddress,
        label: locationData.display,
      });
      onLocationSelect(locationData);
      onClose();
    } catch (error) {
      console.error('Error saving manual address:', error);
      toast({
        title: "Save Error",
        description: "Could not save this address. Please ensure you are logged in and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto flex flex-col"
        >
          {/* ... (The rest of the JSX for the modal is identical to what you provided, so no need to repeat it here. Copy it from your original file.) ... */}
           <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Select Delivery Location</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 flex-grow overflow-y-auto">
          <div className="flex mb-4 border-b">
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'search' 
                  ? 'border-green-500 text-green-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Search Location
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'manual' 
                  ? 'border-green-500 text-green-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Enter Manually
            </button>
          </div>

          {activeTab === 'search' ? (
            <>
              <div className="relative mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchLocations(e.target.value);
                  }}
                  placeholder="Search for area, street, landmark..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>

              {loading && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Searching...</p>
                </div>
              )}

              {!loading && suggestions.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {suggestions.map((location, index) => (
                    <button
                      key={location.properties?.place_id || index} 
                      onClick={() => handleLocationSelectInternal(location)}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-400 transition-all duration-150"
                    >
                      <div className="flex items-start space-x-3">
                        <MapPin className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-grow min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {location.components?.suburb || location.components?.city_district || location.components?.city || location.formatted.split(',')[0] || 'Location'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {location.formatted}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!loading && searchQuery.length >= 2 && suggestions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No locations found.</p>
                  <p className="text-sm">Try a different search or enter manually.</p>
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                <input id="street" type="text" value={manualAddress.street} onChange={(e) => setManualAddress(prev => ({ ...prev, street: e.target.value }))} placeholder="House/Building no. & Street" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input id="city" type="text" value={manualAddress.city} onChange={(e) => setManualAddress(prev => ({ ...prev, city: e.target.value }))} placeholder="City" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" required />
                </div>
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input id="state" type="text" value={manualAddress.state} onChange={(e) => setManualAddress(prev => ({ ...prev, state: e.target.value }))} placeholder="State" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                  <input id="postalCode" type="text" value={manualAddress.postalCode} onChange={(e) => setManualAddress(prev => ({ ...prev, postalCode: e.target.value }))} placeholder="PIN Code" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" required />
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input id="country" type="text" value={manualAddress.country} onChange={(e) => setManualAddress(prev => ({ ...prev, country: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" disabled />
                </div>
              </div>
              <button type="submit" className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors font-medium mt-2" disabled={loading}>
                {loading ? 'Saving...' : 'Set Delivery Location'}
              </button>
            </form>
          )}
        </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default LocationModal;
