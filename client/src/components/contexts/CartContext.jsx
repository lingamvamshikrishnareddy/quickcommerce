import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { cartAPI } from '../../services/api';
import { useAuth } from './AuthContext';
import { useToast } from '../ui/usetoast'; // Adjust path as needed

const CartContext = createContext(null);

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState({ items: [], total: 0, totalItems: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { isAuthenticated, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const calculateTotals = (cartData) => {
        if (!cartData || !cartData.items) return { items: [], total: 0, totalItems: 0 };
        
        const totalItems = cartData.items.reduce((count, item) => count + item.quantity, 0);
        
        // Calculate total with null-safety - prefer backend calculation if available
        const total = cartData.total || cartData.items.reduce((sum, item) => {
            // First try item.price (our new stored price)
            if (item.price) {
                return sum + (item.price * item.quantity);
            }
            // Next try product.price if product is populated
            else if (item.product?.price) {
                return sum + (item.product.price * item.quantity);
            }
            return sum; // Skip items with no price
        }, 0);

        return { ...cartData, totalItems, total };
    };

    const fetchCart = useCallback(async () => {
        console.log("Fetching cart...");
        setLoading(true);
        setError(null);
        try {
            const response = await cartAPI.getCart();
            
            // Make sure we have a valid response
            if (!response) {
                throw new Error("Invalid response from cart API");
            }
            
            const processedCart = calculateTotals(response);
            setCart(processedCart);
            console.log("Cart fetched:", processedCart);
        } catch (err) {
            console.error("Failed to fetch cart:", err);
            setError(err.message || 'Failed to load cart');
            setCart({ items: [], total: 0, totalItems: 0 });
        } finally {
            setLoading(false);
        }
    }, []);

    // Define removeFromCart before it's used in updateCartItem
    const removeFromCart = useCallback(async (itemId) => {
        if (!isAuthenticated) return { success: false, error: "Authentication required" };
        
        setLoading(true);
        setError(null);
        
        // Optimistic UI update
        const originalCart = {...cart};
        const updatedItems = cart.items.filter(item => item._id !== itemId);
        setCart(prevCart => calculateTotals({ ...prevCart, items: updatedItems }));

        try {
            const response = await cartAPI.removeItem(itemId);
            
            if (!response?.data?.success) {
                throw new Error(response?.data?.message || "Failed to remove cart item");
            }
            
            // Update with server response
            const processedCart = calculateTotals(response.data.data);
            setCart(processedCart);
            
            toast({
                title: "Item Removed",
                description: "Item successfully removed from cart",
                variant: "success"
            });
            
            return { success: true, cart: processedCart };
        } catch (err) {
            console.error("Failed to remove item from cart:", err);
            setError(err.message || 'Failed to remove item');
            setCart(originalCart); // Revert on error
            
            toast({
                title: "Error",
                description: err.message || "Failed to remove item from cart",
                variant: "destructive"
            });
            
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, cart, toast]);

    const updateCartItem = useCallback(async (itemId, quantity) => {
        if (!isAuthenticated) return;
        
        if (quantity < 1) {
            return await removeFromCart(itemId);
        }

        setLoading(true);
        setError(null);
        
        // Optimistic UI update
        const originalCart = {...cart};
        const updatedItems = cart.items.map(item =>
            item._id === itemId ? { ...item, quantity } : item
        );
        
        setCart(prevCart => calculateTotals({ ...prevCart, items: updatedItems }));

        try {
            const response = await cartAPI.updateItem(itemId, quantity);
            
            if (!response?.data?.success) {
                throw new Error(response?.data?.message || "Failed to update cart item");
            }
            
            // Update with server response
            const processedCart = calculateTotals(response.data.data);
            setCart(processedCart);
            
            return { success: true, cart: processedCart };
        } catch (err) {
            console.error("Failed to update cart item:", err);
            setError(err.message || 'Failed to update item');
            setCart(originalCart); // Revert on error
            
            toast({
                title: "Error",
                description: err.message || "Failed to update cart item",
                variant: "destructive"
            });
            
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, cart, removeFromCart, toast]);

    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            fetchCart();
        } else if (!isAuthenticated && !authLoading) {
            setCart({ items: [], total: 0, totalItems: 0 });
        }
    }, [isAuthenticated, authLoading, fetchCart]);

    const addToCart = useCallback(async (product, quantity = 1, variation = null) => {
        if (!isAuthenticated) {
            setError("Please log in to add items to your cart.");
            return { success: false, error: "Authentication required" };
        }
        
        setLoading(true);
        setError(null);
        
        try {
            let productIdentifier;
            
            if (typeof product === 'object' && product !== null) {
                // Prioritize identifiers for FINDING the product on the backend:
                // 1. Slug (user-friendly)
                // 2. Current _id (if available and maybe numeric)
                // 3. Custom productId
                // 4. Original _id (if needed as fallback)
                productIdentifier = product.slug || product._id || product.productId || product._original_id;
                console.log(`CartContext: Identified product by slug/id/productId: ${productIdentifier}`);
            } else {
                // Direct identifier passed (string/number)
                productIdentifier = product;
                console.log(`CartContext: Using direct identifier: ${productIdentifier}`);
            }
            
            if (!productIdentifier) {
                throw new Error("No valid product identifier provided to addToCart");
            }
            
            console.log(`CartContext: Calling cartAPI.addItem with identifier: ${productIdentifier}, quantity: ${quantity}`);
            // *** Pass the identifier to the API ***
            const response = await cartAPI.addItem(productIdentifier, quantity, variation);
            
            if (response?.data?.success && response?.data?.data) {
                const processedCart = calculateTotals(response.data.data);
                setCart(processedCart);
                
                toast({
                    title: "Item Added",
                    description: "Product added to your cart successfully.",
                    variant: "success"
                });
                
                return { success: true, cart: processedCart };
            } else {
                throw new Error(response?.data?.message || "Invalid response structure from addItem");
            }
        } catch (err) {
            console.error("CartContext: Failed to add item to cart:", err);
            setError(err.message || 'Failed to add item');
            
            toast({
                title: "Error",
                description: err.message || "Failed to add item to cart",
                variant: "destructive"
            });
            
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, toast, calculateTotals]); // Added calculateTotals dependency

    const clearCart = useCallback(async () => {
        if (!isAuthenticated) return { success: false, error: "Authentication required" };
        
        setLoading(true);
        setError(null);
        
        // Optimistic UI update
        const originalCart = {...cart};
        setCart({ items: [], total: 0, totalItems: 0 });
        
        try {
            const response = await cartAPI.clearCart();
            
            if (!response?.data?.success) {
                throw new Error("Failed to clear cart");
            }
            
            toast({
                title: "Cart Cleared",
                description: "All items removed from your cart",
                variant: "success"
            });
            
            return { success: true };
        } catch (err) {
            console.error("Failed to clear cart:", err);
            setError(err.message || 'Failed to clear cart');
            setCart(originalCart); // Revert on error
            
            toast({
                title: "Error",
                description: err.message || "Failed to clear cart",
                variant: "destructive"
            });
            
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, cart, toast]);

    // Function to get cart item count for UI indicators
    const getCartItemCount = useCallback(() => {
        return cart?.totalItems || 0;
    }, [cart]);

    const value = {
        cart,
        itemCount: getCartItemCount(),
        cartTotal: cart.total || 0,
        loading,
        error,
        fetchCart,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};