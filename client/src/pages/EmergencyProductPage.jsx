import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Truck, 
  Shield, 
  Heart,
  Share2,
  ChevronLeft,
  Star,
  AlertTriangle
} from 'lucide-react';
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const EmergencyProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/emergency-products/${id}`);
        const data = await response.json();
        setProduct(data);
        setSelectedImage(0);
      } catch (err) {
        setError('Failed to load product details. Please try again later.');
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

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

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Product not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const {
    name,
    description,
    price,
    originalPrice,
    images,
    rating,
    reviewCount,
    stockStatus,
    stockQuantity,
    estimatedDelivery,
    specifications,
    features
  } = product;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Emergency Products
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="aspect-w-1 aspect-h-1 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={images[selectedImage]}
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`aspect-w-1 aspect-h-1 rounded-lg overflow-hidden bg-gray-100 ${
                  selectedImage === index ? 'ring-2 ring-red-500' : ''
                }`}
              >
                <img
                  src={image}
                  alt={`${name} - View ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">{name}</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleWishlist}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <Heart
                    className={`w-6 h-6 ${
                      isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'
                    }`}
                  />
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <Share2 className="w-6 h-6 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.floor(rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {rating} ({reviewCount} reviews)
              </span>
            </div>
          </div>

          <div className="border-t border-b border-gray-200 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-3xl font-bold text-gray-900">
                  ${price.toFixed(2)}
                </span>
                {originalPrice && (
                  <span className="text-lg text-gray-500 line-through ml-2">
                    ${originalPrice.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-600">
                  Emergency Delivery
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Truck className="w-5 h-5" />
                <span>{estimatedDelivery}</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-5 h-5" />
                <span>100% Secure Payment</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-lg">
                <button
                  onClick={() => handleQuantityChange(quantity - 1)}
                  className="px-3 py-2 border-r hover:bg-gray-100"
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                  className="w-16 text-center py-2"
                  min="1"
                  max={stockQuantity}
                />
                <button
                  onClick={() => handleQuantityChange(quantity + 1)}
                  className="px-3 py-2 border-l hover:bg-gray-100"
                  disabled={quantity >= stockQuantity}
                >
                  +
                </button>
              </div>
              <span className={`text-sm ${
                stockStatus === 'In Stock' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stockStatus} ({stockQuantity} available)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleAddToCart}
                className="px-6 py-3 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              >
                Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                className="px-6 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Buy Now
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Description</h2>
            <p className="text-gray-600">{description}</p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Features</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              {features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Specifications
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(specifications).map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between py-2 border-b border-gray-200"
                >
                  <span className="text-gray-600">{key}</span>
                  <span className="text-gray-900 font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyProductPage;