import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  User, 
  Package, 
  LogOut,
  ChevronDown,
  Menu,
  ShoppingCart,
  Search,
  MapPin,
  Clock,
  Shield,
  Bike,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LoginDialog, SignUpDialog, ForgotPasswordDialog } from './AuthDialogs';

const Header = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState('Select Location');
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isSignUpDialogOpen, setIsSignUpDialogOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.user-menu') && !event.target.closest('.mobile-menu')) {
        setIsUserMenuOpen(false);
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setIsUserMenuOpen(false);
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleLocationClick = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Here you would typically use a geocoding service to get the address
        setUserLocation('Delivering to Current Location');
      },
      (error) => {
        console.error('Error getting location:', error);
        // Show a user-friendly error message
        alert('Unable to get your location. Please enter it manually.');
      }
    );
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Implement search functionality
      console.log('Searching for:', searchQuery);
    }
  };

  return (
    <>
      {/* Delivery Promise Bar */}
      <div className="bg-green-500 text-white py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center space-x-8">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Delivery in 10 minutes</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">100% Quality Assured</span>
            </div>
            <div className="flex items-center space-x-2">
              <Bike className="h-4 w-4" />
              <span className="text-sm font-medium">Free Delivery Above ₹199</span>
            </div>
          </div>
        </div>
      </div>

      <header 
        className={`bg-white ${isScrolled ? 'shadow-md' : 'shadow-sm'} sticky top-0 z-50 transition-shadow duration-300`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0 hover:opacity-80 transition-opacity">
              <img
                className="h-8 w-auto"
                src="/logo.png"
                alt="Logo"
              />
            </Link>

            {/* Location Selector */}
            <button
              onClick={handleLocationClick}
              className="hidden md:flex items-center space-x-2 text-gray-700 hover:text-green-600 min-w-[200px] transition-colors duration-200"
            >
              <MapPin className="h-5 w-5 text-green-500" />
              <div className="text-left">
                <div className="text-xs text-gray-500">Delivery to</div>
                <div className="text-sm font-medium truncate max-w-[150px]">{userLocation}</div>
              </div>
              <ChevronDown className="h-4 w-4" />
            </button>

            {/* Search Bar */}
            <form 
              onSubmit={handleSearch}
              className="hidden md:flex flex-1 max-w-2xl mx-4"
            >
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for groceries, vegetables & more..."
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 border-none focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-500 transition-colors duration-200"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </form>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <Link 
                to="/cart" 
                className="relative flex items-center text-gray-700 hover:text-green-600 transition-colors duration-200"
              >
                <ShoppingCart className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {cartCount}
                  </span>
                )}
                <span className="ml-2">Cart</span>
              </Link>

              {user ? (
                <div className="relative user-menu">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 text-gray-700 hover:text-green-600 transition-colors duration-200"
                  >
                    <User className="h-5 w-5" />
                    <span className="text-sm">{user.name}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 transition-all duration-200">
                      <div className="py-1">
                        <Link
                          to="/profile"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <User className="h-4 w-4 mr-3" />
                          My Account
                        </Link>
                        <Link
                          to="/orders"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Package className="h-4 w-4 mr-3" />
                          My Orders
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-x-4">
                  <button
                    onClick={() => setIsLoginDialogOpen(true)}
                    className="text-sm text-gray-700 hover:text-green-600 transition-colors duration-200"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setIsSignUpDialogOpen(true)}
                    className="text-sm bg-green-500 text-white px-6 py-2 rounded-full hover:bg-green-600 transition-colors duration-200"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-700 hover:text-green-600 transition-colors duration-200"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t shadow-lg transition-all duration-300 mobile-menu">
            <div className="px-4 pt-2 pb-3 space-y-3">
              {/* Mobile Location */}
              <button
                onClick={handleLocationClick}
                className="flex items-center space-x-2 w-full px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200"
              >
                <MapPin className="h-5 w-5 text-green-500" />
                <div className="text-left">
                  <div className="text-xs text-gray-500">Delivery to</div>
                  <div className="text-sm font-medium truncate max-w-[200px]">{userLocation}</div>
                </div>
              </button>

              {/* Mobile Search */}
              <form onSubmit={handleSearch} className="mb-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for groceries, vegetables & more..."
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 border-none focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-500 transition-colors duration-200"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                </div>
              </form>

              {/* Mobile Cart */}
              <Link
                to="/cart"
                className="flex items-center justify-between w-full px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span>Cart</span>
                </div>
                {cartCount > 0 && (
                  <span className="bg-green-500 text-white text-xs rounded-full px-2 py-1 animate-pulse">
                    {cartCount} items
                  </span>
                )}
              </Link>

              {user ? (
                <>
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 w-full px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-5 w-5" />
                    <span>My Account</span>
                  </Link>
                  <Link
                    to="/orders"
                    className="flex items-center space-x-2 w-full px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Package className="h-5 w-5" />
                    <span>My Orders</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <div className="space-y-2 px-3">
                  <button
                    onClick={() => {
                      setIsLoginDialogOpen(true);
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-center py-2 text-gray-700 hover:text-green-600 transition-colors duration-200"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setIsSignUpDialogOpen(true);
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-center py-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors duration-200"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Auth Dialogs */}
      <LoginDialog 
        isOpen={isLoginDialogOpen}
        onClose={() => setIsLoginDialogOpen(false)}
        onForgotPassword={() => {
          setIsLoginDialogOpen(false);
          setIsForgotPasswordOpen(true);
        }}
      />
      <SignUpDialog
        isOpen={isSignUpDialogOpen}
        onClose={() => setIsSignUpDialogOpen(false)}
      />
      <ForgotPasswordDialog
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </>
  );
};

export default Header;