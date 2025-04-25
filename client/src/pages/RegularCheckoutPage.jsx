import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../components/contexts/CartContext';
import { useAuth } from '../components/contexts/AuthContext';
import { orderAPI, formatPrice, locationAPI, paymentAPI  } from '../services/api'; // Added paymentAPI
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea"; // For address/instructions
import { RadioGroup, RadioGroupItem } from "../components/ui/radiogroup" // For payment methods
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Loader2, AlertTriangle, ArrowLeft, Lock, MapPin } from 'lucide-react';
import { useToast } from "../components/ui/usetoast";

// --- Load Razorpay Script ---
const loadRazorpayScript = (src) => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

// Changed component name to CheckoutPage to match import in App.jsx
const CheckoutPage = () => {
  const { cart, itemCount, cartTotal, clearCart } = useCart(); // Get cart details
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // --- State ---
  const [shippingAddress, setShippingAddress] = useState({
      street: '', city: '', state: '', postalCode: '', country: 'India', phone: ''
  });
   const [savedAddresses, setSavedAddresses] = useState([]);
   const [selectedAddressId, setSelectedAddressId] = useState(''); // To track selected saved address
  const [paymentMethod, setPaymentMethod] = useState('razorpay'); // Default payment method
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null); // Add state for tracking the current order ID

   // --- Fetch Saved Addresses ---
    useEffect(() => {
        const fetchAddresses = async () => {
            setAddressLoading(true);
            try {
                const response = await locationAPI.getUserAddresses();
                // Make sure response.data is an array before using it
                const addressArray = Array.isArray(response.data) ? response.data : [];
                setSavedAddresses(addressArray);

                // Use the safe array
                const defaultAddress = addressArray.find(addr => addr.isDefault || addr.type === 'home');

                if (defaultAddress) {
                    setSelectedAddressId(defaultAddress._id);
                    setShippingAddress({
                        street: defaultAddress.address.split(',')[0] || '', // Basic split, improve if needed
                        city: defaultAddress.components?.city || defaultAddress.address.split(',')[1]?.trim() || '',
                        state: defaultAddress.components?.state || '',
                        postalCode: defaultAddress.components?.postcode || '',
                        country: defaultAddress.components?.country || 'India',
                        phone: user?.phone || '' // Pre-fill phone from user profile if available
                    });
                } else if (addressArray.length > 0) {
                    // Pre-fill with the first address if no default
                    const firstAddress = addressArray[0];
                    setSelectedAddressId(firstAddress._id);
                    setShippingAddress({
                        street: firstAddress.address.split(',')[0] || '',
                        city: firstAddress.components?.city || firstAddress.address.split(',')[1]?.trim() || '',
                        state: firstAddress.components?.state || '',
                        postalCode: firstAddress.components?.postcode || '',
                        country: firstAddress.components?.country || 'India',
                        phone: user?.phone || ''
                    });
                }
            } catch (err) {
                console.error("Failed to fetch addresses:", err);
                toast({ title: "Error", description: "Could not load saved addresses.", variant: "destructive" });
            } finally {
                setAddressLoading(false);
            }
        };

        if (user && user._id) {
            fetchAddresses();
        }
    }, [toast, user]);

  // --- Calculations (same as cart page) ---
  const deliveryCharge = cartTotal > 500 ? 0 : 40;
  const handlingCharge = 5;
  const grandTotal = cartTotal + deliveryCharge + handlingCharge; // Assuming no discount on checkout page itself

  // --- Handlers ---
  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({ ...prev, [name]: value }));
     setSelectedAddressId(''); // Clear selected saved address if typing new one
  };

   const handleSelectSavedAddress = (address) => {
       setSelectedAddressId(address._id);
       setShippingAddress({
           street: address.address.split(',')[0] || '', // Refine parsing as needed
           city: address.components?.city || address.address.split(',')[1]?.trim() || '',
           state: address.components?.state || '',
           postalCode: address.components?.postcode || '',
           country: address.components?.country || 'India',
           phone: user?.phone || '' // Keep or fetch phone associated with address if stored
       });
   };

  const handlePlaceOrder = async () => {
    setError(null);
    setLoading(true);

    // Basic validation
    if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postalCode || !shippingAddress.phone) {
      setError("Please fill in all required address fields and phone number.");
      setLoading(false);
      return;
    }
     if (itemCount === 0) {
         setError("Your cart is empty.");
         setLoading(false);
         return;
     }

    try {
      // 1. Call backend to create the order
      const orderData = {
        shippingAddress,
        paymentMethod,
        deliveryInstructions,
        // Backend will use the cart associated with the logged-in user
      };
      console.log("[Frontend] Calling createOrder API with data:", orderData); // DEBUG
      const orderResponse = await orderAPI.createOrder(orderData);

      // --- DEBUG: Log the entire backend response ---
      console.log("[Frontend] Received orderResponse:", orderResponse);
      // --- END DEBUG ---

      // Ensure the response structure is as expected
      if (!orderResponse || !orderResponse.success) {
          // Use message from response if available, otherwise provide a default
          throw new Error(orderResponse?.message || "Failed to create order (backend error).");
      }

       const orderId = orderResponse.orderId;
       setCurrentOrderId(orderId); // Save the orderId in state
       console.log(`[Frontend] Order created successfully. Order ID: ${orderId}`);

      // 2. Handle Payment (if required)
      if (paymentMethod === 'razorpay' && orderResponse.paymentInfo?.paymentRequired) {
        console.log("[Frontend] Razorpay payment required. Payment Info:", orderResponse.paymentInfo); // DEBUG

        // Check if necessary Razorpay data is present
        if (!orderResponse.paymentInfo.key || !orderResponse.paymentInfo.razorpayOrderId) {
            console.error("[Frontend] Missing Razorpay key or order_id in backend response!", orderResponse.paymentInfo);
            throw new Error("Configuration error: Missing necessary payment details from server.");
        }

        const razorpayOptions = orderResponse.paymentInfo;

        // Load Razorpay script
        console.log("[Frontend] Loading Razorpay script..."); // DEBUG
        const scriptLoaded = await loadRazorpayScript("https://checkout.razorpay.com/v1/checkout.js");
        console.log(`[Frontend] Razorpay script loaded: ${scriptLoaded}`); // DEBUG

        if (!scriptLoaded) {
          throw new Error("Could not load Razorpay payment gateway. Please check your internet connection and try again.");
        }

        // --- DEBUG: Check if Razorpay object exists on window ---
        console.log(`[Frontend] typeof window.Razorpay after script load: ${typeof window.Razorpay}`);
        if (typeof window.Razorpay !== 'function') {
            console.error("[Frontend] window.Razorpay is not a function after script load!");
            throw new Error("Payment gateway failed to initialize correctly.");
        }
        // --- END DEBUG ---

        const options = {
          key: razorpayOptions.key,
          amount: razorpayOptions.amount, // Amount in paisa from backend
          currency: razorpayOptions.currency,
          name: "QuickCommerce Inc.", // Your Store Name
          description: `Order Payment #${orderId}`,
          image: "/your-logo.png", // Optional: Add your logo URL
          order_id: razorpayOptions.razorpayOrderId, // From backend response
          handler: function(response) {
            console.log("[Razorpay] Payment success response:", response);
            // Verify that we have all required fields from Razorpay
            if (!response.razorpay_payment_id || !response.razorpay_order_id || !response.razorpay_signature) {
              console.error("[Razorpay] Missing required fields in response:", response);
              toast({ 
                title: "Verification Error", 
                description: "Payment received but verification data is incomplete.", 
                variant: "destructive" 
              });
              setLoading(false);
              return;
            }
            
            // Now call your handler with the full response
            handlePaymentSuccess(response, orderId); // Pass orderId to the handler
          },
          prefill: razorpayOptions.prefill, // Prefill user details from backend
          notes: razorpayOptions.notes, // Include internal order ID etc. from backend
          theme: {
            color: "#34b379" // Your theme color
          },
          modal: {
            ondismiss: function() { // Handle modal dismissal
              console.log('[Frontend] Razorpay checkout modal dismissed');
              // Avoid setting error if payment was actually successful but verification is pending
              if (!loading) { // Only show if not already processing verification
                toast({ 
                  title: "Payment Incomplete", 
                  description: "The payment window was closed.", 
                  variant: "warning" 
                });
                // Optionally set an error or just allow retry
                // setError("Payment was not completed.");
                setLoading(false); // Ensure button is re-enabled
              }
            }
          }
        };

        // Open Razorpay Checkout
        console.log("[Frontend] Preparing to open Razorpay with options:", options); // DEBUG
        const rzp = new window.Razorpay(options);

        // Handle payment failure from Razorpay itself
         rzp.on('payment.failed', function (response){
             console.error("[Frontend] Razorpay Payment Failed Event:", response.error);
             // response.error.metadata can contain order_id and payment_id
             setError(`Payment Failed: ${response.error.description} (Code: ${response.error.code}). Please try again.`);
             toast({ title: "Payment Failed", description: response.error.description || "Your payment could not be processed.", variant: "destructive" });
             setLoading(false); // Re-enable button
         });

        console.log("[Frontend] Calling rzp.open()..."); // DEBUG
        rzp.open();
        // Don't set loading to false here - it will be handled by callbacks

      } else if (paymentMethod === 'cod') {
         // COD Order placed directly
         console.log("[Frontend] COD order placed, navigating to confirmation..."); // DEBUG
         toast({ title: "Order Placed", description: "Your Cash on Delivery order is confirmed!" });
         await clearCart();
         navigate(`/order-confirmation/${orderId}`);
      } else {
         // Should not happen if validation is correct
         console.warn("[Frontend] Invalid state after order creation (not razorpay/cod or payment not required).");
         throw new Error("An unexpected error occurred after placing the order.");
      }

    } catch (err) {
      // --- Enhanced Error Handling ---
      console.error("[Frontend] Checkout Error Caught:", err);
      let displayError = "Failed to place order. Please try again."; // Default
      // Try to get message from backend error response if available
      const backendErrorMessage = err?.response?.data?.error || err?.response?.data?.message || err?.message;

      if (backendErrorMessage) {
           // Check for specific backend error messages you send
           if (backendErrorMessage.includes("unavailable items")) {
               displayError = "Your cart contains unavailable items. Please review your cart.";
           } else if (backendErrorMessage.includes("initiate payment")) {
               displayError = "Could not connect to payment gateway. Please try again later.";
           } else if (backendErrorMessage.includes("stock")) {
                displayError = "Failed to update stock. Please try again or contact support.";
           } else {
               displayError = backendErrorMessage; // Use the backend message directly
           }
      } else if (err.message.includes("Razorpay")) {
          // Error specifically from Razorpay script load or setup
          displayError = err.message;
      }

      setError(displayError);
      toast({
        title: "Order Failed",
        description: displayError,
        variant: "destructive"
      });
      setLoading(false); // Ensure loading is turned off on error
    }
    // No setLoading(false) here - it's handled in all the callbacks and error paths
  };

  // Fixed function: use paymentAPI instead of api, and explicitly accept orderId parameter
  const handlePaymentSuccess = async (response, orderId) => {
    try {
      setLoading(true);
      console.log("[Checkout] Payment success, sending verification data:", response);
      
      // Send ALL necessary parameters to your backend for verification
      const verificationResult = await paymentAPI.verifyPayment({
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature,
        // Optionally include order ID for reference
        orderId: orderId
      });
      
      console.log("[Checkout] Verification result:", verificationResult);
      
      if (verificationResult.success) {
        toast({
          title: "Payment Successful",
          description: "Your order has been confirmed.",
          variant: "success"
        });
        // Clear the cart after successful order
        await clearCart();
        // Navigate to success page or order details
        navigate(`/orders/${verificationResult.orderId || orderId}`);
      } else {
        setError(verificationResult.message || "Payment verification failed");
        toast({
          title: "Verification Failed",
          description: verificationResult.message || "Payment could not be verified.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("[Frontend] Payment Verification Error:", error);
      setError(error.message || "Payment verification failed");
      toast({
        title: "Error",
        description: "Something went wrong during payment verification.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-2 py-4">
      <Button variant="outline" size="sm" onClick={() => navigate('/cart')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Cart
      </Button>
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Checkout</h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Checkout Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Shipping and Payment Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><MapPin className="mr-2 h-5 w-5 text-green-600"/> Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                 {/* Saved Addresses Radio Group */}
                 {addressLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                {savedAddresses.length > 0 && !addressLoading && (
                    <RadioGroup value={selectedAddressId} onValueChange={(id) => handleSelectSavedAddress(savedAddresses.find(a => a._id === id))}>
                        <Label className="mb-2 block font-medium">Select Saved Address</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {savedAddresses.map((addr) => (
                                <Label
                                    key={addr._id}
                                    htmlFor={`addr-${addr._id}`}
                                    className={`flex items-start space-x-3 rounded-md border p-3 cursor-pointer transition-colors hover:bg-gray-50 ${selectedAddressId === addr._id ? 'border-green-500 ring-1 ring-green-500 bg-green-50/30' : 'border-gray-200'}`}
                                >
                                    <RadioGroupItem value={addr._id} id={`addr-${addr._id}`} className="mt-1"/>
                                    <div className="text-sm">
                                        <span className="font-semibold">{addr.label || addr.type}</span>
                                        <p className="text-gray-600 leading-snug">{addr.address}</p>
                                    </div>
                                </Label>
                            ))}
                        </div>
                         <p className="text-center my-2 text-gray-500 text-sm">--- OR Enter New Address ---</p>
                    </RadioGroup>
                )}

               {/* Address Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="street">Street Address *</Label>
                  <Input id="street" name="street" value={shippingAddress.street} onChange={handleAddressChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">City *</Label>
                  <Input id="city" name="city" value={shippingAddress.city} onChange={handleAddressChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State *</Label>
                  <Input id="state" name="state" value={shippingAddress.state} onChange={handleAddressChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="postalCode">Postal Code *</Label>
                  <Input id="postalCode" name="postalCode" value={shippingAddress.postalCode} onChange={handleAddressChange} required />
                </div>
                 <div className="space-y-1.5 sm:col-span-2">
                   <Label htmlFor="country">Country *</Label>
                   <Input id="country" name="country" value={shippingAddress.country} onChange={handleAddressChange} required />
                 </div>
                 <div className="space-y-1.5 sm:col-span-2">
                   <Label htmlFor="phone">Phone Number *</Label>
                   <Input id="phone" name="phone" type="tel" value={shippingAddress.phone} onChange={handleAddressChange} required placeholder="For delivery updates" />
                 </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Instructions */}
           <Card>
             <CardHeader>
               <CardTitle>Delivery Instructions (Optional)</CardTitle>
             </CardHeader>
             <CardContent>
               <Textarea
                 id="deliveryInstructions"
                 value={deliveryInstructions}
                 onChange={(e) => setDeliveryInstructions(e.target.value)}
                 placeholder="E.g., Leave at the front door, call upon arrival..."
                 rows={3}
               />
             </CardContent>
           </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Lock className="mr-2 h-5 w-5 text-green-600"/> Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="space-y-3">
                   {/* Razorpay Option */}
                  <Label htmlFor="pay-razorpay" className="flex items-center space-x-3 rounded-md border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 has-[:checked]:border-green-500 has-[:checked]:ring-1 has-[:checked]:ring-green-500 has-[:checked]:bg-green-50/30 transition-colors">
                    <RadioGroupItem value="razorpay" id="pay-razorpay" />
                    <div className="flex items-center gap-2">
                       <img src="/razorpay-logo.svg" alt="Razorpay" className="h-5" /> {/* Add razorpay logo */}
                      <span className="font-medium">Razorpay</span>
                      <span className="text-xs text-gray-500">(Cards, UPI, NetBanking, Wallets)</span>
                    </div>
                  </Label>
                   {/* COD Option */}
                   <Label htmlFor="pay-cod" className="flex items-center space-x-3 rounded-md border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 has-[:checked]:border-green-500 has-[:checked]:ring-1 has-[:checked]:ring-green-500 has-[:checked]:bg-green-50/30 transition-colors">
                     <RadioGroupItem value="cod" id="pay-cod" />
                     <span className="font-medium">Cash on Delivery (COD)</span>
                   </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {itemCount > 0 ? (
                cart.items.map(item => (
                  <div key={item._id || item.product?._id} className="flex justify-between items-center text-sm">
                    <span className="truncate pr-2">{item.product?.name || 'Item'} x {item.quantity}</span>
                    <span className="font-medium flex-shrink-0">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">Your cart is empty.</p>
              )}
              <hr />
              <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span>{formatPrice(cartTotal)}</span>
                  </div>
                   <div className="flex justify-between">
                      <span className="text-gray-600">Delivery</span>
                      <span>{deliveryCharge === 0 ? <span className="text-green-600">FREE</span> : formatPrice(deliveryCharge)}</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-gray-600">Handling</span>
                      <span>{formatPrice(handlingCharge)}</span>
                   </div>
              </div>
               <hr />
               <div className="flex justify-between font-bold text-lg">
                   <span>Total Payable</span>
                   <span>{formatPrice(grandTotal)}</span>
               </div>
            </CardContent>
            <CardFooter>
              <Button
                size="lg"
                className="w-full"
                onClick={handlePlaceOrder}
                disabled={loading || itemCount === 0}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                   <Lock className="mr-2 h-4 w-4" />
                )}
                 {loading ? 'Processing...' : `Place Order (${formatPrice(grandTotal)})`}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;