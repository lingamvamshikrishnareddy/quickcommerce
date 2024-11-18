import React, { useState } from 'react';
import { Search } from 'lucide-react';

// Note: You'll need to wrap this component with a Router in your app
const CategoryPage = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const mainCategories = [
    {
      title: "Grocery & Kitchen",
      items: [
        { name: "Fruits & Vegetables", image: "/api/placeholder/200/200", isEmergency: false },
        { name: "Dairy, Bread & Eggs", image: "/api/placeholder/200/200", isEmergency: true },
        { name: "Atta, Rice & Pulses", image: "/api/placeholder/200/200", isEmergency: false },
        { name: "Masala & Dry Fruits", image: "/api/placeholder/200/200", isEmergency: false },
        { name: "Breakfast & Sauces", image: "/api/placeholder/200/200", isEmergency: false },
        { name: "Packaged Foods", image: "/api/placeholder/200/200", isEmergency: false }
      ]
    },
    {
      title: "Snacks & Beverages",
      items: [
        { name: "Tea & Coffee", image: "/api/placeholder/200/200", isEmergency: false },
        { name: "Cold Drinks & Juices", image: "/api/placeholder/200/200", isEmergency: false },
        { name: "Biscuits & Cookies", image: "/api/placeholder/200/200", isEmergency: false },
        { name: "Chips & Namkeen", image: "/api/placeholder/200/200", isEmergency: false },
        { name: "Ice Creams", image: "/api/placeholder/200/200", isEmergency: true },
        { name: "Frozen Foods", image: "/api/placeholder/200/200", isEmergency: false }
      ]
    },
    {
      title: "Household Essentials",
      items: [
        { name: "Home Needs", image: "/api/placeholder/200/200", isEmergency: false },
        { name: "Cleaning Essentials", image: "/api/placeholder/200/200", isEmergency: true },
        { name: "Kitchen & Appliances", image: "/api/placeholder/200/200", isEmergency: false },
        { name: "Pet Care", image: "/api/placeholder/200/200", isEmergency: true },
        { name: "Stationery", image: "/api/placeholder/200/200", isEmergency: false },
        { name: "Tools & Storage", image: "/api/placeholder/200/200", isEmergency: false }
      ]
    },
    {
      title: "Beauty & Personal Care",
      items: [
        { name: "Makeup & Beauty", image: "/api/placeholder/200/200", isEmergency: false },
        { name: "Skin Care", image: "/api/placeholder/200/200", isEmergency: false },
        { name: "Hair Care", image: "/api/placeholder/200/200", isEmergency: false },
        { name: "Bath & Body", image: "/api/placeholder/200/200", isEmergency: false },
        { name: "Grooming", image: "/api/placeholder/200/200", isEmergency: false },
        { name: "Health & Wellness", image: "/api/placeholder/200/200", isEmergency: true }
      ]
    }
  ];

  const deals = [
    { category: "Electronics", discount: "95% Off", image: "/api/placeholder/300/200", isEmergency: false },
    { category: "Fashion", discount: "90% Off", image: "/api/placeholder/300/200", isEmergency: false },
    { category: "Kitchen", discount: "70% Off", image: "/api/placeholder/300/200", isEmergency: false },
    { category: "Beauty", discount: "50% Off", image: "/api/placeholder/300/200", isEmergency: false },
    { category: "Home", discount: "40% Off", image: "/api/placeholder/300/200", isEmergency: false }
  ];

  const handleItemClick = (item) => {
    // Replace these with your actual routing logic
    if (item.isEmergency) {
      console.log(`Navigating to emergency page for ${item.name}`);
      // Navigate to emergency page
      // history.push(`/emergency/${item.name.toLowerCase().replace(/\s+/g, '-')}`);
    } else {
      console.log(`Navigating to regular product page for ${item.name}`);
      // Navigate to regular product page
      // history.push(`/products/${item.name.toLowerCase().replace(/\s+/g, '-')}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Bar */}
      <div className="container mx-auto px-4 py-6">
        <div className="relative max-w-2xl mx-auto mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search for groceries, electronics, etc"
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        {/* Deals Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">New In Store</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {deals.map((deal, index) => (
              <div 
                key={index} 
                className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleItemClick(deal)}
              >
                <div className="relative">
                  <img src={deal.image} alt={deal.category} className="w-full h-40 object-cover" />
                  <div className="absolute top-3 left-3 bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                    <span className="font-semibold">{deal.discount}</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold">{deal.category}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Category Sections */}
        {mainCategories.map((section, sectionIndex) => (
          <section key={sectionIndex} className="mb-12">
            <h2 className="text-2xl font-bold mb-6">{section.title}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {section.items.map((item, itemIndex) => (
                <div 
                  key={itemIndex} 
                  className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="p-4">
                    <img src={item.image} alt={item.name} className="w-full h-32 object-cover rounded-lg mb-4" />
                    <h3 className="text-center text-sm font-medium">{item.name}</h3>
                    {item.isEmergency && (
                      <div className="mt-2">
                        <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                          Emergency
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
};

export default CategoryPage;