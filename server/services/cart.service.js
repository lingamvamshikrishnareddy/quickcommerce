// ========================================================
// START: services/cart.service.js (Full File - Updated)
// ========================================================
const Cart = require('../models/cart');
const Product = require('../models/product');
const mongoose = require('mongoose');

class CartService {

  // ====================================================
  // addItem V6 (Extreme Debugging for Slug Saving)
  // ====================================================
  async addItem(userId, productIdentifier, quantity = 1, variation = null) {
      try {
          console.log(`[addItem V6] START. Adding product: ${productIdentifier} (Qty: ${quantity})`);

          // --- Find product ---
          let product = null;
          console.log(`[addItem V6] Finding product...`);
          // Select fields needed, including slug
          const selectFields = '_id _original_id title name slug pricing stock';

          if (mongoose.Types.ObjectId.isValid(productIdentifier)) {
              const oid = typeof productIdentifier === 'string' ? new mongoose.Types.ObjectId(productIdentifier) : productIdentifier;
              product = await Product.findOne({ $or: [{ _id: oid }, { _original_id: oid }] }).select(selectFields).lean();
              if (product) console.log(`[addItem V6] Found by ID.`);
          }
          if (!product && typeof productIdentifier === 'string') {
              product = await Product.findOne({ slug: productIdentifier }).select(selectFields).lean();
              if (product) console.log(`[addItem V6] Found by Slug.`);
          }
          if (!product && typeof productIdentifier === 'string') {
              product = await Product.findOne({ productId: productIdentifier }).select(selectFields).lean();
              if (product) console.log(`[addItem V6] Found by productId.`);
          }

          if (!product) { throw new Error(`[addItem V6] Product not found: ${productIdentifier}`); }
          console.log(`[addItem V6] Product found. Raw Data:`, JSON.stringify(product)); // <<< LOG RAW PRODUCT DATA
          // --- End Find product ---

          const productRefId = product._original_id || product._id;
          const currentPrice = product.pricing?.salePrice ?? product.pricing?.mrp ?? product.price ?? 0;
          const productName = product.title || product.name;
          // <<<--- EXPLICITLY Check and Assign Slug --- >>>
          const productSlug = product.slug; // Get slug value
          console.log(`[addItem V6] Extracted Slug Value: ${productSlug} (Type: ${typeof productSlug})`);

          // CRITICAL CHECK: Ensure slug exists and is a non-empty string
          if (!productSlug || typeof productSlug !== 'string' || productSlug.trim() === '') {
               console.error(`[addItem V6] FATAL ERROR: Product ${productName} (ID: ${productRefId}) is MISSING a valid 'slug'! Cannot reliably add to cart.`);
               throw new Error(`Product '${productName}' data is incomplete (missing valid slug). Cannot add to cart.`);
          }
          // <<<--- END SLUG CHECK --- >>>

          if (!productRefId) { throw new Error(`Product ${productName} missing reference ID.`); }
          console.log(`[addItem V6] Using: RefID=${productRefId}, Slug=${productSlug}, Name=${productName}, Price=${currentPrice}`);

          let cart = await Cart.findOne({ user: userId });
          if (!cart) { cart = new Cart({ user: userId, items: [] }); console.log(`[addItem V6] New cart created.`); }

          const existingItemIndex = cart.items.findIndex(item =>
               item.product?.toString() === productRefId.toString() &&
               JSON.stringify(item.variation) === JSON.stringify(variation)
          );

          if (existingItemIndex > -1) {
              console.log(`[addItem V6] Updating existing item...`);
              const itemToUpdate = cart.items[existingItemIndex];
              itemToUpdate.quantity += quantity;
              itemToUpdate.price = currentPrice;
              itemToUpdate.productName = productName;
              itemToUpdate.productSlug = productSlug; // <<< ASSIGN VERIFIED SLUG
              console.log(`[addItem V6] Updated item state:`, JSON.stringify(itemToUpdate));
          } else {
              console.log(`[addItem V6] Adding new item...`);
              const newItem = {
                  product: productRefId,
                  productObjectId: productRefId,
                  productSlug: productSlug, // <<< ASSIGN VERIFIED SLUG
                  productName: productName,
                  quantity: quantity,
                  price: currentPrice,
                  variation: variation
              };
              cart.items.push(newItem);
               console.log(`[addItem V6] New item state:`, JSON.stringify(newItem));
          }

          // Save Cart with Logging
          console.log(`[addItem V6 DEBUG] Attempting save. Items Array to Save:`, JSON.stringify(cart.items, null, 2)); // Log the whole items array
          try {
              const saveResult = await cart.save();
              console.log(`[addItem V6 DEBUG] Save success. Cart ID: ${saveResult?._id}. Items in saved result: ${saveResult?.items?.length}`);
          } catch (saveError) {
              console.error(`[addItem V6 DEBUG] SAVE FAILED:`, saveError);
              // Log the state just before save again
              console.error(`[addItem V6 DEBUG] Cart items JUST BEFORE failed save:`, JSON.stringify(cart.items, null, 2));
              throw saveError;
          }

          console.log(`[addItem V6] END.`);
          return cart;

      } catch (error) {
          console.error('[addItem V6] Error:', error);
          throw error;
      }
  }

  // ====================================================
  // getCart V5 (Focus on Slug/Name lookup, includes ID as last resort)
  // ====================================================
   // Inside services/cart.service.js - getCart V6 (Focus on reliable data attachment)

async getCart(userId) {
  try {
      console.log(`[getCart V6] Getting cart for user: ${userId}`);
      const rawCart = await Cart.findOne({ user: userId }).lean(); // Use lean for performance

      if (!rawCart || !rawCart.items || rawCart.items.length === 0) {
          console.log(`[getCart V6] No cart/items found.`);
          // Return an empty Mongoose Cart object for consistency
          return new Cart({ user: userId, items: [] });
      }
      console.log(`[getCart V6] Found cart ${rawCart._id} with ${rawCart.items.length} items`);

      // Array to hold the processed items (plain objects) WITH populated product data
      const processedItems = [];

      // --- Loop through items from the lean cart data ---
      for (const item of rawCart.items) {
          let productData = null;
          const productSlug = item.productSlug; // Get slug from cart item
          const productName = item.productName;
          const productRef = item.product;

          console.log(`[getCart V6] Processing item ${item._id}. Slug: ${productSlug || 'N/A'}, Name: ${productName}, Ref: ${productRef}`);

          // --- Find product using helper (tries Slug -> Name -> ID) ---
          // Ensure the helper returns a plain object if lean() was used inside
          productData = await this._findProductByReferenceFields(productRef, productSlug, productName);

          // --- Attach Product or Filter ---
          if (productData) {
               // Ensure product data has a canonical ID
               if (!productData._original_id && productData._id) {
                   productData._original_id = productData._id;
               }
               console.log(`[getCart V6] Product found for item ${item._id}. Attaching.`);

               // Create a *new object* combining the original item properties
               // and the found product data under 'populatedProduct'
               const processedItem = {
                   ...item, // Spread original lean item data (_id, quantity, price, productName, productSlug etc.)
                   populatedProduct: productData // Attach the found product data as a new property
               };
               processedItems.push(processedItem); // Add this enhanced object to our results array
               console.log(`[getCart V6] Successfully processed item ${item._id}.`);

          } else {
              console.error(`[getCart V6] FINAL FAILURE: Product NOT FOUND for item ${item._id}. Filtering.`);
              // Do not add to processedItems
          }
      } // --- End loop ---

      // --- Prepare and return final cart ---
      // Create a new Mongoose Cart document, passing the processedItems array
      // We need to pass the other cart fields too (like user, _id)
      const finalCartData = {
         ...rawCart, // Include original _id, user, couponCode etc.
         items: processedItems // Use the array of items that now include populatedProduct
      };

      console.log(`[getCart V6] Creating final Mongoose Cart. Populated items count: ${finalCartData.items.length}`);
      // Log the structure being passed to the constructor
      console.log(`[getCart V6 DEBUG] Data for new Cart():`, JSON.stringify(finalCartData, null, 2));

      const hydratedCart = new Cart(finalCartData);
      hydratedCart.isNew = false; // Mark as existing

      // <<<--- Add final check --- >>>
      if (hydratedCart.items.length > 0 && !hydratedCart.items[0].populatedProduct) {
          console.error(`[getCart V6 DEBUG] CRITICAL ERROR: hydratedCart item 0 MISSING populatedProduct AFTER construction!`);
      } else if (hydratedCart.items.length > 0) {
           console.log(`[getCart V6 DEBUG] hydratedCart item 0 HAS populatedProduct. Title: ${hydratedCart.items[0].populatedProduct?.title}`);
      }
      // <<<--- End final check --- >>>

      return hydratedCart;

  } catch (error) {
      console.error('[getCart V6] Unexpected error:', error);
      throw new Error(`Failed to retrieve/process cart: ${error.message}`);
  }

}

  // ====================================================
  // getProcessedCart (New Method)
  // ====================================================
  async getProcessedCart(userId) {
    try {
      console.log(`[getProcessedCart] Getting cart for user: ${userId}`);

      // Get the raw cart
      const rawCart = await Cart.findOne({ user: userId }).lean();

      if (!rawCart || !rawCart.items || rawCart.items.length === 0) {
        console.log(`[getProcessedCart] No cart/items found.`);
        return { cart: new Cart({ user: userId, items: [] }), processedItems: [] };
      }

      console.log(`[getProcessedCart] Found cart ${rawCart._id} with ${rawCart.items.length} items`);

      // Create a new array to hold processed items with product data
      const processedItems = [];

      // Fetch and attach product data for each item
      for (const item of rawCart.items) {
        // Use the helper to find product data
        const productData = await this._findProductByReferenceFields(
          item.product,
          item.productSlug,
          item.productName
        );

        if (productData) {
          console.log(`[getProcessedCart] Product found for item ${item._id}: ${productData.title}`);
          console.log(`[getProcessedCart] Stock data: ${productData.stock}, inStock: ${productData.metadata?.inStock}`);

          // Create a processed item with product data
          processedItems.push({
            ...item,
            productData // Attach the product data directly
          });
        } else {
          console.log(`[getProcessedCart] Product not found for item ${item._id}`);
        }
      }

      // Create a Mongoose cart to return (without the processed data)
      const cart = new Cart(rawCart);
      cart.isNew = false;

      return { cart, processedItems };
    } catch (error) {
      console.error(`[getProcessedCart] Error:`, error);
      throw error;
    }
  }

  // ====================================================
  // validateCart (Updated Method)
  // ====================================================
 

  async validateCart(userId) {
    try {
      console.log(`[validateCart NEW] Validating cart for user: ${userId}`);
  
      // Get the cart with processed items
      const { cart, processedItems } = await this.getProcessedCart(userId);
  
      if (!cart || !cart._id) {
        console.log(`[validateCart NEW] No valid cart found.`);
        return { cart: { items: [] }, isValid: true, invalidItems: [], validPlainItems: [] };
      }
  
      if (processedItems.length === 0) {
        console.log(`[validateCart NEW] No valid items in cart ${cart._id}.`);
        return { cart, isValid: true, invalidItems: [], validPlainItems: [] };
      }
  
      const validItems = [];
      const invalidItems = [];
      let requiresSave = false;
  
      // Validate each processed item
      for (const processedItem of processedItems) {
        const product = processedItem.productData;
  
        if (!product) {
          console.log(`[validateCart NEW] Product data missing for item ${processedItem._id}.`);
          invalidItems.push({
            itemId: processedItem._id,
            name: processedItem.productName,
            reason: 'Product details could not be loaded'
          });
          continue;
        }
  
        // Stock check
        const stock = product.stock;
        const inStockFlag = product.metadata?.inStock ?? true;
        const availableStock = (inStockFlag && typeof stock === 'number' && stock >= 0) ? stock : 0;
  
        console.log(`[validateCart NEW] Stock check for ${product.title}: Required=${processedItem.quantity}, Available=${availableStock}`);
  
        if (availableStock < processedItem.quantity) {
          console.log(`[validateCart NEW] Insufficient stock for ${product.title}.`);
          invalidItems.push({
            itemId: processedItem._id,
            productId: product._original_id || product._id,
            name: product.title || processedItem.productName,
            reason: 'Insufficient stock',
            requested: processedItem.quantity,
            available: availableStock
          });
          continue;
        }
  
        // Item is valid, add it to valid items
        validItems.push({
          ...processedItem,
          populatedProduct: product, // Renamed from productData to populatedProduct for compatibility
          validatedStock: availableStock // Include the validated stock
        });
      }
  
      // Update the cart if needed
      if (invalidItems.length > 0) {
        // Get valid item IDs
        const validItemIds = new Set(validItems.map(item => item._id.toString()));
  
        // Find the items in the original cart and keep only valid ones
        const originalItems = cart.items.filter(item =>
          validItemIds.has(item._id.toString())
        );
  
        // Update the cart
        cart.items = originalItems;
        requiresSave = true;
      }
  
      // Save if needed
      if (requiresSave) {
        console.log(`[validateCart NEW] Saving cart with ${cart.items.length} valid items.`);
        await cart.save();
      }
  
      // Log the successful validation
      console.log(`[validateCart NEW] Validation complete: ${validItems.length} valid items, ${invalidItems.length} invalid items`);
  
      // Store valid items with their product data in a place accessible to the controller
      const result = {
        cart,
        isValid: invalidItems.length === 0,
        invalidItems,
        validItems,  // Keep this for backward compatibility
        validPlainItems: validItems  // Add this to match what the controller expects
      };
  
      // Store in a global cache with a short TTL if possible
      global._validatedCartData = global._validatedCartData || {};
      global._validatedCartData[userId] = {
        data: result,
        timestamp: Date.now()
      };
  
      return result;
    } catch (error) {
      console.error(`[validateCart NEW] Error:`, error);
      throw error;
    }
  }
  // ====================================================
  // getValidatedCartData (New Method)
  // ====================================================
  getValidatedCartData(userId) {
    if (!global._validatedCartData || !global._validatedCartData[userId]) {
      return null;
    }

    // Check if the data is fresh (within 30 seconds)
    const data = global._validatedCartData[userId];
    if (Date.now() - data.timestamp > 30000) {
      delete global._validatedCartData[userId];
      return null;
    }

    return data.data;
  }

  // ====================================================
  // Other Cart Methods (updateItemQuantity, removeItem, clearCart)
  // ====================================================
  async updateItemQuantity(userId, itemId, quantity) {
      try {
           console.log(`[CartService][updateItemQuantity] Updating item: ${itemId} quantity to ${quantity}`);
           const cart = await Cart.findOne({ user: userId });

           if (!cart) throw new Error('Cart not found');

           const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
           if (itemIndex === -1) throw new Error('Item not found in cart');

           if (quantity <= 0) {
               console.log(`[CartService][updateItemQuantity] Removing item: ${itemId}`);
               cart.items.splice(itemIndex, 1);
           } else {
               cart.items[itemIndex].quantity = quantity;
               console.log(`[CartService][updateItemQuantity] Updated quantity for item: ${itemId} to ${quantity}`);
           }
           await cart.save();
           return cart;
      } catch (error) {
          console.error('[CartService][updateItemQuantity] Error:', error);
          throw error;
      }
  }

  async removeItem(userId, itemId) {
      try {
          console.log(`[CartService][removeItem] Removing item: ${itemId} from cart`);
          const cart = await Cart.findOne({ user: userId });

          if (!cart) throw new Error('Cart not found');

          const initialCount = cart.items.length;
          cart.items = cart.items.filter(item => item._id.toString() !== itemId);

          if (cart.items.length < initialCount) {
              console.log(`[CartService][removeItem] Item removed successfully: ${itemId}`);
              await cart.save();
          } else {
              console.log(`[CartService][removeItem] Item not found in cart: ${itemId}`);
          }
          return cart;

      } catch (error) {
          console.error('[CartService][removeItem] Error:', error);
          throw error;
      }
  }

  async clearCart(userId) {
      try {
           console.log(`[CartService][clearCart] Clearing cart for user: ${userId}`);
           const cart = await Cart.findOne({ user: userId });

           if (cart) {
               cart.items = [];
               await cart.save();
               console.log(`[CartService][clearCart] Cart cleared successfully`);
               return true;
           } else {
               console.log(`[CartService][clearCart] No cart found to clear`);
               return false;
           }
      } catch (error) {
          console.error('[CartService][clearCart] Error:', error);
          throw error;
      }
  }

  // ====================================================
  // Helper Methods (Keep these)
  // ====================================================

  /**
   * Helper method to find product using all available reference fields
   * Used by getCart V5
   * @private
   */
  async _findProductByReferenceFields(productRef, productSlug, productName) {
      let product = null;
      const selectFields = '_id _original_id title name slug stock pricing metadata'; // Fields needed by validation/getCart

      // --- Strategy 1: Find by slug (Primary reliable method) ---
      if (!product && productSlug && typeof productSlug === 'string' && productSlug.trim() !== '') {
          const trimmedSlug = productSlug.trim();
          console.log(`[_findProductByReferenceFields] Trying lookup by slug: ${trimmedSlug}`);
          try {
              product = await Product.findOne({ slug: trimmedSlug }).select(selectFields).lean();
              if (product) console.log(`[_findProductByReferenceFields] Found product by slug: ${trimmedSlug}`);
              else console.log(`[_findProductByReferenceFields] Product NOT found by slug: ${trimmedSlug}`);
          } catch (e) { console.error(`[_findProductByReferenceFields] Error during slug lookup:`, e); }
      }

      // --- Strategy 2: Find by name (Fallback) ---
      if (!product && productName && typeof productName === 'string' && productName.trim() !== '') {
          const trimmedName = productName.trim();
          const escapedName = trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const nameRegex = new RegExp('^' + escapedName + '$', 'i');
          console.log(`[_findProductByReferenceFields] Trying lookup by name: ${trimmedName}`);
          try {
              product = await Product.findOne({ $or: [ { title: nameRegex }, { name: nameRegex } ] })
                 .select(selectFields).lean();
              if (product) console.log(`[_findProductByReferenceFields] Found product by name: ${trimmedName}`);
              else console.log(`[_findProductByReferenceFields] Product NOT found by name: ${trimmedName}`);
          } catch (e) { console.error(`[_findProductByReferenceFields] Error during name lookup:`, e); }
      }

      // --- Strategy 3: Find by ID reference (LAST resort, unreliable) ---
      if (!product && mongoose.Types.ObjectId.isValid(productRef)) {
          const objectIdToQuery = typeof productRef === 'string' ?
              new mongoose.Types.ObjectId(productRef) : productRef;
          console.log(`[_findProductByReferenceFields] Trying lookup by ID reference: ${objectIdToQuery}`);
          try {
              product = await Product.findOne({ $or: [ { _original_id: objectIdToQuery }, { _id: objectIdToQuery } ] })
                  .select(selectFields).lean();
              if (product) console.log(`[_findProductByReferenceFields] Found product by ID: ${product._original_id || product._id}`);
              else console.log(`[_findProductByReferenceFields] Product NOT found by ID: ${objectIdToQuery}`);
          } catch (e) { console.error(`[_findProductByReferenceFields] Error during ID lookup:`, e); }
      }

      return product; // Return found product or null
  }

  // Helper method for addItem - intentionally kept separate for clarity
  async _findProductByMultipleStrategies(identifier) {
      let product = null;
      const selectFields = '_id _original_id title name slug pricing stock'; // Fields needed by addItem

      // Strategy 1: Find by ObjectId (_id or _original_id)
      if (!product && mongoose.Types.ObjectId.isValid(identifier)) {
          const objectIdToQuery = typeof identifier === 'string' ?
              new mongoose.Types.ObjectId(identifier) : identifier;
          console.log(`[_findProductByMultipleStrategies] Trying lookup by ObjectId: ${identifier}`);
          product = await Product.findOne({ $or: [ { _id: objectIdToQuery }, { _original_id: objectIdToQuery } ] })
              .select(selectFields).lean();
          if (product) console.log(`[_findProductByMultipleStrategies] Found product by ObjectId: ${product._original_id || product._id}`);
      }

      // Strategy 2: Find by slug
      if (!product && typeof identifier === 'string') {
          console.log(`[_findProductByMultipleStrategies] Trying lookup by slug: ${identifier}`);
          product = await Product.findOne({ slug: identifier }).select(selectFields).lean();
          if (product) console.log(`[_findProductByMultipleStrategies] Found product by slug: ${product.slug}`);
      }

      // Strategy 3: Find by productId field
      if (!product && typeof identifier === 'string') {
          console.log(`[_findProductByMultipleStrategies] Trying lookup by productId: ${identifier}`);
          product = await Product.findOne({ productId: identifier }).select(selectFields).lean();
          if (product) console.log(`[_findProductByMultipleStrategies] Found product by productId: ${product.productId}`);
      }

      return product;
  }

  // Ghost product creation - NOT USED by getCart V5 / validateCart V_SIMPLE_3
  _createGhostProduct(item) {
      const ghostId = item.product || new mongoose.Types.ObjectId();
      console.warn(`[_createGhostProduct] Creating fallback ghost product for item ${item._id}`);
      return {
          _id: ghostId,
          _original_id: ghostId,
          title: item.productName || 'Unknown Product',
          name: item.productName || 'Unknown Product',
          slug: item.productSlug || item.productName?.toLowerCase().replace(/\s+/g, '-') || null,
          stock: item.quantity || 1, // Ensure stock >= quantity
          pricing: { salePrice: item.price || 0, mrp: item.price || 0 },
          metadata: { inStock: true, isGhostProduct: true } // Mark as ghost
      };
  }

} // End of CartService class

module.exports = new CartService();
// ========================================================
// END: services/cart.service.js
// ========================================================
