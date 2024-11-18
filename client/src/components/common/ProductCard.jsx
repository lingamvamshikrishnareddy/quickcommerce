import React, { useState } from 'react';
import { ShoppingCart, Heart, Share2, Star } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

const ProductCard = ({ 
  product, 
  isEmergency = false, 
  onAddToCart,
  className = ''
}) => {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const {
    id,
    name,
    price,
    originalPrice,
    description,
    image,
    rating,
    reviewCount,
    stockStatus,
    estimatedDelivery
  } = product;

  const handleAddToCart = () => {
    onAddToCart(product);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  };

  const handleWishlist = () => {
    setIsWishlisted(!isWishlisted);
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: name,
        text: description,
        url: window.location.href,
      });
    } catch (err) {
      console.error('Error sharing product:', err);
    }
  };

  const discount = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0;

  return (
    <div className={`relative group rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 ${className}`}>
      {showAlert && (
        <Alert className="absolute top-0 right-0 z-50 w-64 bg-green-50">
          <AlertDescription>Added to cart successfully!</AlertDescription>
        </Alert>
      )}
      
      {discount > 0 && (
        <div className="absolute top-4 left-4 bg-red-500 text-white px-2 py-1 rounded-full text-sm">
          -{discount}%
        </div>
      )}

      {isEmergency && (
        <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
          EMERGENCY
        </div>
      )}

      <div className="relative overflow-hidden rounded-t-xl">
        <img
          src={image}
          alt={name}
          className="w-full h-64 object-cover transform group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleWishlist}
            className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
          >
            <Heart 
              className={`w-5 h-5 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
            />
          </button>
          <button
            onClick={handleShare}
            className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
          >
            <Share2 className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">
            {name}
          </h3>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm text-gray-600">
              {rating} ({reviewCount})
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {description}
        </p>

        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900">
              ${price.toFixed(2)}
            </span>
            {originalPrice && (
              <span className="text-sm text-gray-500 line-through">
                ${originalPrice.toFixed(2)}
              </span>
            )}
          </div>
          <span className={`text-sm ${stockStatus === 'In Stock' ? 'text-green-600' : 'text-red-600'}`}>
            {stockStatus}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            Delivery: {estimatedDelivery}
          </span>
          <button
            onClick={handleAddToCart}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors ${
              isEmergency
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;