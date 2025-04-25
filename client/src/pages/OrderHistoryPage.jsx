import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI, formatPrice } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Loader2, Package, AlertTriangle, ChevronRight, RefreshCw, Calendar, ShoppingBag } from 'lucide-react';
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious, PaginationEllipsis
} from "../components/ui/pagination";

const OrderHistoryPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0,
    limit: 10
  });

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await orderAPI.getUserOrders({ page, limit: pagination.limit });
      if (response.success) {
        setOrders(response.data);
        setPagination(response.pagination);
      } else {
        throw new Error(response.message || "Failed to fetch orders.");
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(err.message || "Could not load your orders.");
      setOrders([]);
      setPagination({ currentPage: 1, totalPages: 1, totalOrders: 0, limit: 10 });
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = await debugAuth();
      if (isAuthenticated) {
        fetchOrders(pagination.currentPage);
      } else {
        setError("Authentication error. Please login again.");
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [fetchOrders, pagination.currentPage]);

  const debugAuth = async () => {
    const accessToken = localStorage.getItem('accessToken');
    const user = JSON.parse(localStorage.getItem('userProfile') || '{}');
    
    console.log("[Auth Debug] Access Token exists:", !!accessToken);
    console.log("[Auth Debug] User exists:", !!user._id);
    
    if (accessToken) {
      try {
        // Test endpoint to verify authentication
        const response = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (response.ok) {
          console.log("[Auth Debug] Auth test successful");
          return true;
        } else {
          console.error("[Auth Debug] Auth test failed:", response.status);
          return false;
        }
      } catch (error) {
        console.error("[Auth Debug] Auth test failed:", error);
        return false;
      }
    }
    return false;
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
      window.scrollTo(0, 0);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return 'text-green-600 bg-green-100';
      case 'shipped':
      case 'out_for_delivery': return 'text-blue-600 bg-blue-100';
      case 'processing':
      case 'confirmed': return 'text-purple-600 bg-purple-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // --- Render Logic ---
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mb-4" />
          <span className="text-gray-600 text-lg">Loading your order history...</span>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive" className="my-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Orders</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button variant="outline" size="sm" onClick={() => fetchOrders(pagination.currentPage)} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4"/> Retry
          </Button>
        </Alert>
      );
    }

    if (orders.length === 0) {
      return (
        <Card className="text-center py-16">
          <CardHeader>
            <ShoppingBag size={56} className="mx-auto text-gray-300 mb-4" />
            <CardTitle className="text-2xl text-gray-600">No Orders Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 mb-6">You haven't placed any orders yet.</p>
            <Button asChild>
              <Link to="/products">Start Shopping</Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {orders.map((order) => (
          <Card key={order._id} className="overflow-hidden hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-50 p-4 border-b">
              <div>
                <CardTitle className="text-sm font-medium">
                  Order #{order._id?.slice(-8) || 'Unknown'}
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 flex items-center mt-1">
                  <Calendar className="h-3 w-3 mr-1" />
                  Placed on: {formatDate(order.createdAt)}
                </CardDescription>
              </div>
              <div className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                {(order.status || 'unknown').replace('_', ' ').toUpperCase()}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Show items */}
              {order.items?.slice(0, 3).map(item => (
                <div key={item.product?._id || item._id || Math.random().toString()} className="flex items-center space-x-3 text-sm">
                  <div className="w-10 h-10 bg-gray-50 rounded border flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.product?.images?.[0]?.url ? (
                      <img
                        src={item.product.images[0].url}
                        alt={item.product?.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Package className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <span className="flex-grow truncate">{item.product?.name || 'Product'}</span>
                  <span className="text-gray-500">x{item.quantity || 1}</span>
                </div>
              ))}
              {(order.items?.length || 0) > 3 && (
                <p className="text-xs text-gray-500 pl-12">...and {order.items.length - 3} more items</p>
              )}

              <div className="flex justify-between items-center pt-3 border-t mt-3">
                <span className="text-base font-semibold">Total: {formatPrice(order.totalAmount || 0)}</span>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/order-confirmation/${order._id}`}>
                    View Details <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // --- Pagination Component ---
  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;

    const pageNumbers = [];
    const maxPagesToShow = 5;
    const currentPage = pagination.currentPage;
    const totalPages = pagination.totalPages;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);

      if (startPage > 2) {
        pageNumbers.push('...');
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      if (endPage < totalPages - 1) {
        pageNumbers.push('...');
      }

      pageNumbers.push(totalPages);
    }

    return (
      <Pagination className="mt-8">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }}
              disabled={currentPage === 1}
              aria-disabled={currentPage === 1}
            />
          </PaginationItem>

          {pageNumbers.map((page, index) => (
            <PaginationItem key={index}>
              {page === '...' ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  href="#"
                  onClick={(e) => { e.preventDefault(); handlePageChange(page); }}
                  isActive={currentPage === page}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}
              disabled={currentPage === totalPages}
              aria-disabled={currentPage === totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  const orderCount = pagination.totalOrders || 0;
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">My Orders</h1>
        {!loading && !error && orderCount > 0 && (
          <p className="text-gray-500 text-sm">
            Showing {orders.length} of {orderCount} orders
          </p>
        )}
      </div>
      
      {renderContent()}
      {renderPagination()}
    </div>
  );
};

export default OrderHistoryPage;