import React from 'react';
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { CheckCircle } from 'lucide-react';

const OrderConfirmationPage = () => {
  const orderDetails = {
    orderNumber: '12345',
    date: new Date().toLocaleDateString(),
    total: 149.98,
    items: [
      { name: 'Product 1', quantity: 1, price: 99.99 },
      { name: 'Product 2', quantity: 2, price: 24.99 },
    ],
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <CardTitle>Order Confirmed!</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-b pb-2">
              <p className="font-medium">Order Number: {orderDetails.orderNumber}</p>
              <p className="text-gray-600">Date: {orderDetails.date}</p>
            </div>
            <div className="space-y-2">
              {orderDetails.items.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <span>{item.name} x{item.quantity}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>${orderDetails.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderConfirmationPage;