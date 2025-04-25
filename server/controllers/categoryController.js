/**
 * Category Controller - Handles all category-related API endpoints
 */
const Category = require('../models/category');
const Product = require('../models/product');
const { NotFoundError, BadRequestError } = require('../utils/errors');

class CategoryController {
  /**
   * Create a new category
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  async createCategory(req, res) {
    try {
      const { 
        name, 
        description, 
        parentCategory = null,
        image,
        slug 
      } = req.body;

      // Check if category already exists
      const existingCategory = await Category.findOne({ 
        $or: [{ name }, { slug }] 
      });
      
      if (existingCategory) {
        return res.status(400).json({ 
          success: false,
          message: existingCategory.name === name ? 
                  'Category name already exists' : 
                  'Category slug already exists'
        });
      }

      const newCategory = new Category({
        name,
        description,
        parentCategory,
        image: image || null,
        slug: slug || this.generateSlug(name),
        status: 'active'
      });

      await newCategory.save();

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: newCategory
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        message: 'Error creating category',
        error: error.message 
      });
    }
  }

  /**
   * Get all categories with pagination and filtering
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  async getAllCategories(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status = 'active',
        parentOnly = false,
        search = '',
        sort = 'name',
        order = 'asc'
      } = req.query;
  
      // Build query filters
      const filters = { status };
  
      if (parentOnly === 'true' || parentOnly === true) {
        filters.parentCategory = null;
      }
  
      if (search) {
        filters.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
  
      // Build sort options
      const sortOptions = {};
      sortOptions[sort] = order === 'desc' ? -1 : 1;
  
      // Execute query with pagination
      const categories = await Category.find(filters)
        .populate('parentCategory', 'name slug image')
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .sort(sortOptions)
        .lean();
  
      // Get total count for pagination
      const total = await Category.countDocuments(filters);
  
      // Get subcategory and product count for each category
      const enhancedCategories = await Promise.all(categories.map(async (category) => {
        const subcategoryCount = await Category.countDocuments({
          parentCategory: category._id,
          status: 'active'
        });
  
        const productCount = await Product.countDocuments({
          category: category._id,
          status: 'active'
        });
  
        return {
          ...category,
          subcategoryCount,
          productCount
        };
      }));
  
      res.json({
        success: true,
        data: enhancedCategories,
        pagination: {
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
          currentPage: parseInt(page),
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching categories',
        error: error.message
      });
    }
  }
  
  /**
   * Get main categories grouped by top-level category type
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  async getMainCategories(req, res) {
    try {
      // Define primary category groups (these are the top-level groups)
      const primaryGroups = [
        "Grocery & Food",
        "Health & Beauty",
        "Home & Living",
        "Electronics",
        "Fashion & Accessories",
        "Sports & Fitness",
        "Pets & Animals",
        "Kids & Toys",
        "Other"
      ];
      
      // Get all main categories that have no parent
      const allMainCategories = await Category.find({ 
        parentCategory: null,
        status: 'active'
      })
      .select('name slug image')
      .sort({ name: 1 })
      .lean();
      
      // Group categories by primary group
      const groupedCategories = [];
      
      // Helper function to determine which primary group a category belongs to
      const getCategoryGroup = (categoryName) => {
        categoryName = categoryName.toLowerCase();
        
        if (/food|grocery|bakery|breakfast|dairy|eggs|produce|meat|seafood|frozen|pantry|snacks|beverages/.test(categoryName)) {
          return "Grocery & Food";
        } else if (/beauty|care|health|makeup|skincare|hair|personal|hygiene|washing|cleaning|shaving|grooming/.test(categoryName)) {
          return "Health & Beauty";
        } else if (/home|living|furniture|decor|household|kitchen|dining|appliances|garden|outdoor|cleaning|supplies|pooja/.test(categoryName)) {
          return "Home & Living";
        } else if (/electronics|computers|laptops|smartphones|devices|smart|tv|entertainment|automation/.test(categoryName)) {
          return "Electronics";
        } else if (/fashion|accessories|jewelry|bags|footwear|men|women/.test(categoryName)) {
          return "Fashion & Accessories";
        } else if (/sports|fitness|exercise|equipment|accessories/.test(categoryName)) {
          return "Sports & Fitness";
        } else if (/pet|dog|cat|supplies/.test(categoryName)) {
          return "Pets & Animals";
        } else if (/kids|toys|games|baby|puzzles/.test(categoryName)) {
          return "Kids & Toys";
        } else {
          return "Other";
        }
      };
      
      // Group categories
      primaryGroups.forEach(group => {
        const categoriesInGroup = allMainCategories.filter(category => 
          getCategoryGroup(category.name) === group
        );
        
        if (categoriesInGroup.length > 0) {
          groupedCategories.push({
            title: group,
            items: categoriesInGroup
          });
        }
      });
      
      res.json({
        success: true,
        data: groupedCategories
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching main categories',
        error: error.message
      });
    }
  }
  
  /**
   * Get featured categories
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  async getFeaturedCategories(req, res) {
    try {
      const { limit = 5 } = req.query;
      
      // Find categories with the most products (as a simple way to determine "featured" status)
      const categories = await Category.aggregate([
        { $match: { status: 'active' } },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: 'category',
            as: 'products'
          }
        },
        {
          $project: {
            name: 1,
            slug: 1,
            image: 1,
            productCount: { $size: '$products' }
          }
        },
        { $sort: { productCount: -1 } },
        { $limit: parseInt(limit) }
      ]);
      
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching featured categories',
        error: error.message
      });
    }
  }

  /**
   * Get category by ID with related products
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  async getCategoryById(req, res) {
    try {
      const { id } = req.params;
      const { productLimit = 10, includeSubcategories = false } = req.query;
      
      const category = await Category.findById(id)
        .populate('parentCategory', 'name slug image');

      if (!category) {
        return res.status(404).json({ 
          success: false,
          message: 'Category not found' 
        });
      }

      // Get subcategories if requested
      let subcategories = [];
      if (includeSubcategories === 'true') {
        subcategories = await Category.find({ 
          parentCategory: category._id,
          status: 'active'
        })
        .select('name slug image')
        .lean();
      }

      // Get products in this category
      const products = await Product.find({ 
        category: category._id,
        status: 'active'
      })
      .select('name price salePrice images slug rating stock')
      .sort({ createdAt: -1 })
      .limit(parseInt(productLimit))
      .lean();

      res.json({
        success: true,
        data: {
          category,
          subcategories,
          products,
          productCount: products.length
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        message: 'Error fetching category',
        error: error.message 
      });
    }
  }

  /**
   * Get category by slug with related products
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  // Updated Product Query in getCategoryBySlug method of categoryController.js
   // Update getCategoryBySlug method in categoryController.js
async getCategoryBySlug(req, res) {
  try {
    const { slug } = req.params;
    const { productLimit = 10, includeSubcategories = 'true' } = req.query;
    
    // Find the category by slug
    const category = await Category.findOne({ slug })
      .populate('parentCategory', 'name slug image');

    if (!category) {
      return res.status(404).json({ 
        success: false,
        message: 'Category not found' 
      });
    }

    // Get subcategories if requested
    let subcategories = [];
    if (includeSubcategories === 'true') {
      subcategories = await Category.find({ 
        parentCategory: category._id,
        status: 'active'
      })
      .select('name slug image')
      .lean();
    }

    // Create multiple ways to match category name
    // This handles variations, special characters, etc.
    const categoryNameVariations = [
      category.name,
      category.name.toLowerCase(),
      category.name.toUpperCase(),
      // Remove special characters
      category.name.replace(/[&-]/g, ' '),
      category.name.replace(/[&-]/g, ''),
      // Replace '&' with 'and'
      category.name.replace(/&/g, 'and'),
      // Split by '&' and use parts
      ...category.name.split(/\s*&\s*/).map(part => part.trim()),
      // Handle reversed parts (e.g., "Beauty & Personal Care" vs "Personal Care & Beauty")
      category.name.includes('&') ? 
        category.name.split(/\s*&\s*/).reverse().join(' & ') : 
        null,
      // Handle hyphenated versions
      category.name.replace(/\s+/g, '-'),
      category.slug // Try the slug itself as a fallback
    ].filter(Boolean); // Remove null/undefined values
    
    // Build a regex pattern to match any variations
    const regexPatterns = categoryNameVariations.map(name => 
      new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    );
    
    // Find products matching any of the category variations
    const products = await Product.find({ 
      $or: [
        { category: { $in: regexPatterns } },
        { subCategory: { $in: regexPatterns } },
        { 'searchKeywords': { $in: regexPatterns } }
      ],
      stock: { $gt: 0 },
      "metadata.isActive": true
    })
    .select('title slug images brand pricing category subCategory quantity rating stock')
    .sort({ createdAt: -1 })
    .limit(parseInt(productLimit))
    .lean();

    res.json({
      success: true,
      data: {
        category,
        subcategories,
        products,
        productCount: products.length
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching category',
      error: error.message 
    });
  }
}
  /**
   * Update category by ID
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { 
        name, 
        description, 
        parentCategory, 
        image,
        slug,
        status 
      } = req.body;

      // Check if category exists
      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({ 
          success: false,
          message: 'Category not found' 
        });
      }
      
      // Check for name/slug conflicts if changing these fields
      if ((name && name !== category.name) || (slug && slug !== category.slug)) {
        const existingCategory = await Category.findOne({
          _id: { $ne: id },
          $or: [
            { name: name || category.name },
            { slug: slug || category.slug }
          ]
        });
        
        if (existingCategory) {
          return res.status(400).json({ 
            success: false,
            message: existingCategory.name === (name || category.name) ? 
                    'Category name already exists' : 
                    'Category slug already exists'
          });
        }
      }
      
      // Prevent self-referential parent assignment
      if (parentCategory && parentCategory === id) {
        return res.status(400).json({ 
          success: false,
          message: 'Category cannot be its own parent'
        });
      }

      // Update the category
      const updatedCategory = await Category.findByIdAndUpdate(
        id,
        { 
          name: name || category.name, 
          description, 
          parentCategory,
          image,
          slug: slug || category.slug,
          status
        },
        { 
          new: true, 
          runValidators: true 
        }
      );

      res.json({
        success: true,
        message: 'Category updated successfully',
        data: updatedCategory
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        message: 'Error updating category',
        error: error.message 
      });
    }
  }

  /**
   * Delete category by ID
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      const { force = false } = req.query;
      
      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({ 
          success: false,
          message: 'Category not found' 
        });
      }

      // Check for subcategories
      const subcategoryCount = await Category.countDocuments({ 
        parentCategory: category._id 
      });
      
      if (subcategoryCount > 0) {
        return res.status(400).json({ 
          success: false,
          message: 'Cannot delete category with subcategories' 
        });
      }

      // Check for associated products
      const productCount = await Product.countDocuments({ 
        category: category._id 
      });

      if (productCount > 0 && !force) {
        return res.status(400).json({ 
          success: false,
          message: `Cannot delete category with ${productCount} associated products. Use force=true to override.` 
        });
      }

      await Category.findByIdAndDelete(id);

      res.json({ 
        success: true,
        message: 'Category deleted successfully' 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        message: 'Error deleting category',
        error: error.message 
      });
    }
  }

  /**
   * Generate a URL-friendly slug from a string
   * @param {string} name - Input string
   * @returns {string} - URL-friendly slug
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}

module.exports = new CategoryController();