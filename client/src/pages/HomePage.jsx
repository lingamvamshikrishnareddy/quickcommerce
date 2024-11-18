import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ChevronRight, Zap } from 'lucide-react';

const HomePage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate an API call to fetch trending products
    setTrendingProducts([
      { id: 1, name: 'Product 1', image: '/path/to/image1' },
      { id: 2, name: 'Product 2', image: '/path/to/image2' },
    ]);
  }, []);

  const categories = [
    { id: 1, name: 'Grocery & Kitchen', subcategories: [
      { name: 'Fruits & Vegetables', image: '/api/placeholder/200/200' },
      { name: 'Dairy, Bread & Eggs', image: '/api/placeholder/200/200' },
      { name: 'Atta, Rice, Oil & Dals', image: '/api/placeholder/200/200' },
      { name: 'Meats, Fish & Eggs', image: '/api/placeholder/200/200' },
    ]},
    { id: 2, name: 'Beauty & Personal Care', subcategories: [
      { name: 'Makeup & Beauty', image: '/api/placeholder/200/200' },
      { name: 'Skincare', image: '/api/placeholder/200/200' },
      { name: 'Hair Care', image: '/api/placeholder/200/200' },
      { name: 'Bath & Body', image: '/api/placeholder/200/200' },
    ]},
  ];

  const deals = [
    { id: 1, title: 'Flash Sale', discount: '85% Off', image: '/api/placeholder/200/200', category: 'Toys' },
    { id: 2, title: 'Fashion Week', discount: '90% Off', image: '/api/placeholder/200/200', category: 'Fashion' },
    { id: 3, title: 'Tech Deals', discount: '95% Off', image: '/api/placeholder/200/200', category: 'Electronics' },
    { id: 4, title: 'Kitchen Sale', discount: '70% Off', image: '/api/placeholder/200/200', category: 'Kitchen Items' },
  ];

  const navigateToCategoryPage = (categoryName) => {
    navigate(`/categories/${categoryName.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Categories Grid */}
      <div className="max-w-7xl mx-auto mt-8 px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Categories</h2>
          <Button variant="ghost" className="text-purple-600" onClick={() => navigate('/categories')}>
            View All <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(category => (
            <div key={category.id}>
              <Card className="h-full">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 cursor-pointer" onClick={() => navigateToCategoryPage(category.name)}>
                    {category.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {category.subcategories.map((sub, idx) => (
                      <div key={idx} className="text-sm cursor-pointer hover:text-purple-600">
                        <img src={sub.image} alt={sub.name} className="w-full h-24 object-cover rounded-lg mb-1" />
                        <p className="truncate">{sub.name}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Deals Grid */}
      <div className="max-w-7xl mx-auto mt-8 px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center">
            <Zap className="mr-2 h-5 w-5 text-yellow-500" />
            Trending Deals
          </h2>
          <Button variant="ghost" className="text-purple-600" onClick={() => navigate('/deals')}>
            View All <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {deals.map(deal => (
            <div key={deal.id}>
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <img src={deal.image} alt={deal.title} className="w-full h-32 object-cover rounded-lg mb-2" />
                  <h3 className="font-semibold text-lg">{deal.category}</h3>
                  <p className="text-purple-600 font-bold">{deal.discount}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Festival/Seasonal Section */}
      <div className="max-w-7xl mx-auto mt-8 px-4 mb-8">
        <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-4">Festival Special</h2>
            <p className="mb-4">Exclusive deals on festival essentials</p>
            <Button variant="secondary" className="bg-white text-purple-600 hover:bg-gray-100" onClick={() => navigate('/festival-deals')}>
              Shop Now
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;
