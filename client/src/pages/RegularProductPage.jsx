import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  Heart, 
  Share2, 
  ShoppingCart 
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'; // Assuming path is correct
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'; // Assuming path is correct
import { Card, CardContent } from '../components/ui/card'; // Assuming path is correct
import { productAPI, cartAPI, userAPI } from '../services/api'; // Assuming path is correct

const ProductPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(0); // Default to the first variant if exists
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [similarProducts, setSimilarProducts] = useState([]);

  const fetchProductData = async () => {
    try {
      setLoading(true);
      setError(null); // Reset error on new fetch
      const response = await productAPI.getProductBySlug(slug);
      setProduct(response.data.product);
      setSimilarProducts(response.data.similarProducts || []);
      
      // Reset selections based on the new product
      setActiveImage(0);
      setSelectedVariant(0);
      setQuantity(1);
      setUserRating(0);
      setReviewComment('');

      // Check if product is in user's wishlist
      if (localStorage.getItem('token')) {
        try {
          const wishlistResponse = await userAPI.getWishlist();
          const isInWishlist = wishlistResponse.data.wishlist.some(
            item => item.product._id === response.data.product._id
          );
          setIsWishlisted(isInWishlist);
        } catch (error) {
          console.error("Failed to fetch wishlist", error);
          // Don't block product view if wishlist check fails, but log it.
        }
      } else {
        setIsWishlisted(false); // Ensure wishlist is false if not logged in
      }
    } catch (err) {
      console.error("Error fetching product:", err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch product');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductData();
  
  }, [slug]); // Rerun when slug changes

  const handleQuantityChange = (newQuantity) => {
    // Use stock quantity from metadata if available, otherwise default max 10
    const maxQuantity = product?.metadata?.stockQuantity ? Math.min(product.metadata.stockQuantity, 10) : 10;
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    } else if (newQuantity < 1) {
      setQuantity(1);
    } else if (newQuantity > maxQuantity) {
      setQuantity(maxQuantity);
    }
  };

  const handleAddToCart = async () => {
    if (!localStorage.getItem('token')) {
      navigate('/login', { state: { from: `/products/${slug}` } });
      return;
    }
    try {
      const variantName = product.variants && product.variants.length > 0 
        ? product.variants[selectedVariant]?.name 
        : null;
      
      await cartAPI.addItem(product._id, quantity, variantName);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } catch (error) {
      console.error("Failed to add to cart", error);
      setError(error.response?.data?.message || "Failed to add item to cart. Please try again.");
      setTimeout(() => setError(null), 5000); // Clear error after 5 seconds
    }
  };

  const handleAddReview = async (e) => {
    e.preventDefault(); // Prevent default form submission if wrapped in form
    if (!userRating) {
      alert("Please select a rating");
      return;
    }
    
    if (!localStorage.getItem('token')) {
      navigate('/login', { state: { from: `/products/${slug}` } });
      return;
    }

    try {
      await productAPI.addProductReview(product._id, {
        rating: userRating,
        comment: reviewComment
      });
      
      // Refresh product data to show the new review
      await fetchProductData(); // Reuse the fetch function
      
      // Reset form handled by fetchProductData's state resets
    } catch (error) {
      console.error("Failed to add review", error);
      alert(error.response?.data?.message || "Failed to add review. Please try again.");
    }
  };

  const toggleWishlist = async () => {
    try {
      if (!localStorage.getItem('token')) {
        navigate('/login', { state: { from: `/products/${slug}` } });
        return;
      }
      
      if (isWishlisted) {
        await userAPI.removeFromWishlist(product._id);
      } else {
        await userAPI.addToWishlist(product._id);
      }
      
      setIsWishlisted(!isWishlisted);
    } catch (error) {
      console.error("Failed to update wishlist", error);
      alert(error.response?.data?.message || "Failed to update wishlist. Please try again.");
    }
  };

  const handleVariantSelect = (index) => {
    setSelectedVariant(index);
  };

  // Calculate price based on selected variant if applicable
  const getCurrentPrice = () => {
    let basePrice = product?.price || 0;
    if (product?.variants && product.variants.length > selectedVariant) {
      basePrice += product.variants[selectedVariant].priceModifier || 0;
    }
    return basePrice;
  };

  const currentPrice = getCurrentPrice();
  const originalPrice = product?.originalPrice; // Assuming original price doesn't change with variant

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (error && !product) { // Only show full page error if product couldn't load at all
    return (
      <div className="text-center text-red-500 p-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!product) {
    return <div className="text-center p-6">Product not found</div>;
  }

  // Helper function to determine stock status
  const getStockStatus = () => {
    const inStock = product.metadata?.inStock !== undefined ? product.metadata.inStock : true; // Default to true if undefined
    const quantity = product.metadata?.stockQuantity;

    if (!inStock) return { color: 'red', text: 'Out of Stock' };
    if (quantity !== undefined && quantity <= 0) return { color: 'red', text: 'Out of Stock' };
    if (quantity !== undefined && quantity <= 5) return { color: 'yellow', text: `Low Stock (${quantity} left!)` };
    return { color: 'green', text: 'In Stock' };
  };
  const stockStatus = getStockStatus();
  const isOutOfStock = stockStatus.text === 'Out of Stock';

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      {/* Notification Area */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed top-4 right-4 z-50 w-full max-w-sm"
          >
            <Alert variant="default" className="bg-green-50 border-green-200">
              <ShoppingCart className="h-5 w-5 text-green-600" />
              <AlertTitle className="font-semibold text-green-800">Success!</AlertTitle>
              <AlertDescription className="text-green-700">
                {product.title} (Qty: {quantity}) added to your cart.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
        {error && product && ( // Show temporary errors (e.g., add to cart fail) here
           <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed top-4 right-4 z-50 w-full max-w-sm"
          >
             <Alert variant="destructive">
               <AlertTitle>Error</AlertTitle>
               <AlertDescription>{error}</AlertDescription>
             </Alert>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Main Product Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image Gallery */}
        <div className="relative">
          {product.images && product.images.length > 0 ? (
            <>
              <div className="aspect-square overflow-hidden rounded-lg relative bg-gray-100">
                <AnimatePresence initial={false}>
                  <motion.img
                    key={activeImage}
                    src={product.images[activeImage]?.url || "/api/placeholder/600/600"} 
                    alt={product.images[activeImage]?.alt || product.title} 
                    className="absolute inset-0 w-full h-full object-contain" // Changed to object-contain
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </AnimatePresence>
              </div>
              
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImage((prev) => (prev - 1 + product.images.length) % product.images.length)}
                    className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-white bg-opacity-75 text-gray-800 p-2 rounded-full shadow-md hover:bg-opacity-100 transition-opacity z-10"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActiveImage((prev) => (prev + 1) % product.images.length)}
                    className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-white bg-opacity-75 text-gray-800 p-2 rounded-full shadow-md hover:bg-opacity-100 transition-opacity z-10"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="flex mt-4 gap-2 overflow-x-auto pb-2">
                    {product.images.map((image, idx) => (
                      <div 
                        key={image._id || idx} // Use image._id if available
                        onClick={() => setActiveImage(idx)}
                        className={`flex-shrink-0 w-16 h-16 cursor-pointer rounded-md overflow-hidden border-2 transition-all ${
                          activeImage === idx ? 'border-blue-600 scale-105' : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        <img 
                          src={image.url} 
                          alt={image.alt || `Product view ${idx + 1}`} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">No image available</p>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6 flex flex-col">
          <div>
            <div className="flex justify-between items-start mb-2">
              <div>
                {product.brand && <span className="text-sm text-gray-500 uppercase tracking-wide">{product.brand}</span>}
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">{product.title}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {product.category}
                  {product.subCategory ? ` > ${product.subCategory}` : ''}
                </p>
              </div>
              <div className="flex space-x-2 flex-shrink-0 mt-1">
                <button
                  onClick={toggleWishlist}
                  className={`p-2 rounded-full border ${
                    isWishlisted ? 'border-red-500 bg-red-50 text-red-500' : 'border-gray-300 text-gray-500 hover:bg-gray-100'
                  } transition-colors`}
                  aria-label={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
                {/* Add Share functionality later if needed */}
                <button
                  className="p-2 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100 transition-colors"
                  aria-label="Share Product"
                  onClick={() => { 
                    if (navigator.share) {
                      navigator.share({
                        title: product.title,
                        text: `Check out this product: ${product.title}`,
                        url: window.location.href,
                      }).catch(console.error);
                    } else {
                      alert('Share functionality not supported on this browser.');
                    }
                  }}
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.round(product.averageRating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-gray-600 text-sm">
                ({product.numberOfReviews || 0} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="text-3xl font-semibold text-gray-900 mb-4">
              ${currentPrice.toFixed(2)}
              {originalPrice && originalPrice > currentPrice && (
                <span className="text-xl text-gray-400 line-through ml-2 align-middle">
                  ${originalPrice.toFixed(2)}
                </span>
              )}
            </div>

            {/* Short Description */}
            {(product.shortDescription || product.description) && (
              <p className="text-gray-600 leading-relaxed mb-4">
                {product.shortDescription || product.description?.substring(0, 150) + (product.description?.length > 150 ? '...' : '')}
              </p>
            )}

            {/* Stock Status */}
            <div className="mb-4">
                <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${
                    stockStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                    stockStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                }`}>
                    {stockStatus.text}
                </span>
            </div>
          </div>

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                {product.variantType || 'Select Option'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant, index) => (
                  <button
                    key={variant._id || index} // Use variant._id if available
                    onClick={() => handleVariantSelect(index)}
                    className={`px-4 py-2 border rounded-md text-sm transition-colors ${
                      selectedVariant === index
                        ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    } ${variant.available === false ? 'opacity-50 cursor-not-allowed line-through' : ''}`} // Handle unavailable variants
                     disabled={variant.available === false}
                  >
                    {variant.name} {variant.priceModifier ? `(${variant.priceModifier > 0 ? '+' : ''}$${variant.priceModifier.toFixed(2)})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity and Add to Cart */}
          <div className="border-t pt-6 mt-auto space-y-4">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-900">Quantity:</span>
              <div className="flex items-center border border-gray-300 rounded-md">
                <button
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1 || isOutOfStock}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-l-md disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-500"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="px-4 py-1.5 text-gray-900 font-medium w-10 text-center">{quantity}</span>
                <button
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= (product.metadata?.stockQuantity ? Math.min(product.metadata.stockQuantity, 10) : 10) || isOutOfStock}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-r-md disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-500"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs: Details, Reviews, Specs */}
      <div className="mt-12 lg:mt-16 border-t pt-8">
        <Tabs defaultValue="details">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:w-auto md:inline-grid">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({product.reviews?.length || 0})</TabsTrigger>
            {product.metadata?.specifications && Object.keys(product.metadata.specifications).length > 0 && (
                <TabsTrigger value="specifications">Specifications</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="details" className="mt-6 text-gray-700 prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: product.description || 'No details available.' }} />
          </TabsContent>
          
          <TabsContent value="reviews" className="mt-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">Customer Reviews</h3>
            {product.reviews && product.reviews.length > 0 ? (
              <div className="space-y-6 mb-8">
                {product.reviews.map((review) => (
                  <Card key={review._id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center mb-2">
                        <div className="flex">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                key={i}
                                className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                />
                            ))}
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-800">{review.user?.name || 'Anonymous'}</span>
                        <span className="ml-auto text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-gray-700 text-sm">{review.comment}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 mb-8">No reviews yet. Be the first to review!</p>
            )}

            {/* Add Review Form */}
            {localStorage.getItem('token') ? (
              <Card className="border bg-gray-50">
                <CardContent className="p-4 md:p-6">
                  <h4 className="text-lg font-semibold mb-3 text-gray-900">Write a Review</h4>
                  <form onSubmit={handleAddReview}>
                    <div className="mb-4">
                      <label className="text-sm font-medium mr-2 text-gray-700 block mb-1">Your Rating:</label>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <button 
                            type="button" 
                            key={i} 
                            onClick={() => setUserRating(i + 1)}
                            className="focus:outline-none"
                            aria-label={`Rate ${i+1} stars`}
                           >
                            <Star
                              className={`w-6 h-6 cursor-pointer transition-colors ${
                                i < userRating ? 'text-yellow-400 fill-current' : 'text-gray-300 hover:text-yellow-300'
                              }`}
                            />
                          </button>
                        ))}
                         {userRating > 0 && <span className="ml-2 text-sm text-gray-600">({userRating}/5)</span>}
                      </div>
                     
                    </div>
                    <div className="mb-4">
                      <label htmlFor="reviewComment" className="text-sm font-medium text-gray-700 block mb-1">Your Review:</label>
                      <textarea
                        id="reviewComment"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Share your thoughts about the product..."
                        rows="4"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        required={userRating > 0} // Comment is required if rating is given
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-blue-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      disabled={!userRating}
                    >
                      Submit Review
                    </button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <p className="text-gray-600 text-sm">Please <button onClick={() => navigate('/login', { state: { from: `/products/${slug}` } })} className="text-blue-600 underline hover:text-blue-800 font-medium">log in</button> to add a review.</p>
            )}
          </TabsContent>
          
          {product.metadata?.specifications && Object.keys(product.metadata.specifications).length > 0 && (
            <TabsContent value="specifications" className="mt-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-900">Specifications</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(product.metadata.specifications).map(([key, value]) => (
                        <tr key={key}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 w-1/3 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</td>
                          <td className="px-4 py-3 text-sm text-gray-800">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Similar Products */}
      {similarProducts.length > 0 && (
        <div className="mt-16 border-t pt-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">You Might Also Like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {similarProducts.map((similarProduct) => (
              <Card 
                key={similarProduct._id} 
                className="overflow-hidden cursor-pointer group border hover:shadow-lg transition-all duration-300"
                onClick={() => navigate(`/products/${similarProduct.slug}`)}
              >
                <CardContent className="p-0">
                  <div className="aspect-square overflow-hidden bg-gray-100">
                      <img 
                        src={similarProduct.images?.[0]?.url || "/api/placeholder/300/300"} 
                        alt={similarProduct.title} 
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" 
                      />
                  </div>
                  <div className="p-4">
                    {similarProduct.brand && <p className="text-xs text-gray-500 mb-1 uppercase">{similarProduct.brand}</p>}
                    <h3 className="font-semibold text-base text-gray-800 truncate group-hover:text-blue-600">{similarProduct.title}</h3>
                    <div className="flex items-center justify-between mt-2">
                         <p className="text-lg font-bold text-gray-900">${similarProduct.price?.toFixed(2)}</p>
                         <div className="flex">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                key={i}
                                className={`w-4 h-4 ${
                                    i < Math.round(similarProduct.averageRating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                }`}
                                />
                            ))}
                         </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPage;