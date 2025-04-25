import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from '../components/contexts/AuthContext'; // Adjust the import path
import { Loader2, Mail, User, MapPin, Phone } from 'lucide-react';

const UserProfilePage = () => {
  const { user: authUser, api, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [user, setUser] = useState({
    name: '',
    email: '',
    username: '',
    phone: '',
    address: ''
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Load user data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!authUser) return;
      
      setIsLoading(true);
      try {
        // You can either use the user data from auth context or make a fresh API call
        // Option 1: Use data from context
        setUser({
          name: authUser.name || '',
          email: authUser.email || '',
          username: authUser.username || '',
          phone: authUser.phone || '',
          address: authUser.address || ''
        });
        
        // Option 2: Or fetch fresh data
        // const response = await api.get('/user/profile');
        // setUser(response.data);
      } catch (err) {
        setError('Failed to load profile. Please try again.');
        console.error('Error loading profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [authUser, api]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);
    
    try {
      await api.put('/user/profile', user);
      setSuccess('Profile updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader className="bg-gray-50">
          <CardTitle className="text-2xl font-bold">My Profile</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                Full Name
              </Label>
              <Input 
                id="name" 
                value={user.name}
                onChange={(e) => setUser(prev => ({ ...prev, name: e.target.value }))}
                className="focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                Username
              </Label>
              <Input 
                id="username" 
                value={user.username}
                onChange={(e) => setUser(prev => ({ ...prev, username: e.target.value }))}
                className="focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                Email Address
              </Label>
              <Input 
                id="email" 
                type="email"
                value={user.email}
                onChange={(e) => setUser(prev => ({ ...prev, email: e.target.value }))}
                className="focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled
              />
              <p className="text-xs text-gray-500">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                Phone Number
              </Label>
              <Input 
                id="phone"
                value={user.phone}
                onChange={(e) => setUser(prev => ({ ...prev, phone: e.target.value }))}
                className="focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                Address
              </Label>
              <Input 
                id="address"
                value={user.address}
                onChange={(e) => setUser(prev => ({ ...prev, address: e.target.value }))}
                className="focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {success && <p className="text-green-600 text-sm">{success}</p>}
            
            <Button 
              type="submit" 
              className="w-full bg-green-500 hover:bg-green-600 text-white transition-colors duration-200"
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </span>
              ) : 'Update Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfilePage;