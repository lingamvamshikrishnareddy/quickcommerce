import React from 'react';
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { CheckCircle } from 'lucide-react';
const SubscriptionPage = () => {
  const plans = [
    {
      name: 'Basic',
      price: 9.99,
      features: ['Feature 1', 'Feature 2', 'Feature 3'],
    },
    {
      name: 'Premium',
      price: 19.99,
      features: ['All Basic features', 'Feature 4', 'Feature 5', 'Feature 6'],
    },
    {
      name: 'Enterprise',
      price: 49.99,
      features: ['All Premium features', 'Feature 7', 'Feature 8', 'Feature 9'],
    },
  ];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-8">Subscription Plans</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, index) => (
          <Card key={index} className="flex flex-col">
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-3xl font-bold mb-4">${plan.price}/mo</p>
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Subscribe</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPage;