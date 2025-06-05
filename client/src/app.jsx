import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/contexts/AuthContext';
import { CartProvider } from './components/contexts/CartContext';

// Import Pages
import HomePage from './pages/HomePage';
import AboutUsPage from './pages/AboutusPage'; // New About Us page
import CategoryPage from './pages/CategoryPage';
import ProductPage from './pages/RegularProductPage';
import ProductListPage from './pages/ProductListPage'; 
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/RegularCheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import UserProfilePage from './pages/UserProfilePage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import DeliveryTrackingPage from './pages/DeliveryTrackingPage';
import SubscriptionPage from './pages/SubscriptionPage';
import ContactSupportPage from './pages/ContactSupportPage';

// Import Layout Components
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import { Toaster } from "./components/ui/toaster";
import { useToast } from "./components/ui/usetoast";

// --- Enhanced Loading Component ---
const LoadingSpinner = ({ message = "Loading..." }) => {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-300 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
        </div>
        <p className="mt-4 text-gray-600 font-medium">{message}</p>
        <div className="mt-2 flex justify-center space-x-1">
          <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
          <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
          <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
        </div>
      </div>
    </div>
  );
};

// --- Enhanced Error Boundary Component ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
    console.error('Error stack:', error.stack);
    
    // Log more details about the error
    if (error.message && error.message.includes('object with keys')) {
      console.error('This is likely a React Error #31 - you are trying to render an object directly in JSX');
      console.error('Look for places where you might be rendering objects like: {altText, onClick} directly');
    }
    
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h2>
            <p className="text-gray-600 mb-4">We're sorry, but something unexpected happened.</p>
            
            {/* Show error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-left text-sm">
                <strong className="text-red-800">Error:</strong>
                <p className="text-red-700 font-mono text-xs mt-1">
                  {this.state.error.message}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <button 
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })} 
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Try Again
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Enhanced Protected Route Component ---
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access this page.",
        variant: "destructive",
      });
    }
  }, [loading, isAuthenticated, toast]);

  if (loading) {
    return <LoadingSpinner message="Authenticating..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/?showLogin=true" state={{ from: location }} replace />;
  }

  return children;
};

// --- Enhanced 404 Page Component ---
const NotFoundPage = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl text-gray-400">404</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-gray-600 mb-6">Sorry, we couldn't find the page you're looking for.</p>
        <div className="space-y-2">
          <button 
            onClick={() => window.history.back()} 
            className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors duration-200"
          >
            Go Back
          </button>
          <a 
            href="/" 
            className="block w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    </div>
  );
};

// --- Safe Component Wrapper ---
const SafeComponent = ({ component: Component, fallback = null, ...props }) => {
  try {
    if (!Component) {
      console.error('Component is undefined or null');
      return fallback || <div>Component not found</div>;
    }
    return <Component {...props} />;
  } catch (error) {
    console.error('Error rendering component:', error);
    return fallback || <div>Error loading component</div>;
  }
};

// --- Enhanced App Layout ---
const AppLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ErrorBoundary>
        <Header />
      </ErrorBoundary>
      <main className="flex-grow">
        <Suspense fallback={<LoadingSpinner message="Loading page..." />}>
          <div className="container mx-auto px-4 py-6 md:py-8">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </Suspense>
      </main>
      <Toaster />
      <ErrorBoundary>
        <Footer />
      </ErrorBoundary>
    </div>
  );
};

// --- Main App Component ---
const App = () => {
  // Handle location permission error gracefully
  useEffect(() => {
    // Override console.error to catch location errors and handle them gracefully
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('Location permission denied')) {
        console.warn('Location access denied - continuing without location services');
        return;
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route element={<AppLayout />}>
                {/* Public Routes */}
                <Route path="/" element={<SafeComponent component={HomePage} />} />
                <Route path="/about" element={<SafeComponent component={AboutUsPage} />} />
                <Route path="/categories" element={<SafeComponent component={CategoryPage} />} />
                <Route path="/categories/:slug" element={<SafeComponent component={CategoryPage} />} />
                <Route path="/products" element={<SafeComponent component={ProductListPage} />} />
                <Route path="/products/:slug" element={<SafeComponent component={ProductPage} />} />
                <Route path="/support" element={<SafeComponent component={ContactSupportPage} />} />

                {/* Protected Routes */}
                <Route
                  path="/cart"
                  element={
                    <ProtectedRoute>
                      <SafeComponent component={CartPage} />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute>
                      <SafeComponent component={CheckoutPage} />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/order-confirmation/:orderId"
                  element={
                    <ProtectedRoute>
                      <SafeComponent component={OrderConfirmationPage} />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <SafeComponent component={UserProfilePage} />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute>
                      <SafeComponent component={OrderHistoryPage} />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders/:orderId"
                  element={
                    <ProtectedRoute>
                      <SafeComponent component={OrderHistoryPage} />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/delivery/:orderId/track"
                  element={
                    <ProtectedRoute>
                      <SafeComponent component={DeliveryTrackingPage} />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/subscription"
                  element={
                    <ProtectedRoute>
                      <SafeComponent component={SubscriptionPage} />
                    </ProtectedRoute>
                  }
                />

                {/* 404 Route */}
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </CartProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
