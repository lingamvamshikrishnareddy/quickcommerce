import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '../ui/button';

const CartIcon = ({ itemCount = 0, total = 0.00 }) => {
  return (
    <div className="relative group">
      <Button 
        variant="ghost" 
        size="icon" 
        className="relative"
        onClick={() => {/* Toggle cart visibility */}}
      >
        <ShoppingCart className="h-5 w-5" />
        {itemCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
      </Button>
      
      {itemCount > 0 && (
        <div className="hidden group-hover:block absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg p-4 z-50">
          <div className="text-sm text-gray-600">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </div>
          <div className="font-semibold text-lg">
            ${total.toFixed(2)}
          </div>
          <Button 
            className="w-full mt-2"
            onClick={() => {/* Navigate to cart page */}}
          >
            View Cart
          </Button>
        </div>
      )}
    </div>
  );
};

export default CartIcon;