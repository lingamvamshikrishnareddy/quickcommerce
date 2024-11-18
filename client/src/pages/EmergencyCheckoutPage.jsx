import React, { useState } from 'react';
import { AlertCircle, Clock, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const EmergencyCheckout = () => {
  const [items, setItems] = useState([
    { id: 1, name: 'First Aid Kit', price: 49.99, quantity: 1, isUrgent: true },
    { id: 2, name: 'Emergency Blanket', price: 19.99, quantity: 1, isUrgent: true },
    { id: 3, name: 'Flashlight', price: 29.99, quantity: 1, isUrgent: false }
  ]);

  const updateQuantity = (id, newQuantity) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, quantity: Math.max(1, newQuantity) } : item
    ));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const priorityItems = items.filter(item => item.isUrgent);
  const regularItems = items.filter(item => !item.isUrgent);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Alert className="mb-6 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-600">
          Emergency/Priority Order - Will be processed with urgency
        </AlertDescription>
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="text-red-500" />
            Priority Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {priorityItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-sm text-red-600">Priority Processing</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="px-2 py-1 bg-white rounded border"
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-2 py-1 bg-white rounded border"
                    >
                      +
                    </button>
                  </div>
                  <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {regularItems.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Other Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {regularItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-2 py-1 bg-white rounded border"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-1 bg-white rounded border"
                      >
                        +
                      </button>
                    </div>
                    <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <span className="font-medium">Total</span>
            <span className="text-xl font-bold">${calculateTotal().toFixed(2)}</span>
          </div>
        </CardContent>
        <CardFooter>
          <button className="w-full py-3 bg-red-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-red-700">
            <ShoppingCart className="h-5 w-5" />
            Complete Emergency Checkout
          </button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default EmergencyCheckout;