import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { AlertCircle, CreditCard, Truck } from 'lucide-react';

const RegularCheckout = ({ cart = [] }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    shipping: {
      firstName: '',
      lastName: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phone: ''
    },
    payment: {
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      nameOnCard: ''
    }
  });

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 5.99;
    const tax = subtotal * 0.08;
    return {
      subtotal,
      shipping,
      tax,
      total: subtotal + shipping + tax
    };
  };

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle checkout submission
    console.log('Checkout submitted:', formData);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Checkout Form */}
        <div className="flex-1">
          <form onSubmit={handleSubmit}>
            {/* Shipping Information */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Shipping Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="First Name"
                  value={formData.shipping.firstName}
                  onChange={(e) => handleInputChange('shipping', 'firstName', e.target.value)}
                  required
                />
                <Input
                  placeholder="Last Name"
                  value={formData.shipping.lastName}
                  onChange={(e) => handleInputChange('shipping', 'lastName', e.target.value)}
                  required
                />
                <Input
                  placeholder="Address"
                  className="md:col-span-2"
                  value={formData.shipping.address}
                  onChange={(e) => handleInputChange('shipping', 'address', e.target.value)}
                  required
                />
                <Input
                  placeholder="City"
                  value={formData.shipping.city}
                  onChange={(e) => handleInputChange('shipping', 'city', e.target.value)}
                  required
                />
                <Input
                  placeholder="State"
                  value={formData.shipping.state}
                  onChange={(e) => handleInputChange('shipping', 'state', e.target.value)}
                  required
                />
                <Input
                  placeholder="ZIP Code"
                  value={formData.shipping.zipCode}
                  onChange={(e) => handleInputChange('shipping', 'zipCode', e.target.value)}
                  required
                />
                <Input
                  placeholder="Phone Number"
                  className="md:col-span-2"
                  value={formData.shipping.phone}
                  onChange={(e) => handleInputChange('shipping', 'phone', e.target.value)}
                  required
                />
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Card Number"
                  className="md:col-span-2"
                  value={formData.payment.cardNumber}
                  onChange={(e) => handleInputChange('payment', 'cardNumber', e.target.value)}
                  required
                />
                <Input
                  placeholder="MM/YY"
                  value={formData.payment.expiryDate}
                  onChange={(e) => handleInputChange('payment', 'expiryDate', e.target.value)}
                  required
                />
                <Input
                  placeholder="CVV"
                  value={formData.payment.cvv}
                  onChange={(e) => handleInputChange('payment', 'cvv', e.target.value)}
                  required
                />
                <Input
                  placeholder="Name on Card"
                  className="md:col-span-2"
                  value={formData.payment.nameOnCard}
                  onChange={(e) => handleInputChange('payment', 'nameOnCard', e.target.value)}
                  required
                />
              </CardContent>
            </Card>

            <Button type="submit" className="w-full">
              Place Order
            </Button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:w-1/3">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-2">
                  {cart.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{item.name} × {item.quantity}</span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${calculateTotal().subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>${calculateTotal().shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>${calculateTotal().tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>${calculateTotal().total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Secure Checkout Notice */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>Your payment information is encrypted and secure</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RegularCheckout;