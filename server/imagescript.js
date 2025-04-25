const mongoose = require('mongoose');
const path = require('path');

// Connect to MongoDB first
mongoose.connect('mongodb://localhost:27017/quick-commerce', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Load the model after connection is established
const Product = require('../server/models/product');

async function updateImages() {
  try {
    const result = await Product.updateMany(
      { image: { $exists: true }, images: { $exists: false } }, // Only update products with image but no images array
      [
        {
          $set: {
            images: [
              {
                url: "$image",
                alt: "$title",
                isDefault: true
              }
            ]
          }
        }
      ]
    );
    console.log(`Updated ${result.modifiedCount} products`);
    
    // Verify the update worked
    const updatedCount = await Product.countDocuments({ images: { $exists: true, $ne: [] } });
    console.log(`Total products with images array: ${updatedCount}`);
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error updating products:', error);
    mongoose.connection.close();
  }
}

updateImages();