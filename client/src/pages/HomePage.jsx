// src/pages/HomePage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ChevronRight, Zap, ShoppingBag, AlertCircle, Star, Clock, Truck } from 'lucide-react';
import { categoryAPI, productAPI } from '../services/api';
import RegularProductCard from '../components/regular/RegularProductCard';
import { Skeleton } from '../components/ui/skeleton';

// Placeholder images - consider using WebP format for better performance
const PLACEHOLDER_BANNER = '/images/placeholder-banner.webp';
const PLACEHOLDER_CATEGORY = '/images/placeholder-category.webp';
const PLACEHOLDER_PRODUCT_ERROR = '/images/placeholder-error.webp';

// Constants for limits
const CATEGORY_LIMIT = 8;
const PRODUCT_LIMIT = 6;

// SEO structured data for the homepage
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "SetCart",
  "url": "https://www.setcart.in",
  "description": "Fast grocery delivery service - Get fresh groceries delivered to your doorstep in minutes",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://www.setcart.in/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

// Error Message Component with better accessibility
const ErrorMessage = ({ message, onRetry }) => (
  <div 
    className="text-center py-8 px-4 bg-red-50 border border-red-200 rounded-lg"
    role="alert"
    aria-live="polite"
  >
    <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-3" aria-hidden="true" />
    <p className="text-red-700 font-medium mb-4">{message || 'Failed to load data.'}</p>
    {onRetry && (
      <Button 
        variant="destructive" 
        size="sm" 
        onClick={onRetry}
        aria-label="Retry loading data"
      >
        Try Again
      </Button>
    )}
  </div>
);

// Section Header Component with improved accessibility
const SectionHeader = ({ title, icon, onViewAllClick, loading, error, description }) => (
  <div className="flex items-center justify-between mb-4 sm:mb-6 min-h-[36px]">
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center">
        {icon && !loading && !error && React.createElement(icon, { 
          className: "mr-2 h-5 w-5 sm:h-6 sm:w-6 text-purple-600",
          "aria-hidden": "true"
        })}
        {loading && <Skeleton className="mr-2 h-6 w-6 rounded-full" />}
        {error && <AlertCircle className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-red-500" aria-hidden="true" />}
        {loading ? <Skeleton className="h-6 w-32 sm:w-48" /> : title}
      </h2>
      {description && !loading && !error && (
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      )}
    </div>
    {!loading && !error && onViewAllClick && (
      <Button 
        variant="ghost" 
        className="text-purple-600 hover:text-purple-800 text-sm sm:text-base px-2 sm:px-3" 
        onClick={onViewAllClick}
        aria-label={`View all ${title.toLowerCase()}`}
      >
        View All <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
      </Button>
    )}
  </div>
);

// Enhanced Category Card Component with better performance and accessibility
const CategoryCard = React.memo(({ category }) => {
  const navigate = useNavigate();
  
  // Memoized image URL calculation
  const imageUrl = useMemo(() => {
    if (category.image) return category.image;
    if (category.images) {
      if (Array.isArray(category.images) && category.images.length > 0) {
        const img = category.images[0];
        return typeof img === 'string' ? img : img?.url || img?.src;
      }
      if (typeof category.images === 'string') return category.images;
      if (category.images.url) return category.images.url;
      if (category.images.src) return category.images.src;
    }
    return PLACEHOLDER_CATEGORY;
  }, [category]);
  
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);

  useEffect(() => {
    setCurrentImageUrl(imageUrl);
  }, [imageUrl]);

  const handleClick = useCallback(() => {
    if (category.slug) {
      navigate(`/products?category=${category.slug}`);
    } else {
      console.warn(`Category ${category.name} has no slug.`);
    }
  }, [navigate, category.slug, category.name]);

  const handleImageError = useCallback(() => {
    console.warn(`Failed to load category image: ${currentImageUrl}. Falling back to placeholder.`);
    setCurrentImageUrl(PLACEHOLDER_CATEGORY);
  }, [currentImageUrl]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  return (
    <div
      className="text-center p-2 transition-all duration-300 ease-in-out hover:scale-105 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded-lg"
      onClick={handleClick}
      tabIndex={0}
      onKeyPress={handleKeyPress}
      role="button"
      aria-label={`Shop ${category.name} category`}
    >
      <div className="aspect-square w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-2 sm:mb-3 overflow-hidden rounded-full border-2 border-gray-100 group-hover:border-purple-300 group-focus:border-purple-400 transition-colors shadow-sm">
        <img
          src={currentImageUrl}
          alt={`${category.name} category`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          onError={handleImageError}
          loading="lazy"
          decoding="async"
        />
      </div>
      <h3 className="font-medium text-xs sm:text-sm text-gray-700 group-hover:text-purple-600 truncate transition-colors" title={category.name}>
        {category.name}
      </h3>
    </div>
  );
});

CategoryCard.displayName = 'CategoryCard';

// Loading Skeletons with better animations
const CategorySkeleton = () => (
  <div className="flex flex-col items-center p-2 animate-pulse">
    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-200 mb-2 sm:mb-3" />
    <div className="h-4 w-16 sm:w-20 bg-gray-200 rounded" />
  </div>
);

const ProductSkeleton = () => (
  <Card className="border-transparent shadow-none overflow-hidden animate-pulse">
    <CardContent className="p-0">
      <div className="aspect-square w-full bg-gray-200 mb-2" />
      <div className="h-4 w-3/4 bg-gray-200 rounded mb-1" />
      <div className="h-4 w-1/2 bg-gray-200 rounded mb-2" />
      <div className="h-8 w-full bg-gray-200 rounded mt-2" />
    </CardContent>
  </Card>
);

// Feature highlight component
const FeatureHighlight = ({ icon: Icon, title, description }) => (
  <div className="flex items-center space-x-3 p-4 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm">
    <div className="flex-shrink-0">
      <Icon className="h-8 w-8 text-purple-600" aria-hidden="true" />
    </div>
    <div>
      <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
      <p className="text-xs text-gray-600">{description}</p>
    </div>
  </div>
);

// Main HomePage Component
const HomePage = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [errorCategories, setErrorCategories] = useState(null);
  const [errorProducts, setErrorProducts] = useState(null);
  const navigate = useNavigate();

  // Enhanced fetchCategories function with better error handling
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    setErrorCategories(null);
    try {
      console.log("Fetching categories for homepage...");
      const response = await categoryAPI.getAll({
        parentOnly: true,
        limit: CATEGORY_LIMIT,
        status: 'active'
      });
      
      if (response?.data?.success) {
        let categoriesData;
        
        if (Array.isArray(response.data.data)) {
          categoriesData = response.data.data;
        } else if (Array.isArray(response.data.categories)) {
          categoriesData = response.data.categories;
        } else if (response.data.data?.categories && Array.isArray(response.data.data.categories)) {
          categoriesData = response.data.data.categories;
        } else {
          throw new Error("Invalid data structure received from server");
        }
        
        setCategories(categoriesData.slice(0, CATEGORY_LIMIT));
      } else {
        throw new Error(response?.data?.message || "Failed to load categories");
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      setErrorCategories("Unable to load categories. Please check your connection and try again.");
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // Enhanced fetchProducts function with better error handling
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    setErrorProducts(null);
    try {
      console.log("Fetching products for homepage...");
      const response = await productAPI.getProducts({
        limit: PRODUCT_LIMIT,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        status: 'active'
      });
      
      if (response?.data?.success) {
        let productsData;
        
        if (Array.isArray(response.data.data)) {
          productsData = response.data.data;
        } else if (Array.isArray(response.data.products)) {
          productsData = response.data.products;
        } else if (response.data.data?.products && Array.isArray(response.data.data.products)) {
          productsData = response.data.data.products;
        } else {
          throw new Error("Invalid data structure received from server");
        }
        
        setProducts(productsData.slice(0, PRODUCT_LIMIT));
      } else {
        throw new Error(response?.data?.message || "Failed to load products");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setErrorProducts("Unable to load products. Please check your connection and try again.");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // Initial data fetch on mount
  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [fetchCategories, fetchProducts]);

  // Memoized feature highlights
  const featureHighlights = useMemo(() => [
    {
      icon: Clock,
      title: "10-Minute Delivery",
      description: "Ultra-fast delivery to your doorstep"
    },
    {
      icon: Star,
      title: "Fresh Quality",
      description: "Handpicked fresh produce daily"
    },
    {
      icon: Truck,
      title: "Free Delivery",
      description: "On orders above ₹199"
    }
  ], []);

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>SetCart - Fast Grocery Delivery | Fresh Groceries in 10 Minutes</title>
        <meta name="description" content="Order groceries online and get them delivered in 10 minutes. Fresh produce, household essentials, and more. Fast, reliable, and convenient grocery delivery service." />
        <meta name="keywords" content="grocery delivery, online groceries, fast delivery, fresh produce, household essentials, SetCart" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="canonical" href="https://www.setcart.in/" />
        
        {/* Open Graph */}
        <meta property="og:title" content="SetCart - Fast Grocery Delivery in 10 Minutes" />
        <meta property="og:description" content="Get groceries delivered to your doorstep in just 10 minutes. Fresh, fast, and reliable grocery delivery service." />
        <meta property="og:image" content="https://www.setcart.in/og-image.webp" />
        <meta property="og:url" content="https://www.setcart.in/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="SetCart" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="SetCart - Fast Grocery Delivery" />
        <meta name="twitter:description" content="Get groceries delivered in 10 minutes. Fresh, fast, reliable." />
        <meta name="twitter:image" content="https://www.setcart.in/twitter-image.webp" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
        
        {/* Preload critical resources */}
        <link rel="preload" href="/images/hero-banner.webp" as="image" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-white">
        {/* Hero Banner with enhanced design */}
        <section className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 text-white py-12 sm:py-16 md:py-20 mb-8 shadow-lg relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[url('/images/pattern.svg')] opacity-10"></div>
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-3 sm:mb-4 drop-shadow-lg leading-tight">
              Your Daily Essentials,
              <span className="block text-yellow-300">Delivered in 10 Minutes</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 max-w-2xl mx-auto opacity-95 leading-relaxed">
              Fresh groceries, household items, and daily essentials delivered faster than ever. 
              Experience the convenience of ultra-quick delivery!
            </p>
            
            {/* Feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
              {featureHighlights.map((feature, index) => (
                <FeatureHighlight key={index} {...feature} />
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                className="bg-white text-purple-700 hover:bg-gray-100 font-bold text-base px-8 py-4 rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                onClick={() => navigate('/categories')}
                aria-label="Browse all product categories"
              >
                Shop All Categories <ChevronRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-purple-700 font-semibold text-base px-8 py-4 rounded-full transition-all duration-300 hover:scale-105"
                onClick={() => navigate('/products?sortBy=popular')}
                aria-label="View popular products"
              >
                Popular Products
              </Button>
            </div>
          </div>
        </section>

        {/* Shop by Category Section */}
        <section className="container mx-auto px-4 mb-10 sm:mb-12">
          <SectionHeader
            title="Shop by Category"
            description="Browse our wide range of product categories"
            icon={ShoppingBag}
            onViewAllClick={() => navigate('/categories')}
            loading={loadingCategories}
            error={!!errorCategories}
          />
          
          {loadingCategories && (
            <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
              {[...Array(CATEGORY_LIMIT)].map((_, i) => <CategorySkeleton key={i} />)}
            </div>
          )}
          
          {!loadingCategories && errorCategories && (
            <ErrorMessage message={errorCategories} onRetry={fetchCategories} />
          )}
          
          {!loadingCategories && !errorCategories && categories.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
              {categories.map(category => (
                <CategoryCard 
                  key={category._id || category.slug || category.name} 
                  category={category} 
                />
              ))}
            </div>
          )}
          
          {!loadingCategories && !errorCategories && categories.length === 0 && (
            <div className="text-center py-8">
              <ShoppingBag className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className='text-gray-500'>No categories available at the moment.</p>
            </div>
          )}
        </section>

        {/* Fresh Arrivals Section */}
        <section className="container mx-auto px-4 mb-10 sm:mb-12">
          <SectionHeader
            title="Fresh Arrivals"
            description="Discover our latest products and fresh additions"
            icon={Zap}
            onViewAllClick={() => navigate('/products?sortBy=createdAt&sortOrder=desc')}
            loading={loadingProducts}
            error={!!errorProducts}
          />
          
          {loadingProducts && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
              {[...Array(PRODUCT_LIMIT)].map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          )}
          
          {!loadingProducts && errorProducts && (
            <ErrorMessage message={errorProducts} onRetry={fetchProducts} />
          )}
          
          {!loadingProducts && !errorProducts && products.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
              {products.map(product => (
                <RegularProductCard 
                  key={product._id || product.slug || product.name} 
                  product={product} 
                />
              ))}
            </div>
          )}
          
          {!loadingProducts && !errorProducts && products.length === 0 && (
            <div className="text-center py-8">
              <Zap className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className='text-gray-500'>No products to display currently.</p>
            </div>
          )}
        </section>

        {/* Enhanced Promotional Banner */}
        <section className="container mx-auto px-4 mb-10 sm:mb-12">
          <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-xl shadow-xl overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[url('/images/fruits-pattern.svg')] opacity-20"></div>
            
            <div className="p-6 sm:p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="text-white text-center md:text-left flex-1">
                <h3 className="text-2xl sm:text-3xl font-bold mb-2">
                  🥬 Fresh Fruits & Vegetables
                </h3>
                <p className="text-base sm:text-lg opacity-95 mb-4 md:mb-0">
                  Farm-fresh produce delivered daily. Handpicked for quality and freshness.
                </p>
                <div className="flex items-center justify-center md:justify-start space-x-4 text-sm opacity-90">
                  <span>✓ Pesticide-free</span>
                  <span>✓ Same-day harvest</span>
                  <span>✓ Quality guaranteed</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-white text-emerald-600 hover:bg-gray-100 font-bold px-8 py-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                  onClick={() => navigate('/products?category=fresh-produce')}
                  aria-label="Shop fresh produce category"
                >
                  Shop Fresh Produce
                </Button>
              </div>
            </div>
          </div>
        </section>

       
      
      </div>
    </>
  );
};

export default HomePage;
