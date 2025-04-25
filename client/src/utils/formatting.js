// src/utils/formatting.js
export const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR', // Or your desired currency
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };
  
  // Add any other formatting helpers here