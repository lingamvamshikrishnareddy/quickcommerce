import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../components/contexts/CartContext';
import { useAuth } from '../components/contexts/AuthContext';
import { formatPrice } from '../services/api'; // Use consistent price formatting
import { Loader2, ShoppingCart, Trash2, Plus, Minus, Info, Lock, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '../components/ui/button'; // Assuming shadcn/ui
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Separator } from '../components/ui/separator';
import { useToast } from "../components/ui/usetoast";
import { Label } from '../components/ui/label';

// Import the getImageUrl utility from the product card or create it here
const PLACEHOLDER_IMG = '/images/placeholder-200.png';

/**
 * Extract a valid image URL from product data, handling both 'image' and 'images' fields
 */
const getImageUrl = (product) => {
  // Check for single 'image' field first
  if (product?.image && typeof product.image === 'string') {
    return product.image;
  }
  
  const images = product?.images;
  
  if (!images || (Array.isArray(images) && images.length === 0)) {
    return PLACEHOLDER_IMG;
  }
  
  // Handle array of images
  if (Array.isArray(images)) {
    // Try to find default image first
    const defaultImage = images.find(img => img?.isDefault === true);
    if (defaultImage) {
      return defaultImage.url || defaultImage.src || 
        (typeof defaultImage === 'string' ? defaultImage : PLACEHOLDER_IMG);
    }
    
    // Take first image if no default
    const firstImage = images[0];
    if (typeof firstImage === 'string') {
      return firstImage;
    }
    return firstImage?.url || firstImage?.src || PLACEHOLDER_IMG;
  }
  
  // Handle single image object
  if (typeof images === 'object') {
    return images.url || images.src || PLACEHOLDER_IMG;
  }
  
  // Handle single image string
  if (typeof images === 'string') {
    return images;
  }
  
  return PLACEHOLDER_IMG;
};

const CartPage = () => {
  const {
    cart,
    itemCount,
    cartTotal,
    loading: cartLoading,
    error: cartError,
    updateCartItem,
    removeFromCart,
  } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');

  // --- Calculations ---
  const deliveryCharge = useMemo(() => (cartTotal > 500 ? 0 : 40), [cartTotal]); // Example: Free delivery over 500
  const handlingCharge = 5; // Example fixed handling charge
  const grandTotal = cartTotal + deliveryCharge + handlingCharge - discount;

  const applyPromoCode = () => {
    setPromoLoading(true);
    setPromoError('');
    // Simulate API call - Replace with actual cartAPI.applyCoupon(promoCode)
    setTimeout(() => {
      if (promoCode.toLowerCase() === 'save10' && cartTotal > 0) {
        const calculatedDiscount = Math.min(cartTotal * 0.1, 50); // Example: 10% off up to 50
        setDiscount(calculatedDiscount);
        toast({ title: "Promo Applied", description: `Discount of ${formatPrice(calculatedDiscount)} applied.` });
      } else {
        setPromoError('Invalid or expired promo code.');
        setDiscount(0);
      }
      setPromoLoading(false);
    }, 1000);
  };

  // Clear promo error
  useEffect(() => {
    if (promoError) {
      const timer = setTimeout(() => setPromoError(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [promoError]);

  // Reset discount if cart changes significantly
  useEffect(() => {
    setDiscount(0);
    setPromoCode('');
    setPromoError('');
  }, [cartTotal]);

  const handleQuantityChange = (itemId, currentQuantity, change) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity >= 1) {
      updateCartItem(itemId, newQuantity);
    } else if (newQuantity === 0) {
      handleRemoveItem(itemId); // Remove if quantity becomes 0
    }
    // Add max quantity check if needed (based on item.product.stock)
  };

  const handleRemoveItem = (itemId) => {
    removeFromCart(itemId);
    toast({ title: "Item Removed", description: "Item removed from your cart." });
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      // This shouldn't happen if ProtectedRoute works, but as a fallback:
      toast({ title: "Login Required", description: "Please log in to proceed to checkout.", variant: "destructive" });
      navigate('/?showLogin=true'); // Redirect to home/login
      return;
    }
    if (itemCount === 0) {
      toast({ title: "Empty Cart", description: "Cannot checkout with an empty cart.", variant: "destructive" });
      return;
    }
    // Navigate to the checkout page
    navigate('/checkout');
  };

  // --- Render Logic ---
  if (cartLoading && !cart.items.length) { // Show loading only on initial load
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-green-600" />
        <span className="ml-4 text-gray-600 text-lg">Loading Cart...</span>
      </div>
    );
  }

  if (cartError) {
    return (
      <Alert variant="destructive" className="my-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Cart</AlertTitle>
        <AlertDescription>{cartError}</AlertDescription>
        {/* Optional: Add a retry button */}
        {/* <Button variant="outline" size="sm" onClick={fetchCart} className="mt-2">Retry</Button> */}
      </Alert>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-2">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Your Shopping Cart</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Cart Items Section */}
        <div className="lg:col-span-2">
          {itemCount === 0 ? (
            <Card className="text-center py-16">
              <CardHeader>
                <ShoppingCart size={56} className="mx-auto text-gray-300 mb-4" />
                <CardTitle className="text-2xl text-gray-600">Your cart is empty</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 mb-6">Looks like you haven't added anything yet.</p>
                <Button asChild>
                  <Link to="/products">Start Shopping</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Items ({itemCount})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {cart.items.map((item) => (
                    <div key={item._id || item.product?._id} className="flex flex-col sm:flex-row gap-4 p-4 hover:bg-gray-50/50 transition-colors">
                      <img
                        src={getImageUrl(item.product)}
                        alt={item.product?.title || 'Product Image'}
                        className="w-24 h-24 object-contain rounded border border-gray-100 flex-shrink-0 bg-white"
                        onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
                      />
                      <div className="flex-1 min-w-0">
                        <Link
                          // Prefer slug for user-friendly URLs, fallback to the actual Mongo ID
                          to={`/product/${item.product?.slug || item.product?._original_id || item.product?._id}`}
                          className="hover:text-green-700"
                        >
                          <h3 className="font-medium text-base sm:text-lg truncate pr-4" title={item.product?.title}>
                            {item.product?.title || item.productName || 'Product Name Unavailable'} {/* Use stored productName as fallback */}
                          </h3>
                        </Link>
                        {/* Display variations if they exist */}
                        {item.variation && typeof item.variation === 'object' && Object.keys(item.variation).length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {Object.entries(item.variation).map(([key, value]) => `${key}: ${value}`).join(', ')}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                          Price: {formatPrice(item.price || item.product?.price || 0)}
                        </p>
                        {/* Optional: Show stock status */}
                        {/* <p className="text-xs text-green-600 mt-1">{item.product?.stock} available</p> */}
                        <div className="flex items-center justify-between mt-3">
                          {/* Quantity Controls */}
                          <div className="flex items-center border border-gray-200 rounded">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-r-none hover:bg-gray-100 text-gray-600 disabled:opacity-50"
                              onClick={() => handleQuantityChange(item._id, item.quantity, -1)}
                              disabled={cartLoading}
                            >
                              <Minus size={16} />
                            </Button>
                            <span className="px-3 text-sm font-medium w-10 text-center">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-l-none hover:bg-gray-100 text-gray-600 disabled:opacity-50"
                              onClick={() => handleQuantityChange(item._id, item.quantity, 1)}
                              disabled={cartLoading}
                            >
                              <Plus size={16} />
                            </Button>
                          </div>
                          {/* Item Total & Remove Button */}
                          <div className="flex items-center gap-4">
                            <span className="font-semibold text-base">
                              {formatPrice((item.price || item.product?.price || 0) * item.quantity)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                              onClick={() => handleRemoveItem(item._id)}
                              disabled={cartLoading}
                              aria-label="Remove item"
                            >
                              <Trash2 size={18} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              {/* Optional: Clear Cart Button */}
              {/* {itemCount > 0 && (
                <CardFooter className="pt-4 border-t">
                  <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700" onClick={clearCart} disabled={cartLoading}>
                    <Trash2 size={16} className="mr-2"/> Clear Cart
                  </Button>
                </CardFooter>
              )} */}
            </Card>
          )}
        </div>

        {/* Order Summary Section */}
        {itemCount > 0 && (
          <div className="lg:col-span-1">
            <Card className="sticky top-24"> {/* Sticky summary */}
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Promo Code */}
                <div className="space-y-2">
                  <Label htmlFor="promo">Promo Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="promo"
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Enter code (e.g., SAVE10)"
                      disabled={promoLoading || discount > 0}
                    />
                    <Button
                      onClick={applyPromoCode}
                      disabled={promoLoading || !promoCode || discount > 0}
                      variant="outline"
                    >
                      {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                    </Button>
                  </div>
                  {promoError && <p className="text-sm text-red-600 flex items-center"><XCircle size={14} className="mr-1"/> {promoError}</p>}
                </div>

                <Separator />

                {/* Bill Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal ({itemCount} items)</span>
                    <span>{formatPrice(cartTotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>Promo Discount</span>
                      <span>- {formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center">
                      Delivery Charge
                      <Info size={14} className="ml-1 text-gray-400 cursor-help" title={deliveryCharge === 0 ? "Free delivery on orders over ₹500" : "Standard delivery fee"}/>
                    </span>
                    <span>{deliveryCharge === 0 ? <span className="text-green-600">FREE</span> : formatPrice(deliveryCharge)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center">
                      Handling Charge
                      <Info size={14} className="ml-1 text-gray-400 cursor-help" title="Includes packaging and platform fees"/>
                    </span>
                    <span>{formatPrice(handlingCharge)}</span>
                  </div>
                </div>

                <Separator />

                {/* Grand Total */}
                <div className="flex justify-between font-bold text-lg">
                  <span>Grand Total</span>
                  <span>{formatPrice(grandTotal)}</span>
                </div>
              </CardContent>
              <CardFooter className="flex-col items-stretch space-y-3">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={cartLoading || itemCount === 0} // Disable if loading or cart empty
                >
                  {isAuthenticated ? 'Proceed to Checkout' : 'Login to Checkout'}
                  {!isAuthenticated && <Lock size={16} className="ml-2"/>}
                </Button>
                <p className="text-xs text-gray-500 text-center flex items-center justify-center">
                  <Lock size={12} className="mr-1" /> Secure Payments
                </p>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;