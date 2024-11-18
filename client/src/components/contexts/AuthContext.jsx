import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';  // Changed to named import

// Create auth context
const AuthContext = createContext(null);

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedAccessToken && storedRefreshToken && storedUser) {
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
        setUser(JSON.parse(storedUser));
      }

      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Check if token is expired
  const isTokenExpired = useCallback((token) => {
    if (!token) return true;
    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }, []);

  // Refresh token function
  const refreshAccessToken = useCallback(async () => {
    try {
      if (!refreshToken) throw new Error('No refresh token available');

      const response = await axios.post('/auth/refresh', {
        refreshToken,
      });

      const { accessToken: newAccessToken } = response.data;

      setAccessToken(newAccessToken);
      localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);

      return newAccessToken;
    } catch (error) {
      // If refresh fails, log out the user
      logout();
      throw new Error('Session expired. Please login again.');
    }
  }, [refreshToken]);

  // Setup axios interceptors
  useEffect(() => {
    // Request interceptor
    const requestIntercept = api.interceptors.request.use(
      async (config) => {
        if (!accessToken) return config;

        // Check if access token is expired
        if (isTokenExpired(accessToken)) {
          const newAccessToken = await refreshAccessToken();
          config.headers.Authorization = `Bearer ${newAccessToken}`;
        } else {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    const responseIntercept = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried to refresh the token yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newAccessToken = await refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    // Cleanup interceptors
    return () => {
      api.interceptors.request.eject(requestIntercept);
      api.interceptors.response.eject(responseIntercept);
    };
  }, [accessToken, refreshAccessToken, isTokenExpired]);

  // Login function
  const login = useCallback(async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      const response = await api.post('/auth/login', {
        email,
        password,
      });

      const { user: userData, accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

      setUser(userData);
      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);

      localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));

      return userData;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Register function
  const register = useCallback(async (userData) => {
    try {
      setError(null);
      setLoading(true);

      const response = await api.post('/auth/register', userData);

      const { user: newUser, accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

      setUser(newUser);
      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);

      localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));

      return newUser;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      if (refreshToken) {
        // Notify backend about logout
        await api.post('/auth/logout', {
          refreshToken,
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state and storage
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }, [refreshToken]);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    api, // Expose configured axios instance
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export the API instance for use in other parts of the application
export { api };