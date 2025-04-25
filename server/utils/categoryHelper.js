// utils/categoryHelper.js

/**
 * Standardizes category name formats across the application
 * @param {string} categoryName - The category name to standardize
 * @returns {string} - The standardized category name
 */
const standardizeCategoryName = (categoryName) => {
    if (!categoryName) return '';
    
    // Convert to lowercase for consistent comparison
    const lowerName = categoryName.toLowerCase().trim();
    
    // Common variations mapping
    const variations = {
      'beauty & personal care': 'beauty & personal care',
      'personal care & beauty': 'beauty & personal care',
      'personal & care & beauty': 'beauty & personal care',
      'home & personal care': 'home & personal care',
      'home & personal & care': 'home & personal care',
      'smart home': 'smart home',
      'smart & home': 'smart home',
      'ice creams': 'ice creams',
      'ice & creams': 'ice creams',
      // Add other variations as needed
    };
    
    return variations[lowerName] || categoryName;
  };
  
  /**
   * Generates a URL-friendly slug from a category name
   * @param {string} name - Category name
   * @returns {string} - URL-friendly slug
   */
  const generateCategorySlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };
  
  /**
   * Creates a regex pattern that matches different variations of category names
   * @param {string} categoryName - The base category name
   * @returns {RegExp} - Regular expression for matching variations
   */
  const createCategoryNameRegex = (categoryName) => {
    if (!categoryName) return null;
    
    // Create variations of the category name
    const parts = categoryName.split(' & ');
    
    // Build variations
    const variations = [
      categoryName,
      parts.join(' '),
      parts.reverse().join(' & ')
    ];
    
    // Create a regex pattern that matches any variation
    const pattern = variations.map(name => 
      name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
    ).join('|');
    
    return new RegExp(pattern, 'i');
  };
  
  module.exports = {
    standardizeCategoryName,
    generateCategorySlug,
    createCategoryNameRegex
  };