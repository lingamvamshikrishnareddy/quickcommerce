const { MongoClient } = require('mongodb');

// Connection URI
const uri = "mongodb://localhost:27017"; // Replace with your MongoDB URI if different
const client = new MongoClient(uri);

async function getCategoriesAndSubCategories() {
  try {
    await client.connect(); // Connect to the MongoDB client
    const database = client.db('quick-commerce'); // Replace with your database name
    const products = database.collection('products'); // Replace with your collection name

    // Aggregation query to get categories and their subcategories
    const categories = await products.aggregate([
      {
        $group: {
          _id: "$category",
          subCategories: { $addToSet: "$subCategory" }
        }
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          subCategories: 1
        }
      }
    ]).toArray();

    // Output the categories and subcategories to the terminal
    categories.forEach(category => {
      console.log(`Category: ${category.category}`);
      console.log("Subcategories:", category.subCategories.join(", "));
      console.log("------------------------------");
    });
    
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  } finally {
    await client.close(); // Close the connection to MongoDB
  }
}

getCategoriesAndSubCategories();
