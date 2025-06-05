import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  User, Package, LogOut, ChevronDown, Menu, ShoppingCart, Search, MapPin, Clock, Shield, Bike, X, Plus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { handleAutoDetectLocation, locationAPI } from '../../services/api';
import { LoginDialog, SignUpDialog, ForgotPasswordDialog } from './AuthDialogs';
import { useToast } from "../ui/usetoast";
import { motion, AnimatePresence } from 'framer-motion';
import LocationModal from './LocationModal'; // Import the separated component

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [userLocation, setUserLocation] = useState({
    display: 'Select Location',
    coords: null,
    fullAddress: null,
    loading: false,
    error: null
  });
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isSignUpDialogOpen, setIsSignUpDialogOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Effect to handle showing login dialog from URL param
  useEffect(() => {
    if (searchParams.get('showLogin') === 'true' && !isAuthenticated) {
      setIsLoginDialogOpen(true);
      searchParams.delete('showLogin');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, isAuthenticated]);
  
  // Effect to handle header shadow on scroll
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Effect to handle clicks outside of menus
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.user-menu-container') && !event.target.closest('.user-menu-button')) {
        setIsUserMenuOpen(false);
      }
      if (!event.target.closest('.mobile-menu-content') && !event.target.closest('.mobile-menu-button')) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Effect to load saved location from localStorage on initial render
  useEffect(() => {
    const savedLocation = localStorage.getItem('userDeliveryLocation');
    if (savedLocation) {
      try {
        const parsedLocation = JSON.parse(savedLocation);
        if (parsedLocation && parsedLocation.display && parsedLocation.display !== 'Select Location') {
          setUserLocation(prev => ({...prev, ...parsedLocation, loading: false, error: null}));
        }
      } catch (error) {
        console.error('Error parsing saved location:', error);
        localStorage.removeItem('userDeliveryLocation');
      }
    }
  }, []);

  // Effect to save location to localStorage whenever it changes
  useEffect(() => {
    if (userLocation.display !== 'Select Location' && !userLocation.error && !userLocation.loading) {
      localStorage.setItem('userDeliveryLocation', JSON.stringify(userLocation));
    }
  }, [userLocation]);

  const handleLogout = async () => {
    try {
      await logout();
      setIsUserMenuOpen(false);
      setIsMenuOpen(false);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      toast({ title: "Logout Failed", description: error.message || "Could not log out.", variant: "destructive" });
    }
  };
  
  const checkDeliverability = useCallback(async (locationData) => {
    if (!locationData?.fullAddress?.components) {
        console.log('No location components to check deliverability');
        return;
    }
    try {
      const postalCode = locationData.fullAddress.components.postcode || locationData.fullAddress.components.postal_code;
      if (!postalCode) {
        console.log('No postal code available to check deliverability');
        return;
      }
      const isDeliverable = await locationAPI.checkDeliverability(postalCode);
      if (!isDeliverable) {
        toast({
          title: "Delivery Not Available",
          description: "We don't seem to deliver to this area yet. We're expanding fast, so please check back soon!",
          variant: "warning",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error checking deliverability:', error);
    }
  }, [toast]);

  // REFACTORED: Simplified auto-detection logic using try/catch
  const handleLocationClick = useCallback(async () => {
    setUserLocation(prev => ({ ...prev, loading: true, error: null }));
    try {
      const locationData = await handleAutoDetectLocation(); // Simplified API call
      setUserLocation({
        display: locationData.display,
        coords: locationData.coords,
        fullAddress: locationData.fullAddress,
        error: null,
        loading: false,
      });
      toast({
        title: "Location Set",
        description: `Delivery location updated to ${locationData.display}.`
      });
      checkDeliverability(locationData);
    } catch (error) {
      console.error('Location detection failed:', error.message);
      setUserLocation(prev => ({ ...prev, loading: false, error: error.message }));
      toast({
        title: "Location Detection Failed",
        description: error.message || "Could not auto-detect. Please select your location manually.",
        variant: "warning",
        action: {
          altText: "Select Manually",
          onClick: () => {
            setIsLocationModalOpen(true);
            setIsMenuOpen(false); 
          }
        }
      });
    }
  }, [toast, checkDeliverability]);

  // Effect to attempt auto-detection once on first visit
  useEffect(() => {
    const hasTriedDetection = sessionStorage.getItem('locationDetectionAttempted');
    if (userLocation.display === 'Select Location' && !userLocation.loading && !hasTriedDetection) {
      sessionStorage.setItem('locationDetectionAttempted', 'true');
      handleLocationClick();
    }
  }, [userLocation.display, userLocation.loading, handleLocationClick]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsMenuOpen(false); 
    }
  };

  // Callback for when the LocationModal returns a selected location
  const handleLocationSelect = useCallback((locationData) => {
    setUserLocation({...locationData, loading: false, error: null});
    checkDeliverability(locationData);
    toast({
      title: "Location Updated",
      description: `Delivery location set to ${locationData.display}.`
    });
  }, [checkDeliverability, toast]);

  const openLoginDialog = () => { setIsSignUpDialogOpen(false); setIsForgotPasswordOpen(false); setIsLoginDialogOpen(true); setIsMenuOpen(false); };
  const openSignUpDialog = () => { setIsLoginDialogOpen(false); setIsForgotPasswordOpen(false); setIsSignUpDialogOpen(true); setIsMenuOpen(false); };
  const openForgotDialog = () => { setIsLoginDialogOpen(false); setIsSignUpDialogOpen(false); setIsForgotPasswordOpen(true); };

  return (
    <>
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 text-xs md:text-sm shadow-sm">
        {/* ... (no changes in this top bar) ... */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 md:gap-x-8">
            <div className="flex items-center space-x-1.5"> <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" /> <span className="font-medium">Delivery in minutes</span> </div>
            <div className="hidden sm:flex items-center space-x-1.5"> <Shield className="h-3.5 w-3.5 md:h-4 md:w-4" /> <span className="font-medium">100% Quality Assured</span> </div>
            <div className="flex items-center space-x-1.5"> <Bike className="h-3.5 w-3.5 md:h-4 md:w-4" /> <span className="font-medium">Free Delivery Available</span> </div>
          </div>
        </div>
      </div>

      <header className={`bg-white ${isScrolled ? 'shadow-md' : 'shadow-sm'} sticky top-0 z-50 transition-shadow duration-300`} >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* ... (no changes in logo, search, cart, user menu etc.) ... */}
            <Link to="/" className="flex-shrink-0 flex items-center group">
              <div className="flex items-center space-x-2">
                <img className="h-8 w-8 transition-transform duration-300 group-hover:scale-105" src="/logo.png" alt="QuickCommerce Logo" onError={(e) => { e.target.style.display = 'none'; const fallback = e.target.nextElementSibling; if (fallback && fallback.style) { fallback.style.display = 'block'; } }} />
                <ShoppingCart className="h-8 w-8 text-green-500 transition-transform duration-300 group-hover:scale-105" style={{ display: 'none' }} aria-hidden="true" />
                <span className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors"> SetCart </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center ml-6">
              <button onClick={() => userLocation.error || userLocation.display === 'Select Location' ? setIsLocationModalOpen(true) : handleLocationClick()} disabled={userLocation.loading} className="flex items-center space-x-2 text-gray-700 hover:text-green-600 min-w-[180px] lg:min-w-[220px] transition-colors duration-200 group disabled:opacity-70 disabled:cursor-wait p-2 rounded-md hover:bg-gray-50" >
                <MapPin className={`h-5 w-5 flex-shrink-0 ${ userLocation.loading ? 'text-yellow-500 animate-pulse' : userLocation.error || userLocation.display === 'Select Location' ? 'text-red-500' : 'text-green-500' } transition-colors group-hover:text-green-600`} />
                <div className="text-left overflow-hidden">
                  <div className="text-xs text-gray-500 group-hover:text-gray-600">Delivery Location</div>
                  <div className="text-sm font-medium truncate max-w-[150px] lg:max-w-[180px]"> {userLocation.loading ? 'Detecting...' : userLocation.display} </div>
                  {(userLocation.error || userLocation.display === 'Select Location') && !userLocation.loading && ( <div className="text-xs text-blue-500 group-hover:text-blue-600 truncate max-w-[150px] lg:max-w-[180px]"> Click to set manually </div> )}
                </div>
                {userLocation.error || userLocation.display === 'Select Location' ? ( <Plus className="h-4 w-4 ml-auto text-blue-500 group-hover:text-green-500" /> ) : ( <ChevronDown className="h-4 w-4 ml-auto text-gray-400 group-hover:text-green-500" /> )}
              </button>
            </div>

            <form onSubmit={handleSearch} className="hidden md:flex flex-grow max-w-xl mx-4 lg:mx-8">
              <div className="relative w-full">
                <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search groceries, essentials..." className="w-full pl-4 pr-10 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder-gray-400" />
                <button type="submit" className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-green-600 transition-colors duration-200 flex items-center" aria-label="Search"> <Search className="h-5 w-5" /> </button>
              </div>
            </form>

            <div className="hidden md:flex items-center space-x-5 lg:space-x-6">
              <Link to="/cart" className="relative flex items-center text-gray-700 hover:text-green-600 transition-colors duration-200 group" >
                <ShoppingCart className="h-6 w-6 group-hover:scale-110 transition-transform" />
                {itemCount > 0 && ( <span className="absolute -top-2 -right-2.5 bg-green-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center animate-bounce"> {itemCount} </span> )}
                <span className="ml-2 hidden lg:inline">Cart</span>
              </Link>

              {isAuthenticated && user ? (
                <div className="relative user-menu-container">
                  <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center space-x-1 text-gray-700 hover:text-green-600 transition-colors duration-200" >
                    <User className="h-5 w-5" />
                    <span className="text-sm font-medium hidden lg:inline truncate max-w-[100px]"> {user.name || user.email?.split('@')[0] || 'Account'} </span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none" >
                        <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                          <Link to="/profile" className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150" role="menuitem" onClick={() => setIsUserMenuOpen(false)}> <User className="h-4 w-4 mr-3 text-gray-400" /> My Account </Link>
                          <Link to="/orders" className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150" role="menuitem" onClick={() => setIsUserMenuOpen(false)}> <Package className="h-4 w-4 mr-3 text-gray-400" /> My Orders </Link>
                          <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-red-700 transition-colors duration-150" role="menuitem"> <LogOut className="h-4 w-4 mr-3 text-gray-400" /> Sign Out </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center space-x-3 lg:space-x-4">
                  <button onClick={openLoginDialog} className="text-sm font-medium text-gray-700 hover:text-green-600 transition-colors duration-200 px-3 py-1.5 rounded-md hover:bg-gray-100"> Login </button>
                  <button onClick={openSignUpDialog} className="text-sm font-medium bg-green-500 text-white px-4 py-1.5 rounded-full hover:bg-green-600 transition-colors duration-200 shadow-sm hover:shadow"> Sign Up </button>
                </div>
              )}
            </div>

            <div className="md:hidden flex items-center">
              <Link to="/cart" className="relative p-2 mr-2 text-gray-700 hover:text-green-600">
                <ShoppingCart className="h-6 w-6" />
                {itemCount > 0 && ( <span className="absolute top-0 right-0 bg-green-500 text-white text-xs font-semibold rounded-full h-4 w-4 flex items-center justify-center transform translate-x-1/2 -translate-y-1/2"> {itemCount} </span> )}
              </Link>
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md text-gray-700 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500 mobile-menu-button" aria-expanded={isMenuOpen} aria-label="Toggle menu">
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* ... (no changes in mobile menu) ... */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="md:hidden bg-white border-t border-gray-100 shadow-lg mobile-menu-content overflow-hidden" >
              <div className="px-4 pt-4 pb-5 space-y-4">
                <form onSubmit={handleSearch} className="mb-3">
                  <div className="relative">
                    <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search products..." className="w-full pl-4 pr-10 py-2 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder-gray-400" />
                    <button type="submit" className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-green-600 transition-colors duration-200 flex items-center" aria-label="Search"> <Search className="h-5 w-5" /> </button>
                  </div>
                </form>

                <button onClick={() => { if (userLocation.error || userLocation.display === 'Select Location') { setIsLocationModalOpen(true); } else { handleLocationClick(); } setIsMenuOpen(false); }} disabled={userLocation.loading} className="flex items-center space-x-2 w-full px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200 group disabled:opacity-70 disabled:cursor-wait" >
                  <MapPin className={`h-5 w-5 flex-shrink-0 ${ userLocation.loading ? 'text-yellow-500 animate-pulse' : userLocation.error || userLocation.display === 'Select Location' ? 'text-red-500' : 'text-green-500' } transition-colors group-hover:text-green-600`} />
                  <div className="text-left overflow-hidden flex-grow">
                    <div className="text-xs text-gray-500 group-hover:text-gray-600">Delivery Location</div>
                    <div className="text-sm font-medium truncate"> {userLocation.loading ? 'Detecting...' : userLocation.display} </div>
                    {(userLocation.error || userLocation.display === 'Select Location') && !userLocation.loading && ( <div className="text-xs text-blue-500 group-hover:text-blue-600 truncate"> Click to set manually </div> )}
                  </div>
                  {userLocation.error || userLocation.display === 'Select Location' ? ( <Plus className="h-4 w-4 ml-auto text-blue-500 group-hover:text-green-500" /> ) : ( <ChevronDown className="h-4 w-4 ml-auto text-gray-400 group-hover:text-green-500" /> )}
                </button>

                {isAuthenticated && user ? (
                  <>
                    <Link to="/profile" className="flex items-center space-x-3 w-full px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors duration-200" onClick={() => setIsMenuOpen(false)}> <User className="h-5 w-5 text-gray-500" /> <span>My Account</span> </Link>
                    <Link to="/orders" className="flex items-center space-x-3 w-full px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors duration-200" onClick={() => setIsMenuOpen(false)}> <Package className="h-5 w-5 text-gray-500" /> <span>My Orders</span> </Link>
                    <Link to="/cart" className="flex items-center justify-between w-full px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors duration-200" onClick={() => setIsMenuOpen(false)}> <div className="flex items-center space-x-3"> <ShoppingCart className="h-5 w-5 text-gray-500" /> <span>Cart</span> </div> {itemCount > 0 && ( <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full"> {itemCount} item{itemCount !== 1 ? 's' : ''} </span> )} </Link>
                    <button onClick={handleLogout} className="flex items-center space-x-3 w-full px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-red-700 rounded-md transition-colors duration-200"> <LogOut className="h-5 w-5 text-gray-500" /> <span>Sign Out</span> </button>
                  </>
                ) : (
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <button onClick={openLoginDialog} className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors duration-200"> Login </button>
                    <button onClick={openSignUpDialog} className="block w-full text-center py-2 bg-green-500 text-white font-medium rounded-full hover:bg-green-600 transition-colors duration-200 shadow-sm hover:shadow"> Sign Up </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Auth and Location Modals */}
      <LoginDialog isOpen={isLoginDialogOpen} onClose={() => setIsLoginDialogOpen(false)} onSuccess={() => {setIsLoginDialogOpen(false); toast({ title: "Login Successful", description: "Welcome back!" });}} onForgotPassword={openForgotDialog} onSignUpInstead={openSignUpDialog} />
      <SignUpDialog isOpen={isSignUpDialogOpen} onClose={() => setIsSignUpDialogOpen(false)} onSuccess={() => {setIsSignUpDialogOpen(false); toast({ title: "Sign Up Successful", description: "Welcome! Please log in." }); openLoginDialog();}} onLoginInstead={openLoginDialog} />
      <ForgotPasswordDialog isOpen={isForgotPasswordOpen} onClose={() => setIsForgotPasswordOpen(false)} onLoginInstead={openLoginDialog} />
      
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onLocationSelect={handleLocationSelect}
      />
    </>
  );
};

export default Header;
