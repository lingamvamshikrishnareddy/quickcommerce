const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');
const fs = require('fs');
const path = require('path');

// MongoDB Connection
const MONGO_URI = 'mongodb://localhost:27017/quick-commerce';
mongoose.connect(MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Product Schema
const productSchema = new mongoose.Schema({
  title: String,
  price_discount: Number,
  price_original: Number,
  details: String,
  category: String,
  created_at: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and CSV files are allowed'));
    }
  }
});

// Express setup
const app = express();
app.use(express.json());
const THREAD_COUNT = Math.min(os.cpus().length, 12);

// Worker function to process data chunks
function processDataChunk(chunk) {
  return chunk.map(row => ({
    title: row['Title'] || row['Product Name'] || 'Unknown',
    price_discount: parseFloat((row['Price_discount'] || row['Discounted Price'] || '0').replace(/[₹,\s]/g, '')) || 0,
    price_original: parseFloat((row['Price_original'] || row['Original Price'] || '0').replace(/[₹,\s]/g, '')) || 0,
    details: row['Details'] || row['Description'] || '',
    category: row['Category'] || 'Uncategorized'
  }));
}

// File upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    let data;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    if (fileExtension === '.xlsx') {
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else if (fileExtension === '.csv') {
      const fileContent = fs.readFileSync(req.file.path, 'utf8');
      data = await new Promise((resolve, reject) => {
        xlsx.readFile(req.file.path, {
          raw: false,
          dateNF: 'yyyy-mm-dd'
        }, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      const workbook = xlsx.read(fileContent, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    }

    if (!data || data.length === 0) {
      return res.status(400).send('No data found in file.');
    }

    // Split data into chunks for parallel processing
    const chunkSize = Math.ceil(data.length / THREAD_COUNT);
    const chunks = Array(THREAD_COUNT).fill().map((_, index) => {
      const start = index * chunkSize;
      return data.slice(start, start + chunkSize);
    });

    console.log(`Processing ${data.length} records in ${chunks.length} chunks`);

    // Process chunks in parallel
    const workers = chunks.map((chunk, index) =>
      new Promise((resolve, reject) => {
        const worker = new Worker(__filename, {
          workerData: { chunk, index, MONGO_URI }
        });

        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker ${index + 1} stopped with exit code ${code}`));
          }
        });
      })
    );

    const results = await Promise.all(workers);
    console.log('Processing complete:', results);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      message: 'Data imported successfully',
      recordsProcessed: results.reduce((acc, result) => acc + parseInt(result.count), 0)
    });

  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({
      message: 'Error processing file',
      error: error.message
    });
  }
});

// Worker thread code
if (!isMainThread) {
  const { chunk, index, MONGO_URI } = workerData;

  mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(async () => {
    try {
      const formattedData = processDataChunk(chunk);
      const result = await Product.insertMany(formattedData);
      parentPort.postMessage({
        message: `Worker ${index + 1} completed`,
        count: result.length
      });
    } catch (error) {
      parentPort.postMessage({
        message: `Worker ${index + 1} error`,
        error: error.message
      });
    } finally {
      await mongoose.connection.close();
    }
  }).catch(error => {
    parentPort.postMessage({
      message: `Worker ${index + 1} database connection error`,
      error: error.message
    });
  });
}

// Get products endpoint
app.get('/products', async (req, res) => {
  try {
    const products = await Product.find({})
      .select('title price_discount price_original category')
      .limit(100);
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      message: 'Error fetching products',
      error: error.message
    });
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});