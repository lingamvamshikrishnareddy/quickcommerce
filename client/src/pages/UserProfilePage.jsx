import React from 'react';
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const UserProfilePage = () => {
  const [user, setUser] = React.useState({
    name: 'John Doe',
    email: 'john@example.com',
    address: '123 Main St',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle profile update logic
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                value={user.name}
                onChange={(e) => setUser(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email"
                value={user.email}
                onChange={(e) => setUser(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input 
                id="address"
                value={user.address}
                onChange={(e) => setUser(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <Button type="submit" className="w-full">Update Profile</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfilePage;