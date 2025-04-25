// src/pages/HomePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ChevronRight, Zap, ShoppingBag, AlertCircle } from 'lucide-react';
import { categoryAPI, productAPI } from '../services/api'; // Import correct API services
import RegularProductCard from '../components/regular/RegularProductCard';
import { Skeleton } from '../components/ui/skeleton';

// Placeholder images
const PLACEHOLDER_BANNER = '/images/placeholder-banner.png';
const PLACEHOLDER_CATEGORY = '/images/placeholder-category.png';
const PLACEHOLDER_PRODUCT_ERROR = '/images/placeholder-error.png';

// Constants for limits
const CATEGORY_LIMIT = 8;
const PRODUCT_LIMIT = 6;

// Error Message Component
const ErrorMessage = ({ message, onRetry }) => (
    <div className="text-center py-8 px-4 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-3" />
        <p className="text-red-700 font-medium mb-4">{message || 'Failed to load data.'}</p>
        {onRetry && (
            <Button variant="destructive" size="sm" onClick={onRetry}>
                Try Again
            </Button>
        )}
    </div>
);

// Section Header Component
const SectionHeader = ({ title, icon, onViewAllClick, loading, error }) => (
    <div className="flex items-center justify-between mb-4 sm:mb-6 min-h-[36px]">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center">
            {icon && !loading && !error && React.createElement(icon, { className: "mr-2 h-5 w-5 sm:h-6 sm:w-6 text-purple-600" })}
            {loading && <Skeleton className="mr-2 h-6 w-6 rounded-full" />}
            {error && <AlertCircle className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-red-500" />}
            {loading ? <Skeleton className="h-6 w-32 sm:w-48" /> : title}
        </h2>
        {!loading && !error && onViewAllClick && (
            <Button variant="ghost" className="text-purple-600 hover:text-purple-800 text-sm sm:text-base px-2 sm:px-3" onClick={onViewAllClick}>
                View All <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
        )}
    </div>
);

// Category Card Component
// Improved CategoryCard - add this to HomePage.jsx
const CategoryCard = ({ category }) => {
    const navigate = useNavigate();
    // Debug the category object
    console.log('CategoryCard received:', category);
    
    // Modified image handling to consider all possible structures
    const getImageUrl = (category) => {
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
    };
    
    const [imageUrl, setImageUrl] = useState(getImageUrl(category));

    useEffect(() => {
        setImageUrl(getImageUrl(category));
    }, [category]);

    const handleClick = useCallback(() => {
        if (category.slug) {
            navigate(`/products?category=${category.slug}`);
        } else {
            console.warn(`Category ${category.name} has no slug.`);
        }
    }, [navigate, category.slug, category.name]);

    const handleImageError = useCallback(() => {
        console.warn(`Failed to load category image: ${imageUrl}. Falling back to placeholder.`);
        setImageUrl(PLACEHOLDER_CATEGORY);
    }, [imageUrl]);

    return (
        <div
            className="text-center p-2 transition-transform duration-200 ease-in-out hover:scale-105 cursor-pointer group"
            onClick={handleClick}
            tabIndex={0}
            onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}
            role="button"
            aria-label={`Shop ${category.name}`}
        >
            <div className="aspect-square w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-2 sm:mb-3 overflow-hidden rounded-full border-2 border-gray-100 group-hover:border-purple-300 transition-colors">
                <img
                    src={imageUrl}
                    alt={category.name}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                    loading="lazy"
                />
            </div>
            <h3 className="font-medium text-xs sm:text-sm text-gray-700 group-hover:text-purple-600 truncate transition-colors" title={category.name}>
                {category.name}
            </h3>
        </div>
    );
};

// Loading Skeletons
const CategorySkeleton = () => (
    <div className="flex flex-col items-center p-2">
        <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-full mb-2 sm:mb-3" />
        <Skeleton className="h-4 w-16 sm:w-20" />
    </div>
);

const ProductSkeleton = () => (
    <Card className="border-transparent shadow-none overflow-hidden">
        <CardContent className="p-0">
            <Skeleton className="aspect-square w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-1" />
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-8 w-full mt-2" />
        </CardContent>
    </Card>
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

    // Fetch Top-Level Categories Function
    // Fix for fetchCategories function in HomePage.jsx
 // Enhanced fetchCategories function
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
        console.log("Categories API response:", response);
        
        // Detailed logging to understand the response structure
        if (response.data) {
            console.log("Response data keys:", Object.keys(response.data));
            
            if (response.data.success) {
                let categoriesData;
                
                // Check all possible places where categories might be stored
                if (Array.isArray(response.data.data)) {
                    console.log("Found categories in data array");
                    categoriesData = response.data.data;
                } else if (Array.isArray(response.data.categories)) {
                    console.log("Found categories in categories array");
                    categoriesData = response.data.categories;
                } else if (response.data.data && response.data.data.categories && Array.isArray(response.data.data.categories)) {
                    console.log("Found categories in data.categories array");
                    categoriesData = response.data.data.categories;
                } else {
                    console.error("No valid categories array found in response");
                    throw new Error("Invalid data structure");
                }
                
                // Log sample category to understand structure
                if (categoriesData.length > 0) {
                    console.log("Sample category object:", categoriesData[0]);
                }
                
                setCategories(categoriesData);
            } else {
                console.error("API indicated failure:", response.data.message);
                throw new Error(response.data.message || "Failed to load categories");
            }
        } else {
            console.error("No data in response");
            throw new Error("No data received from API");
        }
    } catch (error) {
        console.error("Error fetching categories:", error);
        setErrorCategories(error.message || "Could not fetch categories. Please try again.");
    } finally {
        setLoadingCategories(false);
    }
}, []);

// Enhanced fetchProducts function
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
        console.log("Products API response:", response);
        
        // Detailed logging to understand the response structure
        if (response.data) {
            console.log("Response data keys:", Object.keys(response.data));
            
            if (response.data.success) {
                let productsData;
                
                // Check all possible places where products might be stored
                if (Array.isArray(response.data.data)) {
                    console.log("Found products in data array");
                    productsData = response.data.data;
                } else if (Array.isArray(response.data.products)) {
                    console.log("Found products in products array");
                    productsData = response.data.products;
                } else if (response.data.data && response.data.data.products && Array.isArray(response.data.data.products)) {
                    console.log("Found products in data.products array");
                    productsData = response.data.data.products;
                } else {
                    console.error("No valid products array found in response");
                    throw new Error("Invalid data structure");
                }
                
                // Log sample product to understand structure
                if (productsData.length > 0) {
                    console.log("Sample product object:", productsData[0]);
                }
                
                setProducts(productsData);
            } else {
                console.error("API indicated failure:", response.data.message);
                throw new Error(response.data.message || "Failed to load products");
            }
        } else {
            console.error("No data in response");
            throw new Error("No data received from API");
        }
    } catch (error) {
        console.error("Error fetching products:", error);
        setErrorProducts(error.message || "Could not fetch products. Please try again.");
    } finally {
        setLoadingProducts(false);
    }
}, []);

    // Initial data fetch on mount
    useEffect(() => {
        fetchCategories();
        fetchProducts();
    }, [fetchCategories, fetchProducts]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-white">
            {/* Hero Banner */}
            <section className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-12 sm:py-16 md:py-20 mb-8 shadow-md">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-3 sm:mb-4 drop-shadow-lg">
                        Your Daily Essentials, Delivered Fast
                    </h1>
                    <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 max-w-2xl mx-auto opacity-90">
                        Groceries, fresh produce, household items, and more. Order now for quick delivery!
                    </p>
                    <Button
                        size="lg"
                        className="bg-white text-purple-700 hover:bg-gray-100 font-bold text-base px-6 py-3 rounded-full shadow-lg transition-transform hover:scale-105"
                        onClick={() => navigate('/categories')}
                    >
                        Shop All Categories <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
            </section>

            {/* Shop by Category Section */}
            <section className="container mx-auto px-4 mb-10 sm:mb-12">
                <SectionHeader
                    title="Shop by Category"
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
                            <CategoryCard key={category._id || category.slug} category={category} />
                        ))}
                    </div>
                )}
                {!loadingCategories && !errorCategories && categories.length === 0 && (
                    <p className='text-center text-gray-500 py-4'>No categories found.</p>
                )}
            </section>

            {/* Featured Deals / Trending Products Section */}
            <section className="container mx-auto px-4 mb-10 sm:mb-12">
                <SectionHeader
                    title="Fresh Arrivals"
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
                            <RegularProductCard key={product._id || product.slug} product={product} />
                        ))}
                    </div>
                )}
                {!loadingProducts && !errorProducts && products.length === 0 && (
                    <p className='text-center text-gray-500 py-4'>No products to display currently.</p>
                )}
            </section>

            {/* Promotional Banner */}
            <section className="container mx-auto px-4 mb-10 sm:mb-12">
                <div className="bg-gradient-to-r from-teal-400 to-blue-500 rounded-lg shadow-lg overflow-hidden">
                    <div className="p-6 sm:p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-white mb-4 md:mb-0 md:mr-6 text-center md:text-left">
                            <h3 className="text-xl sm:text-2xl font-bold mb-1">Fresh Fruits & Vegetables</h3>
                            <p className="text-sm sm:text-base opacity-90">Farm-fresh produce delivered daily.</p>
                        </div>
                        <Button
                            variant="secondary"
                            size="lg"
                            className="bg-white text-teal-600 hover:bg-gray-100 font-semibold px-5 py-2.5 rounded-full shadow transition-transform hover:scale-105 flex-shrink-0"
                            onClick={() => navigate('/products?category=fresh-produce')}
                        >
                            Shop Now
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
