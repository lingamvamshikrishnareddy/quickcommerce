import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { handleSubmit } from '../services/api';

import {
  Phone,
  Mail,
  MessageSquare,
  Clock,
  ArrowLeft
} from 'lucide-react';

const ContactSupportPage = () => {
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const orderRef = useRef(null);
  const messageRef = useRef(null);

  const onSubmit = async (e) => {
    e.preventDefault();

    const formData = {
      name: nameRef.current.value,
      email: emailRef.current.value,
      orderNumber: orderRef.current.value,
      message: messageRef.current.value,
    };

    await handleSubmit(formData);
  };

  return (
    <div className="container mx-auto max-w-3xl p-4 py-8">
      <Card className="overflow-hidden shadow-lg border-blue-200">
        <CardHeader className="bg-blue-50 py-6">
          <CardTitle className="text-xl md:text-2xl font-bold text-blue-800 flex items-center">
            <MessageSquare className="w-6 h-6 mr-2 text-blue-600" />
            Contact Support
          </CardTitle>
          <p className="text-gray-600">We're here to help with your orders and delivery questions</p>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Contact Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Phone className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="font-medium text-blue-800">Call Us</h3>
              </div>
              <p className="text-lg font-bold text-blue-900">1-800-QUICK-COM</p>
              <p className="text-sm text-blue-700 mt-1">Available 24/7 for urgent inquiries</p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Mail className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="font-medium text-blue-800">Email Us</h3>
              </div>
              <p className="text-lg font-bold text-blue-900">support@quickcommerce.com</p>
              <p className="text-sm text-blue-700 mt-1">Response within 24 hours</p>
            </div>
          </div>

          {/* Business Hours */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center mb-3">
              <Clock className="h-5 w-5 text-gray-600 mr-2" />
              <h3 className="font-medium text-gray-800">Business Hours</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="font-medium">Monday - Friday:</p>
                <p className="text-gray-600">8:00 AM - 8:00 PM EST</p>
              </div>
              <div>
                <p className="font-medium">Saturday:</p>
                <p className="text-gray-600">9:00 AM - 5:00 PM EST</p>
              </div>
              <div>
                <p className="font-medium">Sunday:</p>
                <p className="text-gray-600">10:00 AM - 4:00 PM EST</p>
              </div>
              <div>
                <p className="font-medium">Holidays:</p>
                <p className="text-gray-600">Limited Hours</p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="border-t pt-6">
            <h3 className="font-medium text-gray-700 mb-4">Send Us a Message</h3>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                  <Input id="name" placeholder="Enter your name" ref={nameRef} />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <Input id="email" type="email" placeholder="Enter your email" ref={emailRef} />
                </div>
              </div>

              <div>
                <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-1">Order Number (optional)</label>
                <Input id="orderNumber" placeholder="Enter your order number if applicable" ref={orderRef} />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Your Message</label>
                <Textarea id="message" placeholder="How can we help you?" className="h-32" ref={messageRef} />
              </div>

              <Button type="submit" className="w-full md:w-auto">Submit Request</Button>
            </form>
          </div>
        </CardContent>

        <CardFooter className="bg-gray-50 p-6 flex justify-between">
          <Button asChild variant="outline">
            <Link to="/orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Link>
          </Button>
          <p className="text-sm text-gray-500">Quick Commerce - Initial Phase</p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ContactSupportPage;
