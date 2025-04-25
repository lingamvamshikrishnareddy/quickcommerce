// Place these functions in a separate file like debugHelpers.js
// or add them directly to the components that need debugging

/**
 * Debug utility to safely log objects with circular references
 * @param {string} label - Label for the log
 * @param {any} obj - Object to log
 */
export const safeLog = (label, obj) => {
    try {
      // Using a replacer function to handle circular references
      const seen = new WeakSet();
      const replacer = (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      };
      
      console.log(`[DEBUG] ${label}:`, JSON.stringify(obj, replacer, 2));
    } catch (err) {
      console.log(`[DEBUG] ${label} (stringification failed):`, obj);
    }
  };
  
  /**
   * Debug utility for image loading
   * @param {Object} imageData - Image data to debug
   * @returns {string} - Valid image URL or placeholder
   */
  export const debugImageUrl = (imageData) => {
    console.log('[DEBUG] Image data:', imageData);
    
    if (!imageData) {
      console.warn('[DEBUG] No image data provided');
      return '/images/placeholder-200.png';
    }
    
    if (typeof imageData === 'string') {
      console.log('[DEBUG] Image is string URL:', imageData);
      return imageData;
    }
    
    if (Array.isArray(imageData)) {
      console.log('[DEBUG] Image is array:', imageData);
      if (imageData.length === 0) return '/images/placeholder-200.png';
      
      const firstImage = imageData[0];
      if (typeof firstImage === 'string') return firstImage;
      return firstImage?.url || firstImage?.src || '/images/placeholder-200.png';
    }
    
    if (typeof imageData === 'object') {
      console.log('[DEBUG] Image is object:', imageData);
      return imageData.url || imageData.src || '/images/placeholder-200.png';
    }
    
    return '/images/placeholder-200.png';
  };