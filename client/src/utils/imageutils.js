/**
 * Utility functions for handling product images
 */

/**
 * Gets the primary image URL from a product
 * @param {Object} product - The product object
 * @param {string} fallbackUrl - Fallback URL if no image is found (optional)
 * @returns {string} - The URL of the primary image
 */
export const getPrimaryImageUrl = (product, fallbackUrl = '/images/placeholder-product.png') => {
    if (!product) return fallbackUrl;
    
    // Check if images array exists and has items
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      // Get the first image from the array
      const primaryImage = product.images[0];
      
      // Check if the image is a string (URL) or an object with url property
      if (typeof primaryImage === 'string') {
        return primaryImage;
      } else if (primaryImage && primaryImage.url) {
        return primaryImage.url;
      }
    }
    
    // Return the fallback if no valid image is found
    return fallbackUrl;
  };
  
  /**
   * Gets all image URLs from a product
   * @param {Object} product - The product object
   * @returns {Array} - Array of image URLs
   */
  export const getAllImageUrls = (product) => {
    if (!product || !product.images) return [];
    
    // Handle case where images is not an array
    if (!Array.isArray(product.images)) {
      if (typeof product.images === 'string') {
        return [product.images];
      } else if (product.images.url) {
        return [product.images.url];
      }
      return [];
    }
    
    // Map the array to get URLs
    return product.images.map(image => {
      if (typeof image === 'string') {
        return image;
      } else if (image && image.url) {
        return image.url;
      }
      return null;
    }).filter(Boolean); // Remove nulls
  };
  
  /**
   * Creates an image object with alt text
   * @param {string} url - The image URL
   * @param {string} alt - The alt text (optional)
   * @returns {Object} - Image object with url and alt properties
   */
  export const createImageObject = (url, alt = 'Product image') => {
    return { url, alt };
  };
  
  /**
   * Handles image loading errors by replacing with fallback
   * @param {Event} event - The error event
   * @param {string} fallbackUrl - URL to use when image fails to load
   */
  export const handleImageError = (event, fallbackUrl = '/images/placeholder-product.png') => {
    event.target.onerror = null; // Prevent infinite loop
    event.target.src = fallbackUrl;
  };