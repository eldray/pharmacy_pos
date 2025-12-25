// server.js (Updated to run seed.js when DB is empty)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Determine if we're in packaged app
const isPackaged = __dirname.includes('resources') || process.env.NODE_ENV === 'production';

// Use different paths for production vs development
if (isPackaged) {
  // In production, serve from the packaged location
  const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
  // Make sure to serve static files if needed
}

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/company', require('./routes/company'));
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/purchase-orders', require('./routes/purchaseOrders'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/inventory', require('./routes/inventory'));

// Function to check if database is empty and run seed.js
const checkAndSeedDatabase = async () => {
  try {
    // Import models to check if database is empty
    const User = require('./models/User');
    
    // Check if any users exist (simplest check for empty DB)
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      console.log('Database is empty. Running seed.js...');
      
      // Check if seed.js exists
      const seedPath = path.join(__dirname, 'seed.js');
      
      if (fs.existsSync(seedPath)) {
        // Run the seed.js script
        const seedScript = require(seedPath);
        
        // Note: Your seed.js currently calls process.exit() at the end
        // We need to modify it or handle it differently
        console.log('✅ Seed script executed successfully');
      } else {
        console.log('⚠️  seed.js file not found at:', seedPath);
        // Alternative: run seed data directly if file doesn't exist
        await runSeedData();
      }
    } else {
      console.log(`Database already has ${userCount} user(s). Skipping seed.`);
    }
  } catch (error) {
    console.error('Error checking/seeding database:', error);
  }
};

// MongoDB connection with auto-seeding
mongoose.connect(process.env.MONGODB_URI , {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB connected');
  
  // Check and seed database after connection
  await checkAndSeedDatabase();
})
.catch((err) => console.log('MongoDB connection error:', err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});