import React, { useState, useEffect } from 'react';
import { Clock, Info, Lock, AlertTriangle, ShoppingCart } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';

const CartPage = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false); // In production, this would come from auth context
  const [cartItems, setCartItems] = useState([]);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Simulated local storage interaction
  useEffect(() => {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      setCartItems(JSON.parse(storedCart));
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Calculate totals
  const itemsTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryCharge = 25;
  const handlingCharge = 4;
  const grandTotal = itemsTotal + deliveryCharge + handlingCharge - discount;

  const hasEmergencyItems = cartItems.some(item => item.isEmergency);

  const updateQuantity = (id, change) => {
    setCartItems(items =>
      items.map(item => {
        if (item.id === id) {
          const newQuantity = item.quantity + change;
          if (newQuantity < 1) {
            setError('Minimum quantity is 1');
            return item;
          }
          if (newQuantity > item.stock) {
            setError(`Only ${item.stock} items available`);
            return item;
          }
          setError('');
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeItem = (id) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  const applyPromoCode = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      if (promoCode.toLowerCase() === 'save10') {
        setDiscount(itemsTotal * 0.1);
        setError('Promo code applied successfully!');
      } else {
        setError('Invalid promo code');
        setDiscount(0);
      }
      setLoading(false);
    }, 500);
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      // Save current cart state and redirect to login
      localStorage.setItem('cartState', JSON.stringify({
        items: cartItems,
        promoCode,
        discount
      }));
      navigate('/login?redirect=cart');
      return;
    }

    // Route based on cart contents
    if (hasEmergencyItems) {
      navigate('/checkout/emergency');
    } else {
      navigate('/checkout/regular');
    }
  };

  // Clear error message after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Cart</h1>
          <span className="text-gray-500">{cartItems.length} items</span>
        </div>

        {hasEmergencyItems && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertTriangle className="text-red-500" />
            <AlertTitle className="text-red-700">Emergency Items Present</AlertTitle>
            <AlertDescription className="text-red-600">
              Your cart contains emergency items. These will be prioritized for delivery.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-2 mb-6 text-gray-600">
          <Clock size={24} />
          <div>
            <div className="font-semibold">
              {hasEmergencyItems ? 'Priority Delivery in 30 minutes' : 'Delivery in 2-3 hours'}
            </div>
            <div className="text-sm">Estimated delivery time</div>
          </div>
        </div>

        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Your cart is empty</p>
          </div>
        ) : (
          <div className="space-y-6">
            {cartItems.map(item => (
              <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                <img
                  src={item.image || '/api/placeholder/80/80'}
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded"
                />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h3 className="font-medium">{item.name}</h3>
                    {item.isEmergency && (
                      <span className="px-2 py-1 bg-red-100 text-red-600 text-sm rounded-full">
                        Emergency
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500">{item.size}</p>
                  <p className="text-sm text-gray-500">{item.stock} items available</p>
                  
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-semibold">₹{item.price}</span>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-green-600 text-white rounded">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="px-3 py-1 hover:bg-green-700 rounded-l"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="px-3 py-1 hover:bg-green-700 rounded-r"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {cartItems.length > 0 && (
          <>
            <div className="mt-8">
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter promo code"
                  className="px-4 py-2 border rounded-md flex-1"
                  disabled={loading}
                />
                <button
                  onClick={applyPromoCode}
                  className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400"
                  disabled={loading}
                >
                  {loading ? 'Applying...' : 'Apply'}
                </button>
              </div>

              {error && (
                <p className={`text-sm ${error.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                  {error}
                </p>
              )}

              <h2 className="text-lg font-bold mb-4">Bill Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Items total</span>
                  <span>₹{itemsTotal}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span>Delivery charge</span>
                    <Info size={16} className="text-gray-500" />
                  </div>
                  <span>₹{deliveryCharge}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span>Handling charge</span>
                    <Info size={16} className="text-gray-500" />
                  </div>
                  <span>₹{handlingCharge}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between font-bold mt-4 pt-4 border-t">
                <span>Grand total</span>
                <span>₹{grandTotal}</span>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="font-bold mb-2">Cancellation Policy</h2>
              <p className="text-gray-600 text-sm">
                Orders cannot be cancelled once packed for delivery. In case of unexpected delays,
                a refund will be provided according to our refund policy. Emergency orders have
                stricter cancellation policies.
              </p>
            </div>

            <div className="mt-6">
              <button
                onClick={handleCheckout}
                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                disabled={cartItems.length === 0}
              >
                {!isAuthenticated ? (
                  <>
                    Login to Proceed
                    <Lock size={20} />
                  </>
                ) : (
                  `Proceed to ${hasEmergencyItems ? 'Emergency' : 'Regular'} Checkout`
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CartPage;