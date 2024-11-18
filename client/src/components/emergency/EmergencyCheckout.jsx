import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Clock } from 'lucide-react';
import ProductCard from '../common/ProductCard';
import SearchBar from '../common/SearchBar';
import Filter from '../common/Filter';
import Pagination from '../common/Pagination';

const EmergencyProductList = () => {
  const [products] = useState([
    {
      id: 1,
      name: "Emergency First Aid Kit",
      price: 89.99,
      description: "Complete emergency medical kit",
      inStock: true,
      category: "Emergency",
      estimatedDelivery: "2 hours",
      priority: "High"
    },
    // Add more emergency products
  ]);

  const [filteredProducts, setFilteredProducts] = useState(products);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

  const handleSearch = (query) => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      product.description.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredProducts(filtered);
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Emergency Notice */}
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Emergency Orders</AlertTitle>
        <AlertDescription>
          These products are available for emergency delivery within 2-4 hours.
          Additional charges may apply for urgent delivery.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <Filter 
            onFilterChange={(filters) => {
              const filtered = products.filter(product => {
                const priceInRange = product.price >= filters.priceRange[0] && 
                                   product.price <= filters.priceRange[1];
                const categoryMatches = filters.categories[product.category.toLowerCase()];
                const availabilityMatches = 
                  (filters.availability.inStock && product.inStock) ||
                  (filters.availability.outOfStock && !product.inStock);

                return priceInRange && categoryMatches && availabilityMatches;
              });
              setFilteredProducts(filtered);
              setCurrentPage(1);
            }}
          />
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Search and Delivery Time */}
          <div className="mb-6 space-y-4">
            <SearchBar onSearch={handleSearch} />
            <div className="flex items-center gap-2 text-orange-600">
              <Clock className="h-5 w-5" />
              <span>Estimated delivery time: 2-4 hours</span>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts
              .slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage)
              .map(product => (
                <ProductCard 
                  key={product.id} 
                  product={{
                    ...product,
                    badge: product.priority === "High" ? "URGENT" : undefined
                  }} 
                />
              ))}
          </div>

          {/* Pagination */}
          <div className="mt-8">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredProducts.length / productsPerPage)}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyProductList;