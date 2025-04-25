import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/contexts/AuthContext';
import { CartProvider } from './components/contexts/CartContext'; // Import CartProvider

// Import Pages
import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import ProductPage from './pages/RegularProductPage'; // Renamed from RegularProductPage
import ProductListPage from './pages/ProductListPage'; 
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/RegularCheckoutPage'; // Using the component name from the file
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import UserProfilePage from './pages/UserProfilePage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import DeliveryTrackingPage from './pages/DeliveryTrackingPage';
import SubscriptionPage from './pages/SubscriptionPage'; // Keep if needed
import ContactSupportPage from './pages/ContactSupportPage';

// Import Layout Components
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import { Toaster } from "./components/ui/toaster"; // Assuming using shadcn/ui toaster for notifications
import { useToast } from "./components/ui/usetoast"; // Toast hook

// --- Protected Route Component ---
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
    return (
      <div className="flex items-center justify-center h-[60vh]">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        <span className="ml-4 text-gray-600">Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/?showLogin=true" state={{ from: location }} replace />;
    // Using query param to suggest showing login dialog on redirect
  }

  return children;
};

// --- Main App Layout ---
const AppLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-6 md:py-8">
        {/* Outlet renders the matched child route element */}
        <Outlet />
      </main>
       <Toaster /> {/* Add Toaster here */}
      <Footer />
    </div>
  );
};

// --- Main App Component ---
const App = () => {
  return (
    <Router>
      <AuthProvider>
        {/* CartProvider depends on AuthProvider for isAuthenticated */}
        <CartProvider>
          <Routes>
            <Route element={<AppLayout />}> {/* Main layout wraps these routes */}
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/categories" element={<CategoryPage />} />
              {/* Removed ProductListPage references */}
              <Route path="/categories/:slug" element={<CategoryPage />} /> {/* Changed to CategoryPage */}
               {/* Route for listing products (e.g., by category) */}
              <Route path="products" element={<ProductListPage />} /> {/* Changed to CategoryPage */}
              <Route path="/products/:slug" element={<ProductPage />} /> {/* Single product */}

              {/* Authentication might happen via dialogs on HomePage or dedicated /login /signup pages */}
               {/* <Route path="/login" element={<LoginPage />} /> */}
               {/* <Route path="/register" element={<RegisterPage />} /> */}


              {/* Protected Routes */}
              <Route
                path="/cart"
                element={<ProtectedRoute><CartPage /></ProtectedRoute>}
              />
              <Route
                path="/checkout"
                element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>}
              />
              {/* <Route path="/checkout/emergency" element={<ProtectedRoute><EmergencyCheckoutPage /></ProtectedRoute>} /> */}
              <Route
                path="/order-confirmation/:orderId" // Pass orderId to confirmation page
                element={<ProtectedRoute><OrderConfirmationPage /></ProtectedRoute>}
              />
               <Route
                path="/profile"
                element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>}
              />
               <Route
                path="/orders" // User's order history
                element={<ProtectedRoute><OrderHistoryPage /></ProtectedRoute>}
              />
               <Route
                path="/orders/:orderId" // View single order details (could reuse OrderHistoryPage logic)
                element={<ProtectedRoute><OrderHistoryPage /></ProtectedRoute>} // Or a dedicated OrderDetailPage
              />
               <Route
                path="/delivery/:orderId/track" // Delivery tracking page
                element={<ProtectedRoute><DeliveryTrackingPage /></ProtectedRoute>}

              />
              {/* <Route path="/subscription" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} /> */}
              <Route path="/support" element={<ContactSupportPage />} />
              {/* Catch-all for 404 */}
              <Route path="*" element={<Navigate to="/" replace />} /> {/* Or a dedicated 404 component */}
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;