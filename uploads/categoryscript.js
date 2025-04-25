// scripts/importCategories.js
const mongoose = require('mongoose');
const Category = require('../models/Category');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected successfully');
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Function to generate slug
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Import categories from JSON file
async function importCategories() {
  try {
    // Read JSON file
    const jsonData = fs.readFileSync(
      path.join(__dirname, '../data/categories.json'),
      'utf8'
    );
    const categoriesData = JSON.parse(jsonData);
    
    console.log(`Found ${categoriesData.length} main category objects`);
    
    // Process main categories
    for (const item of categoriesData) {
      const mainCategories = item.main_categories;
      
      for (const mainCategory of mainCategories) {
        console.log(`Processing main category: ${mainCategory.title}`);
        
        // Create main category
        const mainCategoryDoc = new Category({
          name: mainCategory.title,
          slug: mainCategory.slug,
          description: `${mainCategory.title} category`,
          image: '/api/placeholder/200/200',
          status: 'active'
        });
        
        await mainCategoryDoc.save();
        console.log(`Created main category: ${mainCategory.title}`);
        
        // Process subcategories
        for (const subItem of mainCategory.items) {
          console.log(`Processing subcategory: ${subItem.name}`);
          
          // Create subcategory
          const subCategoryDoc = new Category({
            name: subItem.name,
            slug: subItem.slug,
            description: `${subItem.name} under ${mainCategory.title}`,
            parentCategory: mainCategoryDoc._id,
            image: subItem.image || '/api/placeholder/200/200',
            status: 'active'
          });
          
          await subCategoryDoc.save();
          console.log(`Created subcategory: ${subItem.name}`);
        }
      }
    }
    
    console.log('Categories import completed successfully');
  } catch (error) {
    console.error('Error importing categories:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Run the import function
importCategories();