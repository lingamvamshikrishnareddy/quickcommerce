import React from 'react';
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const RegularCheckoutPage = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle checkout logic
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Checkout</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Shipping Address</Label>
              <Input id="address" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card">Card Number</Label>
              <Input id="card" required />
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button className="w-full" type="submit">Place Order</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RegularCheckoutPage;