// models/Category.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true, // Ensure category names are unique
    minlength: [2, 'Category name must be at least 2 characters'],
    maxlength: [50, 'Category name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
    validate: {
      validator: function(v) {
        // Ensure a category is not its own parent
        return v === null || !this._id || v.toString() !== this._id.toString();
      },
      message: 'Category cannot be its own parent'
    }
  },
  image: {
    type: String, // URL to the category image
    trim: true,
    default: null,
    validate: {
      // Basic URL format validation (optional, adjust as needed)
      validator: function(v) {
        return v === null || v === '' || /^https?:\/\/.+/.test(v);
      },
      message: props => `${props.value} is not a valid image URL format`
    }
  },
  slug: {
    type: String,
    required: true,
    unique: true, // Ensure slugs are unique for URL routing
    trim: true,
    lowercase: true
    // Note: Slug generation logic is handled in the categoryController
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive'],
      message: 'Status must be either "active" or "inactive"'
    },
    default: 'active'
  }
}, {
  timestamps: true, // Automatically manage createdAt and updatedAt fields
  toJSON: { virtuals: true }, // Ensure virtuals are included when converting to JSON
  toObject: { virtuals: true } // Ensure virtuals are included when converting to Object
});

// ----- VIRTUALS -----
// Example: Virtual for full image path if storing relative paths
// categorySchema.virtual('imageUrl').get(function() {
//   if (this.image) {
//     return `${process.env.ASSET_BASE_URL}/${this.image}`;
//   }
//   return '/images/placeholder-category.png'; // Default placeholder
// });

// ----- INDEXES -----
// Improve query performance for common lookups
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ status: 1 });
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ createdAt: -1 }); // If sorting by newest is common

// ----- MIDDLEWARE -----
// Example: Pre-save hook if needed (though slug generation is now in controller)
// categorySchema.pre('save', function(next) {
//   if (this.isModified('name') && !this.slug) { // Only generate slug if name changed and slug isn't set manually
//     this.slug = this.name
//       .toLowerCase()
//       .replace(/[^a-z0-9]+/g, '-')
//       .replace(/(^-|-$)/g, '');
//   }
//   next();
// });


// ----- METHODS -----
// Example: Method to find child categories
categorySchema.methods.findSubcategories = function() {
  return this.model('Category').find({ parentCategory: this._id, status: 'active' });
};

module.exports = mongoose.model('Category', categorySchema);