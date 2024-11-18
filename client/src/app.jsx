import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/contexts/AuthContext';

// Import your pages
import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import CartPage from './pages/CartPage';
import RegularCheckoutPage from './pages/RegularCheckoutPage';
import EmergencyCheckoutPage from './pages/EmergencyCheckoutPage';
import EmergencyProductPage from './pages/EmergencyProductPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import RegularProductPage from './pages/RegularProductPage';
import SubscriptionPage from './pages/SubscriptionPage';
import UserProfilePage from './pages/UserProfilePage';

// Import components
import  Header  from './components/common/Header';
import { UserMenu } from './components/common/Header';
import Footer from './components/common/Footer';
import { RegularProductList } from './components/regular/RegularProductList';
import EmergencyProductList from './components/emergency/EmergencyProductList';
import { useAuth } from './components/contexts/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return children;
};

// Main App Layout Component
const AppLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/categories" element={<CategoryPage />} />
          <Route path="/products" element={<RegularProductList />} />
          <Route path="/product/:id" element={<RegularProductPage />} />
          <Route path="/emergency-products" element={<EmergencyProductList />} />
          <Route path="/emergency-product/:id" element={<EmergencyProductPage />} />

          {/* Protected Routes */}
          <Route
            path="/cart"
            element={
              <ProtectedRoute>
                <CartPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <RegularCheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/emergency-checkout"
            element={
              <ProtectedRoute>
                <EmergencyCheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/order-confirmation"
            element={
              <ProtectedRoute>
                <OrderConfirmationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <UserProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscription"
            element={
              <ProtectedRoute>
                <SubscriptionPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

// Main App Component
const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </Router>
  );
};

export default App;