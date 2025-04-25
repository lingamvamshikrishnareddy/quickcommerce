const Product = require('../models/product');
const Category = require('../models/category');
const mongoose = require('mongoose');
const slugify = require('slugify');
const { v4: uuidv4 } = require('uuid');
const { imageProcessor } = require('../utils/imageProcessor');
const { validateProductData } = require('../validators/productValidator');

class ProductController {
  constructor() {
    // Bind all methods to this instance to preserve context
    this.createProduct = this.createProduct.bind(this);
    this.getProducts = this.getProducts.bind(this);
    this.getProductById = this.getProductById.bind(this);
    this.getProductBySlug = this.getProductBySlug.bind(this);
    this.updateProduct = this.updateProduct.bind(this);
    this.deleteProduct = this.deleteProduct.bind(this);
    this.addReview = this.addReview.bind(this);
    this.getFeaturedProducts = this.getFeaturedProducts.bind(this);
  }

  /**
   * Process product images for consistent format
   * This ensures images are properly formatted for the frontend
   */
  processProductImages(product) {
    if (!product || !product.images) {
      product.images = [];
      return product;
    }

    // If images is already an array, ensure each item is properly formatted
    if (Array.isArray(product.images)) {
      product.images = product.images.map(image => {
        // If image is a string (URL), convert to object format
        if (typeof image === 'string') {
          return { url: image, alt: product.title || 'Product image', isDefault: false };
        }
        // If image is an object but missing required structure
        else if (typeof image === 'object') {
          if (image.url) {
            return {
              url: image.url,
              alt: image.alt || product.title || 'Product image',
              isDefault: image.isDefault || false
            };
          } else if (image.src) {
            // Handle cases where image might use src instead of url
            return {
              url: image.src,
              alt: image.alt || product.title || 'Product image',
              isDefault: image.isDefault || false
            };
          }
        }
        // Return null for invalid entries
        return null;
      }).filter(Boolean); // Remove any null entries
    }
    // If images is a single string or object, convert to array
    else if (typeof product.images === 'string') {
      product.images = [{ url: product.images, alt: product.title || 'Product image', isDefault: false }];
    }
    else if (typeof product.images === 'object' && (product.images.url || product.images.src)) {
      const url = product.images.url || product.images.src;
      product.images = [{
        url,
        alt: product.images.alt || product.title || 'Product image',
        isDefault: product.images.isDefault || false
      }];
    }
    else {
      product.images = [];
    }

    return product;
  }

  /**
   * Create a new product with enhanced validation and processing
   */
  async createProduct(req, res) {
    try {
      // Validate input data
      const validation = validateProductData(req.body);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const {
        title,
        description,
        category,
        subCategory,
        quantity,
        pricing,
        brand,
        images = [],
        variants = [],
        nutritionalInfo = {},
        tags = [],
        attributes = [],
        stock,
        metadata = {}
      } = req.body;

      // Generate unique identifiers
      const sku = this.generateSKU(category, title);
      const productId = this.generateProductId(category);
      const uuid = uuidv4();

      // Process images if any
      const processedImages = await imageProcessor.processImages(images);

      // Generate slug with conflict resolution
      const quantityString = quantity?.value && quantity?.unit
        ? `${quantity.value}${quantity.unit}`
        : '';
      const baseSlug = slugify(`${category}-${title}-${quantityString}`, {
        lower: true,
        strict: true,
        trim: true
      });

      const slug = await this.generateUniqueSlug(baseSlug);

      // Build product data
      const newProductData = {
        _id: req.body._id || new mongoose.Types.ObjectId().toString(),
        _original_id: req.body._original_id || new mongoose.Types.ObjectId(),
        uuid,
        productId,
        sku,
        slug,
        title,
        description,
        category,
        subCategory,
        quantity,
        pricing,
        stock: Number(stock),
        brand,
        images: processedImages,
        variants,
        nutritionalInfo,
        tags,
        attributes,
        searchKeywords: this.generateSearchKeywords(title, category, productId, sku, slug),
        metadata: {
          isActive: metadata.isActive !== undefined ? metadata.isActive : true,
          inStock: Number(stock) > 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        apiEndpoint: `/api/products/${slug}`,
        apiQuery: {
          byId: `/api/products?productId=${productId}`,
          bySlug: `/api/products?slug=${slug}`,
          byCategory: `/api/products?category=${category}`
        }
      };

      // Handle numeric ID case
      if (!isNaN(newProductData._id)) {
        newProductData._id = Number(newProductData._id);
      }

      // Create and save product
      const newProduct = new Product(newProductData);
      await newProduct.save();

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        product: newProduct
      });
    } catch (error) {
      console.error("Create Product Error:", error);
      this.handleErrorResponse(res, error);
    }
  }

  /**
   * Get products with advanced filtering, sorting
   */
  async getProducts(req, res) {
    try {
      const {
        page = 1,
        limit = 24,
        category: categoryIdentifierFromQuery,
        categorySlug: categorySlugFromQuery,
        subCategory,
        minPrice,
        maxPrice,
        brand,
        search,
        productId,
        slug,
        sortBy = 'metadata.createdAt',
        sortOrder = 'desc',
        tags,
        inStock,
        status = 'active'
      } = req.query;

      // Build filter - IMPORTANT: Make this synchronous
      const filter = await this.buildProductFilterAsync({
        categoryIdentifierFromQuery,
        categorySlugFromQuery,
        subCategory,
        minPrice,
        maxPrice,
        brand,
        search,
        productId,
        slug,
        tags,
        inStock,
        status
      });

      // Build sort criteria
      const sortCriteria = this.buildSortCriteria(sortBy, sortOrder);

      // Query construction
      const fieldsToSelect = 'title slug images brand pricing category subCategory quantity rating stock metadata.isActive metadata.createdAt';
      const skip = (Number(page) - 1) * Number(limit);

      // Execute queries in parallel
      const [products, total] = await Promise.all([
        Product.find(filter)
          .select(fieldsToSelect)
          .sort(sortCriteria)
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Product.countDocuments(filter)
      ]);

      // Process images before sending response
      const processedProducts = products.map(product => this.processProductImages(product));

      // Prepare response
      const response = {
        success: true,
        products: processedProducts,
        pagination: {
          totalProducts: total,
          totalPages: Math.ceil(total / Number(limit)),
          currentPage: Number(page),
          limit: Number(limit)
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("Get Products Error:", error);
      this.handleErrorResponse(res, error);
    }
  }

  /**
   * Get product by ID with similar products
   */
  async getProductById(req, res) {
    try {
      let product = await this.findProductById(req.params.id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Process the product images
      product = this.processProductImages(product.toObject ? product.toObject() : product);

      // Get similar products and process their images too
      let similarProducts = await this.getSimilarProducts(product);
      similarProducts = similarProducts.map(prod => this.processProductImages(prod));

      const response = {
        success: true,
        product,
        similarProducts
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("Get Product By ID Error:", error);
      this.handleErrorResponse(res, error);
    }
  }

  /**
   * Get product by slug with similar products
   */
  async getProductBySlug(req, res) {
    try {
      let product = await Product.findOne({ slug: req.params.slug });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Process the product images
      product = this.processProductImages(product.toObject ? product.toObject() : product);

      // Get similar products and process their images too
      let similarProducts = await this.getSimilarProducts(product);
      similarProducts = similarProducts.map(prod => this.processProductImages(prod));

      const response = {
        success: true,
        product,
        similarProducts
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("Get Product By Slug Error:", error);
      this.handleErrorResponse(res, error);
    }
  }

  /**
   * Update buildProductFilter method in productController.js
   */
  async buildProductFilterAsync({
    categoryIdentifierFromQuery,
    categorySlugFromQuery,
    subCategory,
    minPrice,
    maxPrice,
    brand,
    search,
    productId,
    slug,
    tags,
    inStock,
    status
  }) {
    const filter = {};

    // Handle product status
    if (status) {
      filter['metadata.isActive'] = status === 'active';
    }

    // Handle in-stock filter
    if (inStock === 'true' || inStock === true) {
      filter.stock = { $gt: 0 };
    }

    // Handle category filtering with improved matching
    if (categoryIdentifierFromQuery || categorySlugFromQuery) {
      const categoryIdentifier = categoryIdentifierFromQuery || categorySlugFromQuery;

      try {
        // First try to find the category by slug or name
        const category = await Category.findOne({
          $or: [
            { slug: categoryIdentifier },
            { name: { $regex: new RegExp(categoryIdentifier.replace(/-/g, '[ -]'), 'i') }}
          ]
        }).exec();

        if (category) {
          // If category found, create multiple ways to match the category name
          const categoryNameVariations = [
            category.name,
            category.slug,
            category.name.replace(/[&-]/g, ' '),
            category.name.replace(/&/g, 'and'),
            ...category.name.split(/\s*&\s*/).map(part => part.trim())
          ].filter(Boolean);

          filter.category = {
            $regex: new RegExp(categoryNameVariations.map(v =>
              v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i')
          };
        } else {
          // If no category found, use the raw identifier
          filter.category = {
            $regex: new RegExp(categoryIdentifier.replace(/-/g, '[ -]'), 'i')
          };
        }
      } catch (err) {
        console.error("Error finding category:", err);
        // Fallback to basic filtering
        filter.category = {
          $regex: new RegExp(categoryIdentifier.replace(/-/g, '[ -]'), 'i')
        };
      }
    }

    // Handle subcategory filtering
    if (subCategory) {
      filter.subCategory = {
        $regex: new RegExp(subCategory.replace(/-/g, '[ -]'), 'i')
      };
    }

    // Add other filters
    if (minPrice) {
      filter['pricing.salePrice'] = { ...filter['pricing.salePrice'] || {}, $gte: Number(minPrice) };
    }

    if (maxPrice) {
      filter['pricing.salePrice'] = { ...filter['pricing.salePrice'] || {}, $lte: Number(maxPrice) };
    }

    if (brand) {
      filter.brand = { $regex: new RegExp(brand, 'i') };
    }

    if (productId) {
      filter.productId = productId;
    }

    if (slug) {
      filter.slug = slug;
    }

    if (tags) {
      filter.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    }

    // Handle search query across multiple fields
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { brand: searchRegex },
        { category: searchRegex },
        { subCategory: searchRegex },
        { tags: searchRegex },
        { 'searchKeywords': searchRegex }
      ];
    }

    return filter;
  }

  /**
   * Update product with comprehensive validation
   */
  async updateProduct(req, res) {
    try {
      const findCriteria = this.buildFindCriteria(req.params.id);
      if (!findCriteria) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID format'
        });
      }

      const existingProduct = await Product.findOne(findCriteria).lean();
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Validate update data
      const validation = validateProductData(req.body, true);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // Prepare update data
      const updateData = this.prepareUpdateData(req.body, existingProduct);

      // Process images if updated
      if (req.body.images) {
        updateData.images = await imageProcessor.processImages(req.body.images);
      }

      // Update product
      const updatedProduct = await Product.findOneAndUpdate(
        findCriteria,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedProduct) {
        return res.status(404).json({
          success: false,
          message: 'Product not found during update'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        product: updatedProduct
      });
    } catch (error) {
      console.error("Update Product Error:", error);
      this.handleErrorResponse(res, error);
    }
  }

  /**
   * Delete product (soft delete)
   */
  async deleteProduct(req, res) {
    try {
      const findCriteria = this.buildFindCriteria(req.params.id);
      if (!findCriteria) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID format'
        });
      }

      const product = await Product.findOneAndUpdate(
        findCriteria,
        {
          $set: {
            'metadata.isActive': false,
            'metadata.updatedAt': new Date()
          }
        },
        { new: true }
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Product deactivated successfully',
        product
      });
    } catch (error) {
      console.error("Delete Product Error:", error);
      this.handleErrorResponse(res, error);
    }
  }

  /**
   * Add review to product with rating recalculation
   */
  async addReview(req, res) {
    try {
      const { rating, comment } = req.body;
      const productId = req.params.id;
      const userId = req.user._id;

      // Validate review data
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }

      const product = await this.findProductById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Check for existing review
      const alreadyReviewed = product.reviews.some(
        review => review.user.toString() === userId.toString()
      );

      if (alreadyReviewed) {
        return res.status(400).json({
          success: false,
          message: 'You have already reviewed this product'
        });
      }

      // Add new review
      const review = {
        user: userId,
        rating: Number(rating),
        comment,
        createdAt: new Date()
      };

      product.reviews.push(review);

      // Recalculate ratings
      product.rating = {
        count: product.reviews.length,
        average: product.reviews.reduce(
          (acc, item) => acc + item.rating, 0
        ) / product.reviews.length
      };

      await product.save();

      res.status(201).json({
        success: true,
        message: 'Review added successfully',
        review: product.reviews[product.reviews.length - 1]
      });
    } catch (error) {
      console.error("Add Review Error:", error);
      this.handleErrorResponse(res, error);
    }
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(req, res) {
    try {
      const featuredProducts = await Product.find({
        'metadata.isFeatured': true,
        'metadata.isActive': true,
        'stock': { $gt: 0 }
      })
      .select('title slug images pricing stock rating')
      .sort({ 'metadata.featuredOrder': 1 })
      .limit(12)
      .lean();

      const response = {
        success: true,
        count: featuredProducts.length,
        products: featuredProducts
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("Get Featured Products Error:", error);
      this.handleErrorResponse(res, error);
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Generate a unique SKU for the product
   */
  generateSKU(category, title) {
    const categoryPrefix = (category || 'GEN').substring(0, 3).toUpperCase();
    const titlePart = title.substring(0, 3).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 6);
    return `${categoryPrefix}-${titlePart}-${randomPart}`;
  }

  /**
   * Generate a unique product ID
   */
  generateProductId(category) {
    const categoryPrefix = (category || 'GEN').substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const randomPart = Math.random().toString(36).substring(2, 5);
    return `${categoryPrefix}-${timestamp}-${randomPart}`;
  }

  /**
   * Generate search keywords array
   */
  generateSearchKeywords(title, category, productId, sku, slug) {
    const keywords = new Set([
      title?.toLowerCase(),
      category?.toLowerCase(),
      productId?.toLowerCase(),
      sku?.toLowerCase(),
      slug?.toLowerCase(),
      ...title?.split(/\s+/).map(word => word.toLowerCase()),
      ...category?.split(/\s+/).map(word => word.toLowerCase())
    ]);
    return Array.from(keywords).filter(Boolean);
  }

  /**
   * Generate a unique slug with conflict resolution
   */
  async generateUniqueSlug(baseSlug) {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await Product.findOne({ slug }).select('_id').lean();
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Build sort criteria from parameters
   */
  buildSortCriteria(sortBy, sortOrder) {
    const sortMapping = {
      'price': 'pricing.salePrice',
      'created': 'metadata.createdAt',
      'updated': 'metadata.updatedAt',
      'rating': 'rating.average',
      'popularity': 'rating.count',
      'name': 'title',
      'stock': 'stock'
    };

    const sortField = sortMapping[sortBy] || sortBy || 'metadata.createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    return { [sortField]: sortDirection, _id: 1 };
  }

  /**
   * Find product by various ID types
   */
  async findProductById(id) {
    if (!isNaN(id)) {
      return await Product.findOne({ _id: Number(id) });
    }

    if (mongoose.Types.ObjectId.isValid(id)) {
      const product = await Product.findOne({ _original_id: id });
      if (product) return product;
      return await Product.findById(id);
    }

    return null;
  }

  /**
   * Get similar products for a given product
   */
  async getSimilarProducts(product) {
    const similarProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      'metadata.isActive': true,
      'stock': { $gt: 0 }
    })
    .select('title slug images pricing stock rating')
    .limit(4)
    .lean();

    return similarProducts;
  }

  /**
   * Build find criteria based on ID type
   */
  buildFindCriteria(id) {
    if (!isNaN(id)) {
      return { _id: Number(id) };
    }

    if (mongoose.Types.ObjectId.isValid(id)) {
      return { _original_id: id };
    }

    return null;
  }

  /**
   * Prepare update data with proper transformations
   */
  prepareUpdateData(updateData, existingProduct) {
    const data = { ...updateData };

    // Handle stock updates
    if (data.stock !== undefined && data.stock !== null) {
      data.stock = Number(data.stock);
      data['metadata.inStock'] = data.stock > 0;
    }

    // Handle slug regeneration if title changed
    if (data.title && data.title !== existingProduct.title) {
      const category = data.category || existingProduct.category;
      const quantity = data.quantity || existingProduct.quantity;
      const quantityString = quantity?.value && quantity?.unit
        ? `${quantity.value}${quantity.unit}`
        : '';
      const baseSlug = slugify(`${category}-${data.title}-${quantityString}`, {
        lower: true,
        strict: true
      });
      data.slug = baseSlug;

      // Update search keywords
      data.searchKeywords = this.generateSearchKeywords(
        data.title || existingProduct.title,
        category,
        existingProduct.productId,
        existingProduct.sku,
        data.slug
      );

      // Update API endpoints
      data.apiEndpoint = `/api/products/${data.slug}`;
      data.apiQuery = {
        byId: `/api/products?productId=${existingProduct.productId}`,
        bySlug: `/api/products?slug=${data.slug}`,
        byCategory: `/api/products?category=${category}`
      };
    }

    // Update timestamp
    data['metadata.updatedAt'] = new Date();

    // Fields that should never be updated
    delete data._id;
    delete data._original_id;
    delete data.productId;
    delete data.sku;
    delete data.uuid;
    delete data.reviews;
    delete data.rating;

    return data;
  }

  /**
   * Handle error responses consistently
   */
  handleErrorResponse(res, error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(el => el.message);
      return res.status(400).json({
        success: false,
        message: "Validation Failed",
        errors
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `Duplicate key error: ${field} already exists.`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development'
        ? error.message
        : 'An unexpected error occurred'
    });
  }
}

module.exports = new ProductController();
