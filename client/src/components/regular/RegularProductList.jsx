// src/components/regular/RegularProductList.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { productAPI, categoryAPI } from '../../services/api'; // Use your API service
import { Input } from "../ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { Loader2, Search, ListFilter, X } from 'lucide-react';
import debounce from 'lodash/debounce';
import RegularProductCard from './RegularProductCard'; // Import the refactored card

// --- Helper Hooks & Constants ---
function useQuery() {
    const { search } = useLocation();
    return useMemo(() => new URLSearchParams(search), [search]);
}

const SORT_OPTIONS = [
    { value: 'popularity', label: 'Popularity', backendSort: 'rating.count', backendOrder: 'desc' }, // Example: popularity by review count
    { value: 'price_asc', label: 'Price: Low to High', backendSort: 'pricing.salePrice', backendOrder: 'asc' },
    { value: 'price_desc', label: 'Price: High to Low', backendSort: 'pricing.salePrice', backendOrder: 'desc' },
    { value: 'newest', label: 'Newest First', backendSort: 'metadata.createdAt', backendOrder: 'desc' },
];

const DEBOUNCE_DELAY = 500; // Delay for search input debounce

// --- Component ---
const RegularProductList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = useQuery();

  // --- State ---
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [categoryTitle, setCategoryTitle] = useState('Products');
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [filters, setFilters] = useState({
      search: queryParams.get('search') || '',
      sortBy: queryParams.get('sortBy') || 'popularity',
      // Add other filters like brand, priceRange if needed
  });
  // Derived state from URL query parameters
  const categorySlug = queryParams.get('category');
  const currentPage = parseInt(queryParams.get('page') || '1', 10);

  // --- Data Fetching ---
  const fetchProductsData = useCallback(async (pageToFetch, currentFilters, slug) => {
      if (pageToFetch > 1) setLoadingMore(true); else setLoading(true);
      setError(null);

      try {
          // Find the backend sort parameters based on frontend value
          const sortOption = SORT_OPTIONS.find(opt => opt.value === currentFilters.sortBy) || SORT_OPTIONS[0];

          const params = {
              page: pageToFetch,
              limit: 24, // Adjust limit as needed
              search: currentFilters.search || undefined, // Don't send empty search
              sortBy: sortOption.backendSort,
              sortOrder: sortOption.backendOrder,
              // Add other filters from currentFilters here (e.g., brand, minPrice, maxPrice)
          };

          // Add categorySlug only if it exists
          if (slug) {
              params.categorySlug = slug;
          }

          console.log("FRONTEND (ProductList): Fetching products with params:", params);
          const response = await productAPI.getProducts(params);

          if (response.data?.success) {
              setProducts(prev => pageToFetch === 1 ? response.data.products : [...prev, ...response.data.products]);
              setPagination(response.data.pagination);
              console.log(`FRONTEND (ProductList): Fetched ${response.data.products.length} products. Pagination:`, response.data.pagination);
          } else {
              throw new Error(response.data?.message || 'Failed to fetch products');
          }

      } catch (err) {
          const errorMsg = err.message || 'Could not load products.';
          console.error("!!!!!!!!!! FRONTEND (ProductList) ERROR CAUGHT !!!!!!!!!!:", errorMsg, err);
          setError(errorMsg);
          // Reset products if initial load fails
          if(pageToFetch === 1) setProducts([]);
      } finally {
          if (pageToFetch > 1) setLoadingMore(false); else setLoading(false);
      }
  }, []); // Dependencies are handled in useEffect

  // --- Debounced Search ---
  const debouncedSearch = useMemo(
      () => debounce((searchValue) => {
          setFilters(prev => ({ ...prev, search: searchValue }));
          // Update URL without full reload for search
          const newSearchParams = new URLSearchParams(location.search);
          if (searchValue) {
              newSearchParams.set('search', searchValue);
          } else {
              newSearchParams.delete('search');
          }
          newSearchParams.set('page', '1'); // Reset to page 1 on search
          navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
      }, DEBOUNCE_DELAY),
      [navigate, location.pathname, location.search]
  );

  // Effect to handle filter changes from UI -> Update URL
  const handleFilterChange = (filterName, value) => {
      setFilters(prev => ({ ...prev, [filterName]: value }));

      // Update URL when filters change
      const newSearchParams = new URLSearchParams(location.search);
      newSearchParams.set(filterName, value);
      newSearchParams.set('page', '1'); // Reset to page 1 on filter change
      navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
  };

  // Effect for Initial Load & URL Param Changes
  useEffect(() => {
      console.log(`FRONTEND (ProductList): Effect triggered. categorySlug: ${categorySlug}, currentPage: ${currentPage}, filters:`, filters);
      fetchProductsData(currentPage, filters, categorySlug);

      // Fetch category title if slug exists
      if (categorySlug && categoryTitle === 'Products') { // Only fetch if title is default
          categoryAPI.getCategoryBySlug(categorySlug)
              .then(res => {
                  if (res.data?.success && res.data?.data?.category?.name) {
                      setCategoryTitle(res.data.data.category.name);
                  } else {
                      setCategoryTitle(`Category: ${categorySlug}`);
                  }
              })
              .catch(err => {
                  console.error("Error fetching category title:", err);
                  setCategoryTitle(`Category: ${categorySlug}`);
              });
      } else if (!categorySlug) {
          setCategoryTitle('All Products');
      }

      // Cleanup debounce on component unmount
      return () => debouncedSearch.cancel();

  }, [categorySlug, currentPage, filters.sortBy, fetchProductsData]); // Watch URL params and sort filter

   // Separate effect only for search input changes (uses debounced handler)
  useEffect(() => {
      // Update internal state immediately for responsiveness
      // The actual URL update and data fetch is handled by the debounced function
      const currentSearchInUrl = queryParams.get('search') || '';
      if (filters.search !== currentSearchInUrl) {
          setFilters(prev => ({ ...prev, search: currentSearchInUrl }));
      }
  }, [queryParams]); // Re-sync internal state if URL search changes directly

  // Handle "Load More" Button Click
  const loadMoreProducts = () => {
      const nextPage = pagination.currentPage + 1;
      const newSearchParams = new URLSearchParams(location.search);
      newSearchParams.set('page', nextPage.toString());
      navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
  };

  // --- Derived State ---
  const hasMore = pagination.currentPage < pagination.totalPages;

  // --- Rendering ---
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Page Title */}
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 capitalize">
        {loading ? 'Loading...' : categoryTitle}
      </h1>

      {/* Filters Bar */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200 sticky top-[60px] z-10"> {/* Adjust top offset based on header height */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-center">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search products in this category..."
              defaultValue={filters.search} // Use defaultValue with debounce
              onChange={(e) => debouncedSearch(e.target.value)}
              className="pl-10 pr-4 py-2 text-sm"
              aria-label="Search products"
            />
          </div>

          {/* Sort Select */}
          <Select
            value={filters.sortBy}
            onValueChange={(value) => handleFilterChange('sortBy', value)}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-sm">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* TODO: Add More Filters (Optional) */}
          <Button variant="outline" className="text-sm md:col-start-3 lg:col-start-4" onClick={() => alert('More filters coming soon!')}>
            <ListFilter className="mr-2 h-4 w-4" /> Filters
          </Button>
        </div>
      </div>

      {/* Loading State (Initial Load) */}
      {loading && (
        <div className="flex justify-center items-center min-h-[300px]">
          <Loader2 className="animate-spin h-10 w-10 text-purple-600" />
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="text-center py-10 px-4 border border-red-200 bg-red-50 rounded-lg">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Oops! Something went wrong.</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <Button
            onClick={() => window.location.reload()} // Simple retry
            variant="destructive"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Product Grid */}
      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {products.map(product => (
            <RegularProductCard key={product._id || product.slug} product={product} />
          ))}
        </div>
      )}

      {/* No Results State */}
      {!loading && !error && products.length === 0 && (
        <div className="text-center py-16 px-4 border border-gray-200 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Products Found</h2>
          <p className="text-gray-500">Try adjusting your search or filters.</p>
          {/* Optionally add a button to clear filters */}
        </div>
      )}

      {/* Load More Button / Loading More Spinner */}
      {!loading && !error && hasMore && (
        <div className="text-center mt-8">
          <Button
            onClick={loadMoreProducts}
            disabled={loadingMore}
            variant="outline"
          >
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
              </>
            ) : (
              'Load More Products'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default RegularProductList;