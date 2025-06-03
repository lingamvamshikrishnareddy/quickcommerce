import React from 'react';
import { Zap, Heart, Users, Target, Truck, Shield } from 'lucide-react';

const AboutUs = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 animate-fadeIn">
              We're Young, Nimble & 
              <span className="text-blue-600"> Lightning Fast</span>
            </h1>
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              A quick-commerce startup that puts customers first, built on transparency, speed, and win-win relationships for everyone in our ecosystem.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
                <span className="text-blue-600 font-semibold">No Dark Patterns</span>
              </div>
              <div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
                <span className="text-green-600 font-semibold">100% Transparent</span>
              </div>
              <div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
                <span className="text-purple-600 font-semibold">Customer First</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Mission</h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                We're building the future of quick-commerce with a purpose-driven approach, 
                focusing on creating value for everyone in our ecosystem.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">What Makes Us Different</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Zap className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Speed & Efficiency</h4>
                      <p className="text-gray-600">Lightning-fast delivery without compromising on quality or care.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Shield className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Complete Transparency</h4>
                      <p className="text-gray-600">No hidden fees, no dark patterns - just honest, upfront pricing.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Heart className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Customer Care</h4>
                      <p className="text-gray-600">Every decision we make starts with "How does this help our customers?"</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-2xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Purpose Over Profit</h3>
                <p className="text-gray-700 mb-4">
                  We're not just another profit-maximizing company. We believe in sustainable growth 
                  that benefits everyone - customers, delivery partners, wholesalers, and our team.
                </p>
                <p className="text-gray-700">
                  Decent profits, zero toxic culture, and independent values that encourage 
                  every team member to thrive.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Core Values</h2>
              <p className="text-xl text-gray-600">
                These aren't just words on a wall - they're the principles that guide every decision we make.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="p-3 bg-blue-100 rounded-xl w-fit mb-4">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Win-Win for Everyone</h3>
                <p className="text-gray-600">
                  We create value for customers, delivery agents, wholesalers, and distributors. 
                  Success should be shared, not hoarded.
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="p-3 bg-green-100 rounded-xl w-fit mb-4">
                  <Target className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Logistics Excellence</h3>
                <p className="text-gray-600">
                  We obsess over logistics, speed, and cost optimization to deliver the best 
                  possible experience at the lowest possible price.
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="p-3 bg-purple-100 rounded-xl w-fit mb-4">
                  <Truck className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">No Corporate Hierarchy</h3>
                <p className="text-gray-600">
                  We encourage and empower everyone, from the newest team member to leadership. 
                  Great ideas can come from anywhere.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-8">Built by Passion</h2>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 md:p-12 rounded-2xl">
              <div className="max-w-2xl mx-auto">
                <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                  "I built SetCart from the ground up because I believe quick-commerce can be done better. 
                  No dark patterns, no toxic culture, just honest business that creates value for everyone involved."
                </p>
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-xl font-bold text-gray-900">Lingam Vamshi Krishna Reddy</h3>
                  <p className="text-blue-600 font-semibold">Founder & CEO, Setica</p>
                  <p className="text-gray-600 mt-2">Solo founder building the future of quick-commerce</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Company Structure */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-8">The Setica Ecosystem</h2>
            <p className="text-xl text-gray-600 mb-12">
              SetCart is part of the Setica family, alongside other innovative products designed to make life easier.
            </p>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-xl">S</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Setica</h3>
                  <p className="text-gray-600">Parent Company</p>
                </div>
                
                <div className="hidden md:block w-16 h-px bg-gray-300"></div>
                
                <div className="text-center">
                  <div className="w-20 h-20 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-xl">SC</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">SetCart</h3>
                  <p className="text-gray-600">Quick Commerce</p>
                </div>
                
                <div className="hidden md:block w-16 h-px bg-gray-300"></div>
                
                <div className="text-center">
                  <div className="w-20 h-20 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-xl">+</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">More Soon</h3>
                  <p className="text-gray-600">Other Subsidiaries</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Experience the Difference?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of customers who've discovered what quick-commerce should really be like.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-300">
              Start Shopping
            </button>
            <a 
              href="https://quickcommerce-vjaz.vercel.app/support" 
              target="_blank" 
              rel="noopener noreferrer"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors duration-300"
            >
              Get in Touch
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;
