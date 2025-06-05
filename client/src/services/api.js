import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// Token storage keys
export const ACCESS_TOKEN_KEY = 'accessToken';
export const REFRESH_TOKEN_KEY = 'refreshToken';
export const USER_KEY = 'userProfile';

/**
 * Base API configuration and utility methods
 */
class APIService {
  constructor() {
    // Use environment variable with proper fallback to deployed URL
    this.baseURL = 'https://quickcommerce-backend-d31q.onrender.com/api';
    this.timeout = 20000; // Increased to 20 seconds for Render free tier

    console.log("API Base URL:", this.baseURL);

    // Create Axios instance with enhanced retry logic
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Initialize retry counters for specific endpoints
    this.retryCounters = {};
    this.maxRetries = 3;

    // Add request interceptor for auth tokens
    this.api.interceptors.request.use(
      async (config) => {
        const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (accessToken && !this.isTokenExpired(accessToken)) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        } else if (accessToken) {
          try {
            const newAccessToken = await this.refreshAccessToken();
            if (newAccessToken) {
              config.headers.Authorization = `Bearer ${newAccessToken}`;
            } else {
              this.clearAuthTokens();
            }
          } catch (error) {
            console.error("Failed to refresh token in request interceptor:", error);
            this.clearAuthTokens();
            delete config.headers.Authorization;
          }
        }
        return config;
      },
      (error) => {
        console.error("Axios request error:", error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor with enhanced retry logic
    this.api.interceptors.response.use(
      response => response,
      async error => {
        const { config, response } = error;

        // Skip retry for specific error types
        if (!config || !config.url || config._isRetryComplete) {
          return Promise.reject(error);
        }

        const endpoint = config.url;

        // Initialize retry counter for this endpoint if not exists
        if (!this.retryCounters[endpoint]) {
          this.retryCounters[endpoint] = 0;
        }

        // Check if retry is needed and possible
        const shouldRetry = (
          this.retryCounters[endpoint] < this.maxRetries &&
          (!response || response.status === 429 || response.status >= 500 || response.status === 0)
        );

        if (shouldRetry) {
          this.retryCounters[endpoint]++;

          // Exponential backoff - wait longer for each retry
          const delay = Math.min(1000 * (2 ** this.retryCounters[endpoint]), 10000);
          console.log(`Retrying ${endpoint} (${this.retryCounters[endpoint]}/${this.maxRetries}) after ${delay}ms...`);

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));

          // Reset counter if we've reached max retries
          if (this.retryCounters[endpoint] >= this.maxRetries) {
            console.log(`Max retries (${this.maxRetries}) reached for ${endpoint}`);
            config._isRetryComplete = true;
            this.retryCounters[endpoint] = 0;
          }

          // Retry the request
          return this.api(config);
        }

        // Reset counter after all retries exhausted
        this.retryCounters[endpoint] = 0;

        return Promise.reject(error);
      }
    );
  }

  isTokenExpired(token) {
    if (!token) return true;
    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp < currentTime;
    } catch (error) {
      console.error('Error decoding token:', error);
      return true;
    }
  }

  async refreshAccessToken() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken || this.isTokenExpired(refreshToken)) {
      console.log("No valid refresh token available.");
      this.clearAuthTokens();
      throw new Error('No valid refresh token available');
    }

    try {
      const refreshApi = axios.create({ baseURL: this.baseURL, timeout: this.timeout });
      const response = await refreshApi.post('/auth/refresh', { refreshToken });
      const { accessToken: newAccessToken } = response.data;

      if (!newAccessToken) {
        throw new Error('Invalid response from token refresh endpoint.');
      }

      console.log("Received new access token.");
      localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
      return newAccessToken;
    } catch (error) {
      console.error('Error refreshing access token:', error.response?.data?.message || error.message);
      this.clearAuthTokens();
      throw new Error('Session expired or invalid. Please login again.');
    }
  }

  clearAuthTokens() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    console.log("Auth tokens cleared.");
  }

  // Added: new method to check if backend is awake or needs wakeup
  async pingBackend() {
    try {
      // Create a new instance for ping to avoid interceptors
      const pingApi = axios.create({
        baseURL: this.baseURL,
        timeout: 5000 // Short timeout just for ping
      });

      console.log("Pinging backend to wake it up...");
      const startTime = Date.now();
      const response = await pingApi.get('/ping');
      const responseTime = Date.now() - startTime;

      console.log(`Backend responded in ${responseTime}ms:`, response.data);
      return {
        success: true,
        responseTime,
        message: response.data?.message || 'Backend is awake'
      };
    } catch (error) {
      console.warn("Backend ping failed:", error.message);
      return {
        success: false,
        message: 'Backend may be starting up, please wait a moment'
      };
    }
  }

  handleApiError(error) {
    let message = 'An unknown error occurred.';
    let details = null;

    if (error.response) {
      message = error.response.data?.message || error.response.data?.error || `Request failed with status ${error.response.status}`;
      details = error.response.data?.errors;
      console.error(`API Error Response (${error.response.status}):`, message, error.response.data);
    } else if (error.request) {
      if (error.message.toLowerCase().includes('timeout')) {
        message = `Request Timeout (${this.timeout / 1000}s). Our server might be waking up - please try again in a moment.`;
      } else if (error.message.toLowerCase().includes('network error')) {
        message = 'Network Error. Please check your connection or try again in a moment as our server wakes up.';
      } else {
        message = 'No response received from server. The server might be starting up - please try again in a moment.';
      }
      console.error('API Request Error (No Response):', error.message, error.request);
    } else {
      message = `Request setup error: ${error.message}`;
      console.error('API Request Setup Error:', error.message);
    }

    const formattedError = new Error(message);
    formattedError.originalError = error;
    formattedError.details = details;
    formattedError.statusCode = error.response?.status;

    return formattedError;
  }

  formatPrice(price, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  }

  calculateDiscount(mrp, salePrice) {
    if (mrp && salePrice && mrp > salePrice) {
      return Math.round(((mrp - salePrice) / mrp) * 100);
    }
    return 0;
  }
}

const apiService = new APIService();
export const api = apiService.api;
export const calculateDiscount = apiService.calculateDiscount;
export const clearAuthTokens = apiService.clearAuthTokens;
export const pingBackend = () => apiService.pingBackend();

// The rest of the API services remain largely the same with small adjustments for error handling

// Modified categoryAPI and productAPI to handle backend wake-up
export const categoryAPI = {
  getAll: async (params = {}) => {
    // Try to wake up backend first
    await apiService.pingBackend();
    return api.get('/categories', { params });
  },
  getAllCategories: async (params = {}) => {
    // Try to wake up backend first
    await apiService.pingBackend();
    return api.get('/categories', { params });
  },
  getById: (id) => api.get(`/categories/${id}`),
  getCategoryBySlug: (slug) => api.get(`/categories/slug/${slug}`),
  getSubCategories: (categorySlug) => api.get(`/categories/slug/${categorySlug}/subcategories`),
  getFeaturedCategories: async (params = {}) => {
    // Try to wake up backend first
    await apiService.pingBackend();
    return api.get('/categories/featured', { params });
  },
};

export const productAPI = {
  getProducts: async (params = {}) => {
    // Log params for debugging
    console.log("API call params:", params);

    // Try to wake up backend first
    await apiService.pingBackend();

    return api.get('/products', { params });
  },
  getById: (id) => api.get(`/products/${id}`),
  getBySlug: (slug) => api.get(`/products/slug/${slug}`),
  search: (params = {}) => api.get('/products/search', { params }),
  addProductReview: (productId, reviewData) => api.post(`/products/${productId}/reviews`, reviewData),
  getFeaturedProducts: async (params = {}) => {
    // Try to wake up backend first
    await apiService.pingBackend();
    return api.get('/products/featured', { params });
  },
};

// Rest of the API services remain the same
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.accessToken && response.data.refreshToken && response.data.user) {
      localStorage.setItem(ACCESS_TOKEN_KEY, response.data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
    } else {
      console.warn("Login response missing tokens or user data.");
    }
    return response.data;
  },
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.accessToken && response.data.refreshToken && response.data.user) {
      localStorage.setItem(ACCESS_TOKEN_KEY, response.data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
    } else {
      console.warn("Registration response missing tokens or user data.");
    }
    return response.data;
  },
  logout: async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch (error) {
        console.error("Backend logout failed (token might be invalid already):", error.message);
      }
    }
    clearAuthTokens();
    window.dispatchEvent(new CustomEvent('auth-logged-out'));
  },
  fetchUserProfile: async () => {
    try {
      const response = await api.get('/user/profile');
      if (response.data?.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
        return response.data.user;
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      return null;
    }
  },
};

export const cartAPI = {
  getCart: async () => {
    try {
      const response = await api.get('/cart');
      if (response.data && response.data.success) {
        return response.data.data;
      } else {
        console.warn("Get cart response structure unexpected:", response.data);
        throw new Error(response.data?.message || "Invalid cart response");
      }
    } catch (error) {
      // If 404, return empty cart structure instead of error
      if (error.response && error.response.status === 404) {
        return { items: [], total: 0 };
      }

      // Extract error message if available
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }

      console.error("Error fetching cart:", error);
      throw error;
    }
  },

  addItem: async (productId, quantity = 1, variation = null) => {
    try {
      if (!productId) {
        throw new Error("Product ID is required");
      }

      const response = await api.post('/cart/items', { productId, quantity, variation });
      console.log("Add to cart response:", response);

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to add item to cart");
      }

      return response;
    } catch (error) {
      if (error.response) {
        console.error(`API Error Response (${error.response.status}):`, error.response.data);
        throw new Error(error.response.data?.message || `Server error: ${error.response.status}`);
      }
      console.error("Error adding item to cart:", error);
      throw error;
    }
  },

  updateItem: async (itemId, quantity) => {
    try {
      const response = await api.put(`/cart/items/${itemId}`, { quantity });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to update cart item");
      }

      return response;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data?.message || `Server error: ${error.response.status}`);
      }
      console.error("Error updating cart item:", error);
      throw error;
    }
  },

  removeItem: async (itemId) => {
    try {
      const response = await api.delete(`/cart/items/${itemId}`);

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to remove item from cart");
      }

      return response;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data?.message || `Server error: ${error.response.status}`);
      }
      console.error("Error removing item from cart:", error);
      throw error;
    }
  },

  clearCart: async () => {
    try {
      const response = await api.delete('/cart');

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to clear cart");
      }

      return response;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data?.message || `Server error: ${error.response.status}`);
      }
      console.error("Error clearing cart:", error);
      throw error;
    }
  },

  applyCoupon: async (code) => {
    try {
      const response = await api.post('/cart/apply-coupon', { code });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to apply coupon");
      }

      return response;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data?.message || `Server error: ${error.response.status}`);
      }
      console.error("Error applying coupon:", error);
      throw error;
    }
  },
};

export const orderAPI = {
  createOrder: async (orderData) => {
    console.log("[API Layer] Sending createOrder request:", orderData);
    try {
      const response = await api.post('/orders', orderData);
      console.log("[API Layer] Received Axios response status:", response.status);
      console.log("[API Layer] Received Axios response data:", response.data);
      return response.data;
    } catch (error) {
      console.error("[API Layer] Axios request failed:", error.response?.status, error.response?.data, error.message);
      throw error.response?.data || error;
    }
  },
  getUserOrders: async (params = {}) => {
    try {
      // Make sure params are properly formatted
      const response = await api.get('/orders/my', {
        params: {
          page: params.page || 1,
          limit: params.limit || 10,
          status: params.status,
          sort: params.sort
        }
      });

      return response.data;
    } catch (error) {
      console.error("[API Layer] Error fetching user orders:", error);
      throw error;
    }
  },
  getOrderById: async (orderId) => {
    console.log(`[apiService.getOrderById] Calling GET /orders/${orderId}`);
    try {
      const response = await api.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error("[API Layer] Error fetching order details:", error);
      throw error.response?.data || error;
    }
  },
  cancelOrder: (orderId) => api.delete(`/orders/${orderId}`),
};

export const paymentAPI = {
  verifyPayment: async (verificationData) => {
    console.log("[API Layer] Sending verifyPayment request:", verificationData);
    try {
      const response = await api.post('/payments/verify', verificationData);
      console.log("[API Layer] Received verifyPayment status:", response.status);
      console.log("[API Layer] Received verifyPayment data:", response.data);
      if (!response || !response.data) {
          console.error("[API Layer] Invalid/empty response received from verifyPayment");
          throw new Error("Empty response from verification API");
      }
      return response.data;
    } catch (error) {
      console.error("[API Layer] Verify Payment Axios Error:", error.response?.status, error.response?.data || error.message);
      throw error.response?.data || error;
    }
  }
};

export const deliveryAPI = {
  getStatusByOrderId: (orderId) => api.get(`/delivery/order/${orderId}/status`),
  requestOTP: (deliveryId) => api.post(`/delivery/${deliveryId}/request-otp`),
  verifyOTP: (deliveryId, otp) => api.post(`/delivery/${deliveryId}/verify-otp`, { otp }),
  updateLocation: (deliveryId, latitude, longitude) => api.put(`/delivery/${deliveryId}/location`, { latitude, longitude }),
};

export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (profileData) => api.put('/user/profile', profileData),
  getWishlist: () => api.get('/user/wishlist'),
  addToWishlist: (productId) => api.post('/user/wishlist', { productId }),
  removeFromWishlist: (productId) => api.delete(`/user/wishlist/${productId}`),
};

export const formatPrice = (amount) => {
  // Basic price formatting, adjust as needed
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR', // Change currency code if necessary
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

const detectUserLocation = async () => {
  // Check if geolocation is supported
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by your browser. Please enter your location manually.');
  }

  try {
    // Get user's current position with proper options
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        (error) => {
          let errorMessage;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permission in your browser and try again.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable. Please check your internet connection or enter location manually.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again or enter location manually.';
              break;
            default:
              errorMessage = 'An unknown error occurred while detecting location. Please try again.';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // Increased timeout
          maximumAge: 300000 // Cache for 5 minutes
        }
      );
    });

    const { latitude, longitude } = position.coords;
    
    // Call reverse geocoding API
    const response = await locationAPI.reverseGeocode(latitude, longitude);
    
    if (!response?.data?.success || !response.data.address) {
      throw new Error('Could not find address details for your location. Please enter manually.');
    }

    return {
      coords: { latitude, longitude },
      address: response.data.address
    };
  } catch (error) {
    console.error('Location detection error:', error);
    throw error;
  }
};

/**
 * Main function to handle auto-detection with proper error handling
 */
export const handleAutoDetectLocation = async () => {
  try {
    const locationData = await detectUserLocation();
    const address = locationData.address;
    
    // Extract display name with fallback chain
    const displayName = 
      address.components?.suburb ||
      address.components?.city_district ||
      address.components?.city ||
      address.components?.town ||
      address.components?.village ||
      address.components?.county ||
      address.components?.state ||
      (address.formatted ? address.formatted.split(',')[0]?.trim() : null) ||
      'Current Location';

    return {
      display: displayName,
      fullAddress: address,
      coords: locationData.coords,
    };
  } catch (error) {
    console.error('Auto-detect location error:', error);
    throw error; // Re-throw to let the component handle it
  }
};

// Fixed location API object
export const locationAPI = {
  // Reverse geocoding
  reverseGeocode: async (latitude, longitude) => {
    try {
      const response = await api.get('/location/geocode', { 
        params: { latitude, longitude } 
      });
      return response;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      throw new Error('Failed to get address from coordinates');
    }
  },
  
  // Save user address with better error handling
  saveUserAddress: async (addressData) => {
    try {
      const response = await api.post('/location/addresses', addressData);
      return response;
    } catch (error) {
      console.error('Save address error:', error);
      if (error.response?.status === 401) {
        throw new Error('Please log in to save your address');
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || 'Invalid address data');
      } else {
        throw new Error('Failed to save address. Please try again.');
      }
    }
  },
  
  // Get user addresses
  getUserAddresses: async () => {
    try {
      const response = await api.get('/location/addresses');
      return response;
    } catch (error) {
      console.error('Get addresses error:', error);
      if (error.response?.status === 401) {
        throw new Error('Please log in to view your addresses');
      }
      throw new Error('Failed to load addresses');
    }
  },
  
  // Delete user address
  deleteUserAddress: async (locationId) => {
    try {
      const response = await api.delete(`/location/addresses/${locationId}`);
      return response;
    } catch (error) {
      console.error('Delete address error:', error);
      throw new Error('Failed to delete address');
    }
  },
  
  // Get location suggestions with better error handling
  getLocationSuggestions: async (query) => {
    try {
      if (!query || query.length < 2) {
        return { data: [] };
      }
      const response = await api.get('/location/suggestions', { 
        params: { query: query.trim() } 
      });
      return response;
    } catch (error) {
      console.error('Location suggestions error:', error);
      return { data: [] }; // Return empty array on error
    }
  },
  
  // Check deliverability with better error handling
  checkDeliverability: async (postalCode) => {
    try {
      if (!postalCode) return false;
      
      const response = await api.get('/location/check-deliverability', { 
        params: { postalCode: postalCode.toString().trim() } 
      });
      return response.data?.isDeliverable || false;
    } catch (error) {
      console.error('Deliverability check error:', error);
      return false; // Default to not deliverable on error
    }
  }
};



export const handleSubmit = async (formData) => {
  try {
    const response = await fetch('http://localhost:5000/api/support/contact-support', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (response.ok) {
      alert('Support request submitted!');
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Error submitting form:', error);
    alert('Server error. Try again later.');
  }
};

export default apiService;
