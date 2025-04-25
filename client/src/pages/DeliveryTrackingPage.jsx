import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderAPI } from '../services/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { 
  CheckCircle, 
  Package, 
  Loader2, 
  AlertTriangle, 
  Truck,
  MapPin,
  ClipboardCheck,
  User
} from 'lucide-react';

// DeliveryTimeline and UserInfo components remain the same

const DeliveryTimeline = ({ status }) => {
  // Component code remains the same
  const steps = [
    { id: 'processing', label: 'Processing', icon: ClipboardCheck, done: status === 'processing' || status === 'shipped' || status === 'delivered' },
    { id: 'shipped', label: 'Shipped', icon: Truck, done: status === 'shipped' || status === 'delivered' },
    { id: 'delivered', label: 'Delivered', icon: MapPin, done: status === 'delivered' }
  ];

  return (
    <div className="mt-6 space-y-6">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-start">
          <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${step.done ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
            <step.icon className="h-5 w-5" />
          </div>
          <div className="ml-4">
            <h4 className={`text-sm font-medium ${step.done ? 'text-green-700' : 'text-gray-500'}`}>{step.label}</h4>
            {index < steps.length - 1 && (
              <div className="mt-1 ml-4 h-12 w-0.5 bg-gray-200" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const UserInfo = ({ name, phone, address }) => {
  return (
    <div className="flex items-start mt-4">
      <div className="flex-shrink-0">
        <User className="h-5 w-5 text-gray-500" />
      </div>
      <div className="ml-3">
        <h4 className="text-sm font-medium text-gray-700">{name}</h4>
        {phone && <p className="text-xs text-gray-500">Phone: {phone}</p>}
        {address && (
          <address className="text-xs text-gray-500 not-italic mt-1">
            {address.street}<br />
            {address.city}, {address.state} {address.postalCode}<br />
            {address.country}
          </address>
        )}
      </div>
    </div>
  );
};

const DeliveryTrackingPage = () => {
  const { orderId } = useParams();
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
        const response = await orderAPI.getOrderById(orderId);
        
        if (response && response.success && response.data) {
          setOrder(response.data);
        } else {
          throw new Error(response?.message || "Failed to retrieve order details");
        }
      } catch (err) {
        console.error("Error fetching order details:", err);
        setError(err.message || "Could not load delivery tracking information.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto my-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button variant="outline" size="sm" asChild className="mt-4">
            <Link to="/order-history">View All Orders</Link>
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
          <AlertTitle>Delivery Not Found</AlertTitle>
          <AlertDescription>We couldn't find tracking information for this order.</AlertDescription>
          <Button variant="link" asChild className="p-0 h-auto mt-2">
            <Link to="/order-history">View All Orders</Link>
          </Button>
        </Alert>
      </div>
    );
  }

  // Handle potential missing data safely
  const orderNumber = order._id ? order._id.slice(-8) : 'N/A';
  const status = order.status || 'processing';
  const estimatedDelivery = order.estimatedDelivery ? 
    new Date(order.estimatedDelivery).toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    }) : 'Calculating...';
  
  // Extract shipping information
  const shippingAddress = order.shippingAddress || {};
  const recipientName = order.customerName || shippingAddress.name || 'Customer';

  return (
    <div className="container mx-auto max-w-2xl p-4 py-8">
      <Card className="overflow-hidden shadow-lg border-blue-200">
        <CardHeader className="bg-blue-50 py-6">
          <CardTitle className="text-xl md:text-2xl font-bold text-blue-800 flex items-center">
            <Truck className="w-6 h-6 mr-2 text-blue-600" />
            Delivery Tracking
          </CardTitle>
          <p className="text-gray-600">Order #{orderNumber}</p>
        </CardHeader>
        
        <CardContent className="p-6 space-y-5">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-800">Estimated Delivery</h3>
            <p className="text-lg font-bold text-blue-900">{estimatedDelivery}</p>
            <p className="text-sm text-blue-700 mt-1">Current Status: <span className="font-medium capitalize">{status}</span></p>
          </div>
          
          {/* Delivery Timeline */}
          <DeliveryTimeline status={status} />
          
          {/* Recipient Information */}
          <div className="border-t pt-4 mt-6">
            <h3 className="font-medium text-gray-700">Recipient Information</h3>
            <UserInfo 
              name={recipientName}
              phone={shippingAddress.phone}
              address={shippingAddress}
            />
          </div>
          
          {/* Order Items Summary - Simple version */}
          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-700 mb-2">Order Items</h3>
            {order.items && order.items.length > 0 ? (
              <ul className="space-y-2">
                {order.items.map((item, index) => (
                  <li key={item._id || index} className="text-sm text-gray-600">
                    {item.product?.name || item.productSnapshot?.name || 'Item'} x {item.quantity || 1}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No items found in this order.</p>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="bg-gray-50 p-6 flex justify-center gap-4">
          <Button asChild variant="outline">
            <Link to={`/order-confirmation/${orderId}`}>View Order Details</Link>
          </Button>
          <Button asChild variant="default">
            <Link to="/support">Contact Support</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default DeliveryTrackingPage;