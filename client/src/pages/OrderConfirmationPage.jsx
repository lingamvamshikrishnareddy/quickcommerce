import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { orderAPI, formatPrice } from '../services/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { CheckCircle, Package, Loader2, AlertTriangle } from 'lucide-react';

const OrderConfirmationPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setError("Order ID is missing.");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Add error handling for the API call
        const response = await orderAPI.getOrderById(orderId);
        
        if (response && response.success && response.data) {
          setOrder(response.data);
        } else {
          throw new Error(response?.message || "Failed to retrieve order details");
        }
      } catch (err) {
        console.error("Error fetching order details:", err);
        setError(err.message || "Could not load order details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-green-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto my-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Order</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button variant="outline" size="sm" onClick={() => navigate('/orders')} className="mt-4">
            View My Orders
          </Button>
        </Alert>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto my-8">
        <Alert>
          <Package className="h-4 w-4" />
          <AlertTitle>Order Not Found</AlertTitle>
          <AlertDescription>We couldn't find the details for this order.</AlertDescription>
          <Button variant="link" onClick={() => navigate('/orders')} className="p-0 h-auto mt-2">
            View My Orders
          </Button>
        </Alert>
      </div>
    );
  }

  // Handle potential missing data safely with nullish coalescing and optional chaining
  const orderNumber = order._id ? order._id.slice(-8) : 'N/A';
  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', 
    { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
  const items = order.items || [];
  const shippingAddress = order.shippingAddress || {};
  const paymentMethod = order.paymentMethod || 'N/A';
  const totalAmount = order.totalAmount || 0;

  return (
    <div className="container mx-auto max-w-2xl p-4 py-8">
      <Card className="overflow-hidden shadow-lg border-green-200">
        <CardHeader className="text-center bg-green-50 py-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 animate-pulse" />
          <CardTitle className="text-2xl md:text-3xl font-bold text-green-800">Order Confirmed!</CardTitle>
          <p className="text-gray-600">Thank you for your purchase.</p>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="border-b pb-3 text-center">
            <p className="font-medium text-gray-800">Order Number: <span className="font-bold text-green-700">#{orderNumber}</span></p>
            <p className="text-sm text-gray-500">Date: {orderDate}</p>
          </div>

          {/* Order Items Summary */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-700">Order Summary:</h4>
            {items.length > 0 ? (
              items.map((item, index) => (
                <div key={item.product?._id || item._id || index} className="flex justify-between items-center text-sm">
                  <span className="truncate pr-2">
                    {(item.product?.name || item.product?.title || item.productSnapshot?.name || 'Item')} x {item.quantity || 1}
                  </span>
                  <span className="font-medium flex-shrink-0">
                    {formatPrice((item.price || 0) * (item.quantity || 1))}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No items found in this order.</p>
            )}
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatPrice(totalAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg mt-2">
              <span>Total Paid</span>
              <span>{formatPrice(totalAmount)}</span>
            </div>
            <div className="text-xs text-gray-500">
              Payment Method: {paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
            </div>
            <div className="text-xs text-gray-500">
              Status: <span className="font-medium capitalize">{order.status || 'Processing'}</span>
            </div>
          </div>

          {/* Shipping Address */}
          {shippingAddress && (
            <div className="border-t pt-3">
              <h4 className="font-semibold text-gray-700 mb-1">Shipping Address:</h4>
              <address className="text-sm text-gray-600 not-italic leading-snug">
                {shippingAddress.street || 'N/A'}<br />
                {shippingAddress.city || 'N/A'}, {shippingAddress.state || 'N/A'} {shippingAddress.postalCode || 'N/A'}<br />
                {shippingAddress.country || 'N/A'}<br />
                Phone: {shippingAddress.phone || 'N/A'}
              </address>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-gray-50 p-6 flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild variant="default">
            <Link to={`/delivery/${order._id}/track`}>
              <Package className="mr-2 h-4 w-4" /> Track Delivery
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/products">Continue Shopping</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default OrderConfirmationPage;