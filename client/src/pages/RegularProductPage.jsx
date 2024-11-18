// RegularProductPage.jsx
import React from 'react';
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const RegularProductPage = () => {
  const [quantity, setQuantity] = React.useState(1);

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Product Name</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="aspect-square bg-gray-200 rounded-lg"></div>
            <div className="space-y-4">
              <p className="text-2xl font-bold">$99.99</p>
              <p className="text-gray-600">Product description goes here...</p>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  variant="outline"
                >-</Button>
                <span className="px-4">{quantity}</span>
                <Button 
                  onClick={() => setQuantity(q => q + 1)}
                  variant="outline"
                >+</Button>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full">Add to Cart</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RegularProductPage;