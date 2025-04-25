const mongoose = require('mongoose');
const Cart = require('../server/models/cart');
const Product = require('../server/models/product');

// Set your MongoDB connection string here
const MONGODB_URI = 'mongodb://localhost:27017/quickcommerce'; // Replace with your actual connection string

async function fixCartProductReferences() {
  try {
    console.log('Starting cart product reference fix...');
    
    // Get all carts
    const carts = await Cart.find({});
    console.log(`Found ${carts.length} carts to process`);
    
    for (const cart of carts) {
      if (!cart.items || cart.items.length === 0) continue;
      
      console.log(`Processing cart ${cart._id} with ${cart.items.length} items`);
      let fixedCount = 0;
      
      for (const item of cart.items) {
        // Skip if no product reference
        if (!item.product) continue;
        
        console.log(`Checking item with product ref: ${item.product}`);
        
        // Try to find the product directly
        let product = await Product.findById(item.product);
        
        // If not found, try by original_id
        if (!product) {
          product = await Product.findOne({ _original_id: item.product });
        }
        
        // If still not found, try by productId or slug if available
        if (!product && item.productId) {
          product = await Product.findOne({ productId: item.productId });
        }
        
        if (!product && item.productSlug) {
          product = await Product.findOne({ slug: item.productSlug });
        }
        
        // If still not found, try using productName
        if (!product && item.productName) {
          product = await Product.findOne({ 
            $or: [
              { title: item.productName },
              { name: item.productName }
            ]
          });
        }
        
        // If still not found, check similar IDs by string manipulation (no regex)
        if (!product) {
          // Get all products and do manual string comparison
          const idStr = item.product.toString();
          const prefix = idStr.substring(0, idStr.length - 3); // Use first part of ID
          
          console.log(`Looking for products with ID prefix: ${prefix}`);
          
          // Get all products (limit to a reasonable number)
          const potentialProducts = await Product.find({}).limit(500);
          
          // Find potential matches by string prefix comparison
          for (const potentialProduct of potentialProducts) {
            const potentialId = potentialProduct._id.toString();
            const potentialOriginalId = potentialProduct._original_id ? 
                                       potentialProduct._original_id.toString() : '';
            
            if (potentialId.startsWith(prefix) || potentialOriginalId.startsWith(prefix)) {
              product = potentialProduct;
              console.log(`Found potential match via prefix: ${potentialId}`);
              break;
            }
          }
        }
        
        // If found with any method, update the reference
        if (product) {
          if (!product._id.equals(item.product)) {
            console.log(`Found match for item ${item._id}: ${item.product} -> ${product._id}`);
            item.product = product._id;
            item.productObjectId = product._id;
            fixedCount++;
          } else {
            console.log(`Product reference already correct: ${product._id}`);
          }
        } else {
          console.log(`No product match found for item ${item._id} with product ref ${item.product}`);
        }
      }
      
      if (fixedCount > 0) {
        console.log(`Fixed ${fixedCount} references in cart ${cart._id}`);
        await cart.save();
      }
    }
    
    console.log('Cart product reference fix completed.');
  } catch (error) {
    console.error('Error fixing cart references:', error);
  } finally {
    // Close the connection when done
    mongoose.connection.close();
  }
}

// Connect to MongoDB with the explicit connection string
console.log('Connecting to MongoDB...');
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    return fixCartProductReferences();
  })
  .then(() => {
    console.log('Fix completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });