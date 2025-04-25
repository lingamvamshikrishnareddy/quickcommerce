import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { authAPI, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY, clearAuthTokens } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  // Initialize auth state from localStorage
  const initializeAuth = useCallback(() => {
    console.log('[AuthContext] Initializing auth state...');
    const storedUser = localStorage.getItem(USER_KEY);
    const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);

    if (storedUser && storedToken) {
      console.log('[AuthContext] Found stored user and token.');
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    } else {
      console.log('[AuthContext] No valid stored session found.');
      clearAuthTokens();
    }
    setLoading(false);
    console.log('[AuthContext] Initialization finished.');
  }, []);

  useEffect(() => {
    initializeAuth();

    const handleAuthExpired = () => {
      console.log('[AuthContext] Auth expired event received.');
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login');
    };

    const handleLoggedOut = () => {
      console.log('[AuthContext] Logged out event received.');
      setUser(null);
      setIsAuthenticated(false);
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    window.addEventListener('auth-logged-out', handleLoggedOut);

    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
      window.removeEventListener('auth-logged-out', handleLoggedOut);
    };
  }, [initializeAuth, navigate]);

  // Login function
  const login = useCallback(async (email, password) => {
    console.log('[AuthContext] login function called for email:', email);
    setError(null);
    setLoading(true);
    try {
      const { user: userData, accessToken, refreshToken } = await authAPI.login(email, password);
      console.log('[AuthContext] login API call successful. User:', userData.email);

      setUser(userData);
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      setIsAuthenticated(true);
      console.log('[AuthContext] User state and localStorage updated.');

      return userData;
    } catch (err) {
      console.error('[AuthContext] login function failed:', err);
      const message = err.message || 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
      console.log('[AuthContext] login function finished.');
    }
  }, []);

  // Register function
   // In AuthContext.jsx, modify the register function:
const register = useCallback(async (userData) => {
  console.log('[AuthContext] register function called for email:', userData.email);
  setError(null);
  setLoading(true);
  try {
    // Call the API to register
    const response = await authAPI.register(userData);
    
    // Access properties directly from response instead of response.data
    const { user: newUser, accessToken, refreshToken } = response;
    
    console.log('[AuthContext] register API call successful. User:', newUser.email);

    setUser(newUser);
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setIsAuthenticated(true);
    
    return newUser;
  } catch (err) {
    console.error('[AuthContext] register function failed:', err);
    const message = err.message || 'Registration failed';
    setError(message);
    throw err;
  } finally {
    setLoading(false);
    console.log('[AuthContext] register function finished.');
  }
}, []);

  // Google OAuth login
  const googleLogin = useCallback(async (idToken) => {
    console.log('[AuthContext] googleLogin function called.');
    setError(null);
    setLoading(true);
    try {
      const { user: userData, accessToken, refreshToken } = await authAPI.googleAuth(idToken);
      console.log('[AuthContext] googleAuth API call successful. User:', userData.email);

      setUser(userData);
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      setIsAuthenticated(true);
      console.log('[AuthContext] User state and localStorage updated after Google login.');

      return userData;
    } catch (err) {
      console.error('[AuthContext] googleLogin function failed:', err);
      const message = err.message || 'Google authentication failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
      console.log('[AuthContext] googleLogin function finished.');
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    console.log('[AuthContext] logout function called.');
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    setUser(null);
    setIsAuthenticated(false);
    clearAuthTokens();
    console.log('[AuthContext] User state and localStorage cleared.');
    try {
      if (refreshToken) {
        console.log('[AuthContext] Calling logout API endpoint...');
        await authAPI.logout(refreshToken);
        console.log('[AuthContext] Logout API call successful.');
      }
    } catch (error) {
      console.error('[AuthContext] Error calling backend logout endpoint:', error);
    } finally {
      setLoading(false);
      navigate('/login');
    }
  }, [navigate]);

  // Update profile
  const updateProfile = useCallback(async (userData) => {
    console.log('[AuthContext] updateProfile function called.');
    setLoading(true);
    setError(null);
    try {
      const updatedUser = await authAPI.updateProfile(userData);
      console.log('[AuthContext] updateProfile API call successful.');

      setUser(prevUser => {
        const newUser = { ...prevUser, ...updatedUser };
        localStorage.setItem(USER_KEY, JSON.stringify(newUser));
        console.log('[AuthContext] User state and localStorage updated after profile update.');
        return newUser;
      });

      return updatedUser;
    } catch (err) {
      console.error('[AuthContext] updateProfile function failed:', err);
      const message = err.message || 'Profile update failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
      console.log('[AuthContext] updateProfile function finished.');
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    googleLogin,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
