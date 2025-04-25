import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "../ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "../ui/card";
import { Badge } from "../ui/badge";
import { Star, ShoppingCart, Loader2, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { formatPrice } from '../../utils/formatting';

const PLACEHOLDER_IMG_200 = '/images/placeholder-200.png';

/**
 * Extract a valid image URL from product data, handling both 'image' and 'images' fields
 */
const getImageUrl = (product) => {
  // Check for single 'image' field first
  if (product.image && typeof product.image === 'string') {
    return product.image;
  }
  
  const images = product.images;
  
  if (!images || (Array.isArray(images) && images.length === 0)) {
    return PLACEHOLDER_IMG_200;
  }
  
  // Handle array of images
  if (Array.isArray(images)) {
    // Try to find default image first
    const defaultImage = images.find(img => img?.isDefault === true);
    if (defaultImage) {
      return defaultImage.url || defaultImage.src || 
        (typeof defaultImage === 'string' ? defaultImage : PLACEHOLDER_IMG_200);
    }
    
    // Take first image if no default
    const firstImage = images[0];
    if (typeof firstImage === 'string') {
      return firstImage;
    }
    return firstImage?.url || firstImage?.src || PLACEHOLDER_IMG_200;
  }
  
  // Handle single image object
  if (typeof images === 'object') {
    return images.url || images.src || PLACEHOLDER_IMG_200;
  }
  
  // Handle single image string
  if (typeof images === 'string') {
    return images;
  }
  
  return PLACEHOLDER_IMG_200;
};

const RegularProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  if (!product || !product.pricing || !product.quantity || !product.metadata) {
    console.warn("RegularProductCard received invalid/incomplete product data:", product);
    return null;
  }

  const {
    _id,
    title,
    slug,
    brand,
    pricing,
    category,
    rating,
    metadata,
    quantity
  } = product;

  const salePrice = parseFloat(pricing?.salePrice ?? 0);
  const mrp = parseFloat(pricing?.regularPrice ?? pricing?.mrp ?? 0);
  const discountPercent = mrp > salePrice ? Math.round(((mrp - salePrice) / mrp) * 100) : 0;
  
  // Use the updated image extraction function with the whole product
  const imageUrl = getImageUrl(product);

  const isOutOfStock = metadata?.inStock === false || product.stock <= 0;
  const isActive = metadata?.isActive === true;
  const categoryName = typeof category === 'object' ? category?.name : category;

  const displayQuantity = quantity?.value && quantity?.unit && quantity.unit !== '1'
    ? `${quantity.value} ${quantity.unit}`
    : null;

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isActive || isOutOfStock || isAdding) return;

    if (!isAuthenticated) {
      navigate('/login', { state: { from: window.location.pathname + window.location.search } });
      return;
    }

    setIsAdding(true);
    try {
      const { success, error } = await addToCart(product, 1);
      if (!success) throw new Error(error || "Unknown error");
    } catch (error) {
      console.error("Add to cart failed:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const cardClasses = `h-full overflow-hidden transition-all duration-300 ease-in-out border flex flex-col ${
    isActive ? 'bg-white border-gray-200 hover:shadow-xl' : 'bg-gray-50 border-gray-300 border-dashed opacity-70 hover:opacity-80'
  }`;

  const linkWrapperClasses = `block group outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 rounded-lg ${
    !isActive ? 'cursor-default' : ''
  }`;

  return (
    <div className={linkWrapperClasses} onClick={(e) => !isActive && e.preventDefault()}>
      <Link to={isActive ? `/product/${slug}` : '#'} aria-disabled={!isActive} tabIndex={isActive ? 0 : -1}>
        <Card className={cardClasses}>
          <CardHeader className="p-0 relative">
            <div className="aspect-square overflow-hidden bg-gray-100">
              <img
                src={imageUrl}
                alt={title || 'Product image'}
                className={`w-full h-full object-contain transition-transform duration-300 ${isActive ? 'group-hover:scale-105' : ''}`}
                loading="lazy"
                onError={(e) => { e.target.src = PLACEHOLDER_IMG_200; }}
              />
            </div>

            {isActive && discountPercent > 0 && !isOutOfStock && (
              <Badge variant="destructive" className="absolute top-2 right-2 text-xs px-1.5 py-0.5 shadow-md">
                {discountPercent}% OFF
              </Badge>
            )}

            {isActive && isOutOfStock && (
              <Badge variant="secondary" className="absolute top-2 left-2 text-xs px-1.5 py-0.5 bg-gray-500 text-white shadow-md">
                Out of Stock
              </Badge>
            )}

            {!isActive && (
              <Badge variant="outline" className="absolute top-2 left-2 text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-800 border-yellow-300 shadow-sm flex items-center">
                <EyeOff className="h-3 w-3 mr-1" /> Inactive
              </Badge>
            )}
          </CardHeader>

          <CardContent className="p-3 flex-grow space-y-1">
            <p className="text-xs text-gray-500 uppercase truncate">{brand || categoryName}</p>
            <h3 className={`font-semibold text-sm line-clamp-2 ${isActive ? 'text-gray-800 group-hover:text-purple-700' : 'text-gray-600'}`} title={title}>
              {title}
            </h3>
            {displayQuantity && <p className="text-xs text-gray-600 pt-1">{displayQuantity}</p>}
            {isActive && rating?.average > 0 && (
              <div className="flex items-center pt-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-xs text-gray-600 ml-1">
                  {rating.average.toFixed(1)}{rating.count > 0 && ` (${rating.count})`}
                </span>
              </div>
            )}
          </CardContent>

          <CardFooter className="p-3 pt-1 flex flex-col items-start mt-auto">
            <div className="flex items-baseline gap-2 w-full mb-2">
              <span className={`text-base font-bold ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                {formatPrice(salePrice)}
              </span>
              {isActive && mrp > salePrice && (
                <span className="text-xs text-gray-400 line-through">
                  {formatPrice(mrp)}
                </span>
              )}
            </div>

            <Button
              variant={!isActive ? "outline" : isOutOfStock ? "outline" : "default"}
              size="sm"
              className="w-full text-xs h-8"
              onClick={handleAddToCart}
              disabled={!isActive || isOutOfStock || isAdding}
              aria-label={!isActive ? `${title} - Inactive` : isOutOfStock ? `${title} - Out of Stock` : `Add ${title} to cart`}
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : !isActive ? (
                'Inactive'
              ) : isOutOfStock ? (
                'Out of Stock'
              ) : (
                <>
                  <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> Add
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </Link>
    </div>
  );
};

export default RegularProductCard;