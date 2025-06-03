import React, { useRef, useState } from 'react';
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
  ArrowLeft,
  Send,
  CheckCircle,
  AlertCircle,
  MapPin
} from 'lucide-react';

const ContactSupportPage = () => {
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const orderRef = useRef(null);
  const messageRef = useRef(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null

  const onSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const formData = {
        name: nameRef.current.value,
        email: emailRef.current.value,
        orderNumber: orderRef.current.value,
        message: messageRef.current.value,
      };

      await handleSubmit(formData);
      setSubmitStatus('success');
      
      // Clear form on success
      nameRef.current.value = '';
      emailRef.current.value = '';
      orderRef.current.value = '';
      messageRef.current.value = '';
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 py-8">
      <div className="container mx-auto max-w-5xl p-4">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group">
            <MessageSquare className="w-10 h-10 text-white group-hover:scale-110 transition-transform duration-300" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 bg-clip-text text-transparent mb-4">
            Contact Support
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            We're here to help with your orders, delivery questions, and any issues you might have
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Methods - Left Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Phone Support */}
            <Card className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 group bg-white">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
              <CardContent className="p-8 relative">
                <div className="flex items-center mb-6">
                  <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Phone className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Call Us</h3>
                    <p className="text-blue-600 font-medium">24/7 Support</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-3">+91 8925 311 458</p>
                <p className="text-gray-600">Available for urgent inquiries anytime</p>
              </CardContent>
            </Card>

            {/* Email Support */}
            <Card className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 group bg-white">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
              <CardContent className="p-8 relative">
                <div className="flex items-center mb-6">
                  <div className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Email Us</h3>
                    <p className="text-emerald-600 font-medium">Quick Response</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900 mb-3 break-all">lingamvamshikrishnareddy@proton.me</p>
                <p className="text-gray-600">Response within 24 hours</p>
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 group bg-white">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
              <CardContent className="p-8 relative">
                <div className="flex items-center mb-6">
                  <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Visit Us</h3>
                    <p className="text-purple-600 font-medium">Our Location</p>
                  </div>
                </div>
                <p className="text-gray-900 font-medium leading-relaxed">
                  2-7-1340/1, Vijayapal Colony-2,<br />
                  Hanamkonda, Warangal
                </p>
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 group bg-white">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
              <CardContent className="p-8 relative">
                <div className="flex items-center mb-6">
                  <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Business Hours</h3>
                    <p className="text-amber-600 font-medium">Indian Standard Time</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Mon - Fri:</span>
                    <span className="font-bold text-gray-900">9AM - 8PM</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Saturday:</span>
                    <span className="font-bold text-gray-900">10AM - 6PM</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Sunday:</span>
                    <span className="font-bold text-gray-900">11AM - 5PM</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-3 mt-3">
                    <span className="text-gray-700 font-medium">Holidays:</span>
                    <span className="font-bold text-orange-600">Limited</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form - Right Column */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden border-0 shadow-2xl bg-white">
              <CardHeader className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20"></div>
                <CardTitle className="text-2xl md:text-3xl font-bold flex items-center relative z-10">
                  <Send className="w-8 h-8 mr-4" />
                  Send Us a Message
                </CardTitle>
                <p className="text-blue-100 mt-3 text-lg relative z-10">
                  Fill out the form below and we'll get back to you as soon as possible
                </p>
              </CardHeader>

              <CardContent className="p-10 relative bg-white">
                {/* Success/Error Messages */}
                {submitStatus === 'success' && (
                  <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg flex items-center shadow-lg">
                    <CheckCircle className="h-6 w-6 text-green-600 mr-4" />
                    <div>
                      <p className="text-green-800 font-bold text-lg">Message sent successfully!</p>
                      <p className="text-green-700">We'll respond within 24 hours.</p>
                    </div>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="mb-8 p-6 bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 rounded-lg flex items-center shadow-lg">
                    <AlertCircle className="h-6 w-6 text-red-600 mr-4" />
                    <div>
                      <p className="text-red-800 font-bold text-lg">Something went wrong</p>
                      <p className="text-red-700">Please try again or contact us directly.</p>
                    </div>
                  </div>
                )}

                <form className="space-y-8" onSubmit={onSubmit}>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="group">
                      <label htmlFor="name" className="block text-sm font-bold text-gray-800 mb-3 group-focus-within:text-blue-600 transition-colors duration-200">
                        Your Name *
                      </label>
                      <Input 
                        id="name" 
                        placeholder="Enter your full name" 
                        ref={nameRef}
                        required
                        className="h-12 text-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 hover:border-gray-300 bg-gray-50 focus:bg-white"
                      />
                    </div>
                    <div className="group">
                      <label htmlFor="email" className="block text-sm font-bold text-gray-800 mb-3 group-focus-within:text-blue-600 transition-colors duration-200">
                        Email Address *
                      </label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="Enter your email address" 
                        ref={emailRef}
                        required
                        className="h-12 text-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 hover:border-gray-300 bg-gray-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="group">
                    <label htmlFor="orderNumber" className="block text-sm font-bold text-gray-800 mb-3 group-focus-within:text-blue-600 transition-colors duration-200">
                      Order Number <span className="text-gray-500 font-normal">(optional)</span>
                    </label>
                    <Input 
                      id="orderNumber" 
                      placeholder="Enter your order number if applicable" 
                      ref={orderRef}
                      className="h-12 text-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 hover:border-gray-300 bg-gray-50 focus:bg-white"
                    />
                  </div>

                  <div className="group">
                    <label htmlFor="message" className="block text-sm font-bold text-gray-800 mb-3 group-focus-within:text-blue-600 transition-colors duration-200">
                      Your Message *
                    </label>
                    <Textarea 
                      id="message" 
                      placeholder="How can we help you? Please provide as much detail as possible..." 
                      className="h-40 text-lg resize-none border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 hover:border-gray-300 bg-gray-50 focus:bg-white" 
                      ref={messageRef}
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-12 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
                        Sending Message...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Send className="h-5 w-5 mr-3" />
                        Send Message
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>

              <CardFooter className="bg-gradient-to-r from-gray-100 to-gray-50 p-8 flex flex-col sm:flex-row justify-between items-center gap-6">
                <Button asChild variant="outline" className="border-2 border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 hover:scale-105 group font-medium">
                  <Link to="/orders" className="flex items-center px-6 py-3">
                    <ArrowLeft className="h-5 w-5 mr-3 group-hover:-translate-x-1 transition-transform duration-200" />
                    Back to Orders
                  </Link>
                </Button>
                <p className="text-gray-600 font-medium">SetCart - Quick Commerce Platform</p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactSupportPage;
