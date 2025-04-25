// CategoryPage.jsx
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Loader2, AlertTriangle, List, Zap } from 'lucide-react';
import { categoryAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';

// Placeholders
const PLACEHOLDER_IMG_CATEGORY = '/images/placeholder-200.png';
const PLACEHOLDER_IMG_DEAL = '/images/placeholder-300.png';
const PLACEHOLDER_IMG_ERROR = '/images/placeholder-error.png';

// Excluded categories
const EXCLUDED_CATEGORIES = ['null', 'Uncategorized','nan'];

// Reusable Image Component with Fallback
const ImageWithFallback = ({ src, alt, className, initialFallback = PLACEHOLDER_IMG_CATEGORY, errorFallback = PLACEHOLDER_IMG_ERROR }) => {
  const [imgSrc, setImgSrc] = useState(src || initialFallback);

  useEffect(() => {
    setImgSrc(src || initialFallback);
  }, [src, initialFallback]);

  const handleError = useCallback(() => {
    console.warn(`Failed to load image: ${src}. Falling back to ${errorFallback}.`);
    setImgSrc(current => (current !== errorFallback ? errorFallback : PLACEHOLDER_IMG_ERROR));
  }, [src, errorFallback]);

  return (
    <img
      src={imgSrc}
      alt={alt || 'Image'}
      className={className}
      onError={handleError}
      loading="lazy"
    />
  );
};

// Memoized Card Components
const MemoizedCategoryCard = memo(CategoryCard);
const MemoizedDealCard = memo(DealCard);

// Main Category Page Component
const CategoryPage = () => {
  const [allCategories, setAllCategories] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [errorCategories, setErrorCategories] = useState(null);
  const [errorDeals, setErrorDeals] = useState(null);
  const navigate = useNavigate();

  // Fetch All Categories Function
  const fetchAllCategories = useCallback(async () => {
    setLoadingCategories(true);
    setErrorCategories(null);
    try {
      const response = await categoryAPI.getAllCategories({ limit: 0, status: 'active', sort: 'name', order: 'asc' });
      if (!response?.data?.success || !Array.isArray(response?.data?.data)) {
        throw new Error(response?.data?.message || "Invalid data structure for categories.");
      }
      
      // Filter out invalid categories and excluded categories
      const validCategories = response.data.data
        .filter(cat => cat && cat.name && cat.slug)
        .filter(cat => !EXCLUDED_CATEGORIES.includes(cat.name));
      
      setAllCategories(validCategories);
    } catch (err) {
      console.error("Error fetching all categories:", err);
      setErrorCategories(err.message || "Could not load categories.");
      setAllCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // Fetch Featured Deals Function (using featured categories)
  const fetchFeaturedDeals = useCallback(async () => {
    setLoadingDeals(true);
    setErrorDeals(null);
    try {
      // Use the dedicated featured categories endpoint
      const response = await categoryAPI.getFeaturedCategories({ limit: 5 });

      if (!response?.data?.success || !Array.isArray(response?.data?.data)) {
        console.warn("Invalid data structure for featured categories.", response?.data);
        setDeals([]);
      } else {
        // Transform featured categories into a "deal" structure for display
        // Filter out excluded categories from deals as well
        const transformedDeals = response.data.data
          .filter(category => !EXCLUDED_CATEGORIES.includes(category.name))
          .map(category => ({
            _id: category._id,
            category: category.name,
            discount: `${Math.floor(Math.random() * 30) + 10}% Off`,
            image: category.image,
            slug: category.slug,
          }))
          .filter(deal => deal && deal.category && deal.slug);
        
        setDeals(transformedDeals);
      }
    } catch (err) {
      console.error("Error fetching featured deals:", err);
      setErrorDeals(err.message || "Could not load deals.");
      setDeals([]);
    } finally {
      setLoadingDeals(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchAllCategories();
    fetchFeaturedDeals();
  }, [fetchAllCategories, fetchFeaturedDeals]);

  // Navigation handlers
  const handleItemClick = useCallback((item) => {
    if (item?.slug) {
      console.log(`Navigating to products for category slug: ${item.slug}`);
      navigate(`/products?category=${item.slug}`);
    } else {
      console.warn(`Category ${item?.name || 'Unknown'} has no valid slug. Cannot navigate.`);
    }
  }, [navigate]);

  const handleDealClick = useCallback((deal) => {
    if (deal?.slug) {
      console.log(`Navigating to products for deal (category) slug: ${deal.slug}`);
      navigate(`/products?category=${deal.slug}`);
    } else {
      console.warn(`Deal for ${deal?.category || 'Unknown'} has no valid slug. Cannot navigate.`);
    }
  }, [navigate]);

  // Render Logic
  const isLoadingPage = loadingCategories && allCategories.length === 0 && loadingDeals && deals.length === 0;

  if (isLoadingPage) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 mx-auto mb-4 text-purple-600" />
          <p className="text-lg font-medium text-gray-600">Loading Page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Featured Deals Section */}
        <section className="mb-10 sm:mb-12">
          <SectionHeader title="Featured Deals" icon={Zap} />

          {loadingDeals && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
              {[...Array(5)].map((_, i) => <DealSkeleton key={i} />)}
            </div>
          )}

          {!loadingDeals && errorDeals && (
            <div className="text-center p-8 max-w-md mx-auto bg-white shadow rounded-lg border border-red-200">
              <AlertTriangle className="h-10 w-10 text-red-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-red-700 mb-2">Error Loading Deals</h2>
              <p className="text-gray-600 mb-4">{errorDeals}</p>
              <Button onClick={fetchFeaturedDeals}>Try Again</Button>
            </div>
          )}

          {!loadingDeals && !errorDeals && deals.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
              {deals.map((deal) => (
                <MemoizedDealCard
                  key={deal._id}
                  deal={deal}
                  onClick={handleDealClick}
                />
              ))}
            </div>
          )}

          {!loadingDeals && !errorDeals && deals.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-gray-100 rounded-lg">
              <Zap className="h-10 w-10 mx-auto mb-3 text-gray-400" />
              <p>No featured deals available right now.</p>
            </div>
          )}
        </section>

        {/* All Categories Section */}
        <section className="mt-10 sm:mt-12">
          <SectionHeader title="All Categories" icon={List} />

          {loadingCategories && !errorCategories && allCategories.length === 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
              {[...Array(10)].map((_, i) => <CategorySkeleton key={i} />)}
            </div>
          )}

          {!loadingCategories && errorCategories && (
            <div className="text-center p-8 max-w-md mx-auto bg-white shadow rounded-lg border border-red-200">
              <AlertTriangle className="h-10 w-10 text-red-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-red-700 mb-2">Error Loading Categories</h2>
              <p className="text-gray-600 mb-4">{errorCategories}</p>
              <Button onClick={fetchAllCategories}>Try Again</Button>
            </div>
          )}

          {!loadingCategories && !errorCategories && allCategories.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
              {allCategories.map((item) => (
                <MemoizedCategoryCard
                  key={item._id}
                  item={item}
                  onClick={handleItemClick}
                />
              ))}
            </div>
          )}

          {!loadingCategories && !errorCategories && allCategories.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <List className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg">No categories available.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

// Section Header Component
const SectionHeader = ({ title, icon = null, onVewAllClick = null }) => (
  <div className="flex items-center justify-between mb-5 sm:mb-6">
    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center">
      {icon && React.createElement(icon, { className: "mr-2 h-5 w-5 sm:h-6 sm:w-6 text-purple-600" })}
      {title}
    </h2>
    {onVewAllClick && (
      <button
        onClick={onVewAllClick}
        className="text-sm sm:text-base text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1 transition duration-150 ease-in-out group"
      >
        View All <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </button>
    )}
  </div>
);

// DealCard component definition
function DealCard({ deal, onClick }) {
  return (
    <div
      className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1 cursor-pointer group border border-gray-100 flex flex-col"
      onClick={() => onClick(deal)}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && onClick(deal)}
      aria-label={`Deal on ${deal.category}`}
    >
      <div className="relative aspect-w-4 aspect-h-3">
        <ImageWithFallback
          src={deal.image}
          alt={`Deal on ${deal.category}`}
          className="w-full h-full object-cover"
          initialFallback={PLACEHOLDER_IMG_DEAL}
          errorFallback={PLACEHOLDER_IMG_ERROR}
        />
        <div className="absolute top-2 left-2 bg-red-600 text-white px-2.5 py-1 rounded-full text-xs sm:text-sm font-semibold shadow-lg">
          <span>{deal.discount}</span>
        </div>
      </div>
      <div className="p-3 sm:p-4 mt-auto">
        <h3 className="text-sm sm:text-base font-semibold text-gray-800 truncate group-hover:text-purple-700 transition-colors">
          {deal.category}
        </h3>
      </div>
    </div>
  );
}

// CategoryCard component definition
function CategoryCard({ item, onClick }) {
  return (
    <div
      className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1 cursor-pointer group border border-gray-100 hover:border-gray-200 flex flex-col"
      onClick={() => onClick(item)}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && onClick(item)}
      aria-label={item.name}
    >
      <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden">
        <ImageWithFallback
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          initialFallback={PLACEHOLDER_IMG_CATEGORY}
          errorFallback={PLACEHOLDER_IMG_ERROR}
        />
      </div>
      <div className="p-3 sm:p-4 text-center mt-auto">
        <h3 className="text-sm sm:text-base font-medium text-gray-800 truncate group-hover:text-purple-700 transition-colors">
          {item.name}
        </h3>
      </div>
    </div>
  );
}

// Skeletons
const CategorySkeleton = () => (
  <div className="bg-white rounded-lg overflow-hidden shadow border border-gray-100 p-3 sm:p-4 animate-pulse">
    <Skeleton className="aspect-square w-full mb-3 rounded-md" />
    <Skeleton className="h-4 w-3/4 mx-auto rounded" />
  </div>
);

const DealSkeleton = () => (
  <div className="bg-white rounded-lg overflow-hidden shadow border border-gray-100 animate-pulse">
    <Skeleton className="aspect-w-4 aspect-h-3 w-full rounded-t-lg" />
    <div className="p-3 sm:p-4">
      <Skeleton className="h-5 w-4/5 rounded" />
    </div>
  </div>
);

export default CategoryPage;