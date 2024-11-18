import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '../ui/alert';
import ProductCard from '../common/ProductCard';
import SearchBar from '../common/SearchBar';
import Filter from '../common/Filter';
import Pagination from '../common/Pagination';
import { Clock, AlertTriangle } from 'lucide-react';

const EmergencyProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    category: 'all',
    priceRange: [0, 1000],
    availability: 'all',
    deliveryTime: 'all'
  });
  const [searchQuery, setSearchQuery] = useState('');

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    const fetchEmergencyProducts = async () => {
      try {
        setLoading(true);
        // Simulated API call - replace with actual API endpoint
        const response = await fetch('/api/emergency-products');
        const data = await response.json();
        setProducts(data);
      } catch (err) {
        setError('Failed to load emergency products. Please try again later.');
        console.error('Error fetching emergency products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmergencyProducts();
  }, []);

  const filterProducts = (products) => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = filters.category === 'all' || product.category === filters.category;
      
      const matchesPrice = product.price >= filters.priceRange[0] && 
                          product.price <= filters.priceRange[1];
      
      const matchesAvailability = filters.availability === 'all' || 
                                 (filters.availability === 'inStock' && product.stockStatus === 'In Stock') ||
                                 (filters.availability === 'outOfStock' && product.stockStatus === 'Out of Stock');
      
      const matchesDeliveryTime = filters.deliveryTime === 'all' ||
                                 (filters.deliveryTime === '1hour' && product.deliveryTime <= 60) ||
                                 (filters.deliveryTime === '2hours' && product.deliveryTime <= 120);

      return matchesSearch && matchesCategory && matchesPrice && 
             matchesAvailability && matchesDeliveryTime;
    });
  };

  const handleAddToCart = (product) => {
    // Implement cart functionality
    console.log('Added to cart:', product);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const filteredProducts = filterProducts(products);
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-6 h-6 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">Emergency Products</h1>
        </div>
        <p className="text-gray-600">
          Quick delivery guaranteed within 2 hours for all emergency products.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="w-full md:w-64">
          <Filter
            filters={filters}
            onFilterChange={handleFilterChange}
            className="sticky top-4"
          />
        </div>

        <div className="flex-1">
          <SearchBar
            value={searchQuery}
            onChange={handleSearch}
            className="mb-6"
            placeholder="Search emergency products..."
          />

          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No products found
              </h3>
              <p className="text-gray-600">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isEmergency={true}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmergencyProductList;