const mongoose = require('mongoose');
const Cart = require('../models/cart');
const Product = require('../models/product');

// Helper function for sending consistent responses
const sendResponse = (res, success, message, data = null, statusCode = 200, error = null) => {
  const response = { success, message };
  if (data !== null) response.data = data;
  // Improved error handling for sendResponse
  if (error !== null && !success) {
    response.error = error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error));
  }
  return res.status(statusCode).json(response);
};

class CartController {
  // Get user's cart
  async getCart(req, res) {
    try {
      const userId = req.user._id; // Assuming auth middleware provides req.user._id

      // Find user's cart with full product information for display
      let cart = await Cart.findOne({ user: userId })
                         .populate('items.product', 'title slug images price pricing _id productId _original_id metadata.inStock'); // Select necessary fields

      if (!cart) {
        // If no cart exists, return an empty cart structure, consistent with expectations
        return sendResponse(res, true, 'Cart is empty', { items: [], total: 0, _id: null, user: userId });
      }

      // Optional: Check if any items need price updates (e.g., if prices aren't stored in cart items)
      // This depends on your CartItemSchema and business logic. If prices ARE stored, validation is better.
      // For simplicity, we'll rely on the stored price or populate for now.
      // If you *do* need live price checks here, uncomment and adapt the updateItemPrices logic.
      /*
      if (cart.items.length > 0) {
        const needsUpdate = cart.items.some(item => !item.product || item.price === undefined || item.price === null);
        if (needsUpdate && typeof cart.updateItemPrices === 'function') {
          console.log(`Cart ${cart._id} might require updates. Running updateItemPrices...`);
          await cart.updateItemPrices(); // Assuming this method exists on the Cart model
          // Reload the cart with updated information
          cart = await Cart.findOne({ user: userId })
                         .populate('items.product', 'title slug images price pricing _id productId _original_id metadata.inStock');
          if (!cart) {
            return sendResponse(res, false, 'Failed to reload cart after update', null, 500);
          }
          console.log(`Cart ${cart._id} updated successfully.`);
        }
      }
      */

      // Recalculate total based on populated data to be safe, if needed
      // cart.total = cart.items.reduce((sum, item) => sum + (item.product ? (item.product.price * item.quantity) : 0), 0);

      return sendResponse(res, true, 'Cart fetched successfully', cart);
    } catch (error) {
      console.error('Get cart error:', error);
      return sendResponse(res, false, 'Failed to fetch cart', null, 500, error);
    }
  }

  // Add item to cart - CORRECTED VERSION
  async addToCart(req, res) {
    try {
      const userId = req.user._id;
      // 'identifier' is the value sent from the frontend (could be slug, productId, _id, _original_id string)
      const { productId: identifier, quantity = 1, variation = null } = req.body;

      if (!identifier) {
        return sendResponse(res, false, 'Product identifier (productId, slug, etc.) is required', null, 400);
      }

      const numQuantity = parseInt(quantity, 10);
      if (isNaN(numQuantity) || numQuantity <= 0) {
        return sendResponse(res, false, 'Invalid quantity', null, 400);
      }

      console.log(`Attempting to add product identifier: ${identifier} (Qty: ${numQuantity}) to cart for user: ${userId}`);

      // --- Find the product using various identifiers ---
      // Prioritize more specific or reliable identifiers first
      let product = null;
      try {
        // 1. Try finding by original MongoDB ObjectId string (_original_id) if identifier is a valid ObjectId format
        if (mongoose.Types.ObjectId.isValid(identifier)) {
          product = await Product.findOne({ _original_id: identifier }); // Use the corrected ObjectId type here
          console.log(product ? `Found product by _original_id: ${product._original_id}` : 'Product not found by _original_id');
        }

        // 2. Try finding by current numeric _id (if identifier is numeric)
        // Be cautious if your _ids are not ObjectIds
        if (!product && !isNaN(identifier)) {
          // Ensure your Product model can handle numeric _id lookup if necessary
          try {
             product = await Product.findOne({ _id: Number(identifier) });
             console.log(product ? `Found product by numeric _id: ${product._id}` : 'Product not found by numeric _id');
          } catch(numIdError){
             console.warn(`Could not query by numeric _id ${identifier}:`, numIdError.message);
          }
        }

        // 3. If not found yet, try by custom productId field
        if (!product) {
          product = await Product.findOne({ productId: identifier });
          console.log(product ? `Found product by custom productId field: ${product.productId}` : 'Product not found by custom productId field');
        }

        // 4. If not found yet, try by slug
        if (!product) {
          product = await Product.findOne({ slug: identifier });
          console.log(product ? `Found product by slug: ${product.slug}` : 'Product not found by slug');
        }

      } catch (err) {
        console.error("Error finding product:", err);
        return sendResponse(res, false, 'Error occurred while searching for the product', null, 500, err);
      }

      // Ensure the product exists
      if (!product) {
        console.log(`Product not found using identifier: ${identifier}`);
        return sendResponse(res, false, 'Product not found', null, 404);
      }

      // --- Determine the Product Reference ID (CORRECTED and SIMPLIFIED) ---
      let productReferenceId = null; // Initialize to null

      // 1. Check if _original_id is a valid ObjectId (it should be now)
      //    Mongoose should retrieve it as an ObjectId object if the DB type is correct.
      if (product._original_id && mongoose.Types.ObjectId.isValid(product._original_id)) {
          // Directly ASSIGN the ObjectId object. DO NOT RE-CAST.
          productReferenceId = product._original_id;
          // Check the constructor name to be sure Mongoose gives an ObjectId
          console.log(`Using reliable _original_id (Type: ${product._original_id.constructor.name}) as reference: ${productReferenceId}`);
      }
      // 2. Fallback ONLY if _original_id was missing/invalid AND _id IS a valid ObjectId
      //    (This is unlikely given your data structure where _id is numeric)
      else if (product._id && mongoose.Types.ObjectId.isValid(product._id)) {
          // Directly ASSIGN the ObjectId object. DO NOT RE-CAST.
          productReferenceId = product._id;
          console.log(`Warning: Using fallback _id (Type: ${product._id.constructor.name}) as reference (original_id missing/invalid): ${productReferenceId}`);
      }

      // 3. Final check: If we STILL haven't assigned a valid ObjectId, THEN error out.
      if (!productReferenceId) {
        // Log details for why it failed
        console.error(`Product found (slug: ${product.slug}) but failed to assign a valid ObjectId reference. _id: [${product._id}], _original_id: [${product._original_id}]`);
        console.error(`Type of _id: ${typeof product._id}, Type of _original_id: ${typeof product._original_id}, isValid(_original_id): ${mongoose.Types.ObjectId.isValid(product._original_id)}`);
        return sendResponse(res, false, 'Product has no usable identifier for cart reference', null, 500); // Keep original error message for consistency
      }
      // --- End Corrected Reference ID Determination ---

      // Determine the price to store in the cart (prioritize sale price)
      const productPrice = product.pricing?.salePrice ?? product.pricing?.mrp ?? product.price ?? 0;
      if (productPrice === 0 && product.pricing?.mrp !== 0) { // Only warn if salePrice is 0 but MRP is not
          console.warn(`Product ${product.title} (${productReferenceId}) has effective price of 0 (Sale: ${product.pricing?.salePrice}, MRP: ${product.pricing?.mrp}).`);
      }

      // Find user's cart or create a new one
      let cart = await Cart.findOne({ user: userId });
      if (!cart) {
        console.log(`No cart found for user ${userId}, creating a new one.`);
        cart = new Cart({ user: userId, items: [] });
      }

      // Check if item with the same product REFERENCE ID and variation already exists
      const variationString = variation ? JSON.stringify(variation) : null; // Ensure consistent comparison

      const itemIndex = cart.items.findIndex(item => {
        // Ensure item.product exists and compare OBJECTIDs using toString()
        return item.product && item.product.toString() === productReferenceId.toString() &&
               JSON.stringify(item.variation || null) === variationString; // Compare variations robustly
      });

      if (itemIndex > -1) {
        // Item exists, update quantity and ensure price/name is current
        cart.items[itemIndex].quantity += numQuantity;
        cart.items[itemIndex].price = productPrice; // Update price in case it changed
        cart.items[itemIndex].productName = product.title; // Ensure name is up-to-date
        console.log(`Updated existing item in cart. ProductRef: ${productReferenceId}, New quantity: ${cart.items[itemIndex].quantity}`);
      } else {
        // Item doesn't exist, add new item using the determined REFERENCE ID
        console.log(`Adding new item to cart: ${product.title} (Reference ID: ${productReferenceId}) at price: ${productPrice}`);
        const newItem = {
          product: productReferenceId,         // Reference for population
          productObjectId: productReferenceId, // <<< --- ADD THIS LINE --- >>> Assign the same ObjectId
          productName: product.title,          // Store the name for display fallback
          quantity: numQuantity,
          price: productPrice                  // Store price at time of adding
        };
        if (variation) {
            newItem.variation = variation;    // Add variation if provided
        }

        cart.items.push(newItem);
      }

      // Ensure Mongoose knows the array was modified
      cart.markModified('items');
      // --- ADD LOGGING BEFORE SAVE ---
      console.log(`[addToCart DEBUG] Cart items BEFORE save attempt:`, JSON.stringify(cart.items, null, 2));
      // --- END LOGGING ---
      try {
        await cart.save(); // <-- The critical step
        // --- ADD LOGGING AFTER SUCCESSFUL SAVE ---
        console.log(`[addToCart DEBUG] cart.save() completed successfully. Cart ID: ${cart._id}`);
        // --- END LOGGING ---
      } catch (saveError) {
        // --- ADD LOGGING FOR SAVE ERROR ---
        console.error(`[addToCart DEBUG] ERROR during cart.save():`, saveError);
         // Ensure this error is propagated correctly
         // Re-throw or handle appropriately depending on whether you want to catch it later
         // For now, just log it and let the existing catch block handle response
         // But this log is vital!
         throw saveError; // Re-throw to be caught by the main try/catch
        // --- END LOGGING ---
      }
      // Populate products for the response after saving
      // Use the same population as in getCart for consistency
      await cart.populate({
        path: 'items.product',
        foreignField: '_original_id', // Use the correct foreignField here too for the response!
        select: 'title slug images price pricing *id productId *original_id metadata.inStock' // Match getCart populate
      });
      return sendResponse(res, true, 'Item added to cart successfully', cart);
    } catch (error) { // Main catch block
      console.error('Add to cart error:', error); // This will now catch save errors too
      // Handle Mongoose validation errors specifically
      if (error.name === 'ValidationError') {
        // ... (existing validation error handling) ...
         console.error('Validation errors:', JSON.stringify(validationErrors));
         return sendResponse(res, false, 'Validation failed', null, 400, validationErrors);
      }
      // ... (existing CastError handling) ...
      // General error (could be the re-thrown saveError)
      return sendResponse(res, false, 'Failed to add item to cart', null, 500, error);
    }
  }

  // Update cart item quantity
  async updateCartItem(req, res) {
    try {
      const userId = req.user._id;
      const { itemId } = req.params; // ID of the cart item subdocument (_id)
      const { quantity } = req.body;

      if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
        return sendResponse(res, false, 'Valid Item ID (itemId) is required in URL parameters', null, 400);
      }
      // Use '==' to check for both null and undefined
      if (quantity == null) {
        return sendResponse(res, false, 'Quantity is required in request body', null, 400);
      }

      const numQuantity = parseInt(quantity, 10);
      // Allow 0 for removal, but not negative or NaN
      if (isNaN(numQuantity) || numQuantity < 0) {
        return sendResponse(res, false, 'Invalid quantity provided (must be 0 or greater)', null, 400);
      }

      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        // Should not happen if user is authenticated, but good practice
        return sendResponse(res, false, 'Cart not found', null, 404);
      }

      // Find the item *within the cart's items array* using its subdocument _id
      const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);

      if (itemIndex === -1) {
        return sendResponse(res, false, 'Item not found in cart', null, 404);
      }

      // Fetch the associated product to update the price if necessary
      const currentItem = cart.items[itemIndex];
      const product = await Product.findById(currentItem.product); // Find by the product reference ObjectId

      if (!product) {
          console.warn(`Product ${currentItem.product} for cart item ${itemId} not found during update. Removing item.`);
          cart.items.splice(itemIndex, 1); // Remove item if product doesn't exist anymore
      } else if (numQuantity === 0) {
        // Remove item explicitly if quantity is set to 0
        cart.items.splice(itemIndex, 1);
        console.log(`Removed item ${itemId} from cart ${cart._id} due to quantity 0.`);
      } else {
        // Update quantity and potentially the price from the source product
        const currentPrice = product.pricing?.salePrice ?? product.pricing?.mrp ?? product.price ?? 0;
        cart.items[itemIndex].quantity = numQuantity;
        cart.items[itemIndex].price = currentPrice; // Update price on quantity change
        cart.items[itemIndex].productName = product.title; // Keep name synced
        console.log(`Updated quantity for item ${itemId} in cart ${cart._id} to ${numQuantity}. Price updated to ${currentPrice}.`);
      }

      cart.markModified('items');
      await cart.save();

      // Repopulate for the response
      await cart.populate('items.product', 'title slug images price pricing _id productId _original_id metadata.inStock');

      return sendResponse(res, true, 'Cart updated successfully', cart);
    } catch (error) {
      console.error('Update cart item error:', error);
      if (error.name === 'ValidationError') {
         const validationErrors = Object.values(error.errors).map(el => ({ field: el.path, message: el.message }));
        return sendResponse(res, false, 'Validation failed', null, 400, validationErrors);
      }
       if (error.name === 'CastError') {
          console.error(`CastError: Path: ${error.path}, Value: ${JSON.stringify(error.value)}, Reason: ${error.reason?.message || error.message}`);
          return sendResponse(res, false, `Invalid data format for field: ${error.path}`, null, 400, error.message);
      }
      return sendResponse(res, false, 'Failed to update cart item', null, 500, error);
    }
  }

  // Remove item from cart
  async removeFromCart(req, res) {
    try {
      const userId = req.user._id;
      const { itemId } = req.params; // ID of the cart item subdocument

      if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
        return sendResponse(res, false, 'Valid Item ID (itemId) is required', null, 400);
      }

      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        return sendResponse(res, false, 'Cart not found', null, 404);
      }

      // Find the item index in the items array by its subdocument _id
      const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);

      if (itemIndex === -1) {
        // Item already removed or invalid ID for this cart
        return sendResponse(res, false, 'Item not found in cart', null, 404);
      }

      // Remove the item using splice
      cart.items.splice(itemIndex, 1);
      console.log(`Removed item ${itemId} from cart ${cart._id}.`);

      cart.markModified('items');
      await cart.save();

      // Repopulate for response
      await cart.populate('items.product', 'title slug images price pricing _id productId _original_id metadata.inStock');

      return sendResponse(res, true, 'Item removed from cart successfully', cart);
    } catch (error) {
      console.error('Remove from cart error:', error);
      // No specific validation expected here unless pre-hooks exist
      return sendResponse(res, false, 'Failed to remove item from cart', null, 500, error);
    }
  }

  // Validate cart (check for item availability, price changes, etc.)
  // Consider moving complex validation to a dedicated service
  async validateCart(req, res) {
    try {
      const userId = req.user._id;

      // Find user's cart with populated products AND select fields needed for validation
      const cart = await Cart.findOne({ user: userId })
                             .populate('items.product', 'title price pricing metadata.inStock status deleted'); // Add status/deleted

      if (!cart || cart.items.length === 0) {
        return sendResponse(res, true, 'Cart is valid (empty)', { valid: true, items: [] });
      }

      const validationIssues = [];
      let needsSave = false; // Flag if cart needs updating based on validation

      // Use Promise.all for potentially faster product checks if DB lookups were needed again
      // But populate should handle this. Iterate through populated items.
      for (let i = cart.items.length - 1; i >= 0; i--) { // Iterate backwards for safe removal
        const item = cart.items[i];
        const product = item.product; // Get the populated product data

        // Check 1: Product exists? (Populate should handle this, but double-check)
        if (!product) {
          validationIssues.push({
            itemId: item._id,
            productRef: item.product, // Log the reference that failed
            issue: 'product_not_found',
            message: `Product reference ${item.product} no longer exists. Item removed.`
          });
          cart.items.splice(i, 1); // Remove item with missing product
          needsSave = true;
          continue; // Skip further checks for this item
        }

        // Check 2: Product available? (Not deleted or inactive)
        if (product.deleted || (product.status && product.status !== 'active')) {
          validationIssues.push({
            itemId: item._id,
            productId: product._id,
            productTitle: product.title,
            issue: 'product_unavailable',
            message: `Product "${product.title}" is no longer available. Item removed.`
          });
          cart.items.splice(i, 1); // Remove unavailable item
          needsSave = true;
          continue;
        }

        // Check 3: Price changed?
        const currentPrice = product.pricing?.salePrice ?? product.pricing?.mrp ?? product.price ?? 0;
        if (currentPrice !== item.price) {
          validationIssues.push({
            itemId: item._id,
            productId: product._id,
            productTitle: product.title,
            issue: 'price_changed',
            message: `Price for "${product.title}" changed. Updated in cart.`,
            oldPrice: item.price,
            newPrice: currentPrice
          });
          item.price = currentPrice; // Update the price in the cart item
          needsSave = true;
        }

        // Check 4: Stock sufficient? (Handle potential null/undefined stock)
        const availableStock = product.metadata?.inStock; // Assuming this path is correct
        if (availableStock !== undefined && availableStock !== null && availableStock < item.quantity) {
            if(availableStock <= 0) {
                 validationIssues.push({
                    itemId: item._id,
                    productId: product._id,
                    productTitle: product.title,
                    issue: 'out_of_stock',
                    message: `Product "${product.title}" is out of stock. Item removed.`,
                    requested: item.quantity,
                    available: 0
                });
                cart.items.splice(i, 1); // Remove out-of-stock item
            } else {
                 validationIssues.push({
                    itemId: item._id,
                    productId: product._id,
                    productTitle: product.title,
                    issue: 'insufficient_stock',
                    message: `Quantity for "${product.title}" reduced to available stock.`,
                    requested: item.quantity,
                    available: availableStock
                });
                item.quantity = availableStock; // Adjust quantity to available stock
            }
            needsSave = true;
        }
      }

      // Save the cart if any items were removed or updated during validation
      if (needsSave) {
        console.log(`Cart ${cart._id} modified during validation. Saving changes.`);
        cart.markModified('items');
        await cart.save();
        // Repopulate the modified cart for the response
        await cart.populate('items.product', 'title slug images price pricing _id productId _original_id metadata.inStock');
      }

      // Return validation results
      if (validationIssues.length > 0) {
        // Return 200 OK but indicate issues found
        return sendResponse(res, true, 'Cart validated with issues', {
          valid: false,
          issues: validationIssues,
          updatedCart: cart // Send the updated cart state
        }, 200);
      }

      // If no issues, cart is valid
      return sendResponse(res, true, 'Cart is valid', { valid: true, updatedCart: cart });

    } catch (error) {
      console.error('Cart validation error:', error);
      return sendResponse(res, false, 'Failed to validate cart', null, 500, error);
    }
  }

  // Clear cart
  async clearCart(req, res) {
    try {
      const userId = req.user._id;

      // Find and update in one step for efficiency
      const result = await Cart.findOneAndUpdate(
        { user: userId },
        { $set: { items: [], couponCode: null, discount: 0 } }, // Clear items and any discounts
        { new: true } // Return the updated document (which will have empty items)
      );

      if (!result) {
        // If no cart existed, it's already effectively clear
        console.log(`No cart found for user ${userId} to clear.`);
        return sendResponse(res, true, 'Cart is already empty', { items: [], total: 0, user: userId });
      }

      console.log(`Cleared all items from cart ${result._id}.`);

      // Return the empty cart structure
      return sendResponse(res, true, 'Cart cleared successfully', result); // Return the cleared cart object

    } catch (error) {
      console.error('Clear cart error:', error);
      return sendResponse(res, false, 'Failed to clear cart', null, 500, error);
    }
  }
}

module.exports = new CartController();
