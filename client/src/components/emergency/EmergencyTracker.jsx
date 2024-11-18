import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  AlertCircle,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const EmergencyTracker = ({ orderId = "EM123456" }) => {
  const [orderStatus] = useState({
    status: "in_transit",
    estimatedDelivery: "14:30",
    currentLocation: "Local Distribution Center",
    deliveryPerson: {
      name: "John Smith",
      phone: "+1 (555) 123-4567"
    },
    timeline: [
      {
        time: "12:15",
        status: "Order Confirmed",
        description: "Emergency order processed and confirmed",
        completed: true
      },
      {
        time: "12:30",
        status: "Preparing Order",
        description: "Items being packaged for delivery",
        completed: true
      },
      {
        time: "13:00",
        status: "In Transit",
        description: "Order picked up by delivery partner",
        completed: true
      },
      {
        time: "14:30",
        status: "Estimated Delivery",
        description: "Expected delivery to your location",
        completed: false
      }
    ]
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'order_confirmed':
        return <Package className="h-6 w-6" />;
      case 'in_transit':
        return <Truck className="h-6 w-6" />;
      case 'delivered':
        return <CheckCircle2 className="h-6 w-6" />;
      default:
        return <Clock className="h-6 w-6" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Emergency Order Tracker
            </div>
            <span className="text-sm font-normal">Order ID: {orderId}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Current Status */}
          <div className="mb-8 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Truck className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-semibold">Current Status</h3>
                  <p className="text-sm text-gray-600">{orderStatus.currentLocation}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">Estimated Delivery</p>
                <p className="text-sm text-gray-600">{orderStatus.estimatedDelivery}</p>
              </div>
            </div>

            {/* Delivery Person Info */}
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="font-medium">{orderStatus.deliveryPerson.name}</p>
                  <p className="text-sm text-gray-600">Delivery Partner</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => window.location.href = `tel:${orderStatus.deliveryPerson.phone}`}
              >
                <Phone className="h-4 w-4" />
                Contact
              </Button>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="font-semibold mb-4">Delivery Timeline</h3>
            {orderStatus.timeline.map((event, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className={`mt-1 h-6 w-6 flex items-center justify-center rounded-full ${
                  event.completed ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {event.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{event.status}</p>
                    <span className="text-sm text-gray-500">{event.time}</span>
                  </div>
                  <p className="text-sm text-gray-600">{event.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Emergency Contact Button */}
          <div className="mt-8">
            <Button
              className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white"
              onClick={() => window.location.href = "tel:911"}
            >
              <AlertCircle className="h-5 w-5" />
              Emergency Contact
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmergencyTracker;