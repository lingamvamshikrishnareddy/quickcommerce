import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { productAPI, categoryAPI } from '../services/api';
import RegularProductCard from '../components/regular/RegularProductCard';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import { AlertCircle, ChevronRight, Filter } from 'lucide-react';

const ProductSkeleton = () => (
    <div className="border border-gray-100 rounded-lg overflow-hidden shadow-sm animate-pulse">
        <Skeleton className="aspect-square w-full bg-gray-200" />
        <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4 bg-gray-200 rounded" />
            <Skeleton className="h-4 w-1/2 bg-gray-200 rounded" />
            <Skeleton className="h-6 w-1/4 bg-gray-200 rounded" />
        </div>
    </div>
);

const ProductListPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [category, setCategory] = useState(null);
    const [subCategories, setSubCategories] = useState([]);
    const [loadingSubCategories, setLoadingSubCategories] = useState(false);
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();

    const categorySlug = useMemo(() => searchParams.get('category'), [searchParams]);
    const subCategoryParam = useMemo(() => searchParams.get('subCategory'), [searchParams]);
    const sortBy = useMemo(() => searchParams.get('sortBy') || 'createdAt', [searchParams]);
    const sortOrder = useMemo(() => searchParams.get('sortOrder') || 'desc', [searchParams]);

    // Fetch category details and subcategories
    useEffect(() => {
        const fetchCategoryDetails = async () => {
            if (!categorySlug) return;

            setLoadingSubCategories(true);
            try {
                // Use the correct API method with the correct endpoint
                const response = await categoryAPI.getCategoryBySlug(categorySlug);

                // Check response structure from your controller
                if (response?.data?.success && response?.data?.data?.category) {
                    setCategory(response.data.data.category);

                    // Access subcategories from the response
                    if (response.data.data.subcategories && response.data.data.subcategories.length > 0) {
                        setSubCategories(response.data.data.subcategories);
                        console.log("Found subcategories in category response:", response.data.data.subcategories);
                    }
                }
            } catch (err) {
                console.error("Error fetching category details:", err);
            } finally {
                setLoadingSubCategories(false);
            }
        };

        fetchCategoryDetails();
    }, [categorySlug]);

    // Fetch products
    const fetchProducts = async () => {
        setLoading(true);
        setError(null);

        try {
            // Limit the number of retries to prevent infinite loops
            let retryCount = 0;
            const maxRetries = 3;
            let success = false;

            // Set up base params
            const params = {
                limit: 24,
                page: 1,
                status: 'active',
                sortBy: sortBy,
                sortOrder: sortOrder,
                inStock: 'true',
            };

            if (categorySlug) {
                params.categorySlug = categorySlug;
            }

            if (subCategoryParam) {
                params.subCategory = subCategoryParam;
            }

            // Retry logic with backoff
            while (!success && retryCount < maxRetries) {
                try {
                    console.log(`Attempt ${retryCount + 1}: Making API call with params:`, params);
                    const response = await productAPI.getProducts(params);

                    // Validate and process the products with images
                    if (response.data?.success && Array.isArray(response.data.products)) {
                        // Process each product to ensure images are properly formatted
                        const processedProducts = response.data.products.map(product => {
                            // Ensure we have an array of images
                            if (!product.images) {
                                product.images = [];
                            } else if (!Array.isArray(product.images)) {
                                // Convert to array if it's not already
                                product.images = [product.images];
                            }
                            return product;
                        });
                        
                        setProducts(processedProducts);
                        console.log("Products found:", processedProducts.length);
                        success = true;
                    } else {
                        throw new Error(response.data?.message || "Failed to load products.");
                    }
                } catch (err) {
                    retryCount++;

                    if (err.response?.status === 429) {
                        // If rate limited, wait longer each time (exponential backoff)
                        const delay = 1000 * Math.pow(2, retryCount);
                        console.log(`Rate limited. Waiting ${delay}ms before retrying...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else if (retryCount < maxRetries) {
                        // Other error but we have retries left
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } else {
                        // No more retries or different error
                        throw err;
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching products in ProductListPage:", err);
            setError(err.message || "Could not fetch products.");
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [categorySlug, subCategoryParam, sortBy, sortOrder, location.search]);

    // Function to get the value to use for a subcategory (slug or name)
    const getSubCategoryValue = (subCat) => {
        if (typeof subCat === 'string') {
            return subCat;
        } else if (subCat && typeof subCat === 'object') {
            return subCat.slug || subCat.name || String(subCat);
        }
        return '';
    };

    // Function to get display text for a subcategory
    const getSubCategoryDisplayText = (subCat) => {
        const value = getSubCategoryValue(subCat);
        return typeof value === 'string' ? value.replace(/-/g, ' ') : value;
    };

    // Function to handle sorting
    const handleSortChange = (newSortBy, newSortOrder) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('sortBy', newSortBy);
        newParams.set('sortOrder', newSortOrder);
        navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
    };

    // Function to handle subcategory selection
    const handleSubCategorySelect = (subCat) => {
        const subCatValue = getSubCategoryValue(subCat);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('subCategory', subCatValue);
        navigate(`${location.pathname}?${newParams.toString()}`);
    };

    // Function to clear subcategory filter
    const clearSubCategoryFilter = () => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('subCategory');
        navigate(`${location.pathname}?${newParams.toString()}`);
    };

    // Get formatted category name
    const getCategoryName = () => {
        if (category && category.name) {
            return category.name;
        }
        return categorySlug ? categorySlug.replace(/-/g, ' ') : 'All Products';
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 capitalize">
                {getCategoryName()}
                {subCategoryParam && (
                    <span className="text-xl text-gray-600 ml-2">
                        <ChevronRight className="inline h-5 w-5" />
                        <span className="ml-1 capitalize">{subCategoryParam.replace(/-/g, ' ')}</span>
                    </span>
                )}
            </h1>

            {/* SubCategories Navigation */}
            {subCategories.length > 0 && (
                <div className="mb-6">
                    <div className="flex items-center mb-2">
                        <Filter className="h-4 w-4 mr-2 text-gray-500" />
                        <h2 className="text-sm font-medium text-gray-600">Browse Subcategories:</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {subCategoryParam && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearSubCategoryFilter}
                                className="bg-gray-100"
                            >
                                All {getCategoryName()}
                            </Button>
                        )}

                        {subCategories.map((subCat, index) => {
                            const subCatValue = getSubCategoryValue(subCat);
                            const displayText = getSubCategoryDisplayText(subCat);

                            return (
                                <Button
                                    key={index}
                                    variant={subCategoryParam === subCatValue ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleSubCategorySelect(subCat)}
                                >
                                    {displayText}
                                </Button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Sort Controls */}
            <div className="mb-6 flex gap-2 items-center flex-wrap">
                <span className="text-sm font-medium mr-2">Sort by:</span>
                <Button
                    variant={sortBy === 'createdAt' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSortChange('createdAt', 'desc')}
                >
                    Newest
                </Button>
                <Button
                    variant={sortBy === 'pricing.salePrice' && sortOrder === 'asc' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSortChange('pricing.salePrice', 'asc')}
                >
                    Price: Low to High
                </Button>
                <Button
                    variant={sortBy === 'pricing.salePrice' && sortOrder === 'desc' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSortChange('pricing.salePrice', 'desc')}
                >
                    Price: High to Low
                </Button>
            </div>

            {/* Products Grid */}
            {loading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
                    {[...Array(10)].map((_, i) => <ProductSkeleton key={i} />)}
                </div>
            )}

            {!loading && error && (
                <div className="text-center py-10 px-4 bg-red-50 border border-red-200 rounded-lg max-w-lg mx-auto">
                    <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-3" />
                    <p className="text-red-700 font-medium mb-4">{error}</p>
                    <Button variant="destructive" size="sm" onClick={fetchProducts}>
                        Try Again
                    </Button>
                </div>
            )}

            {!loading && !error && products.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
                    {products.map(product => (
                        <RegularProductCard key={product._id || product.slug} product={product} />
                    ))}
                </div>
            )}

            {!loading && !error && products.length === 0 && (
                <div className="text-center py-16 text-gray-500">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg">
                        No products found {subCategoryParam
                            ? `in "${subCategoryParam.replace(/-/g, ' ')}"`
                            : categorySlug
                                ? `in "${getCategoryName()}"`
                                : ''}.
                    </p>
                    <Button variant="link" onClick={() => navigate('/categories')} className="mt-2 text-purple-600">
                        Browse Categories
                    </Button>
                </div>
            )}
        </div>
    );
};

export default ProductListPage;