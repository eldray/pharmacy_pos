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

// Middleware - UPDATE THIS
app.use(cors({
  origin: [
    "http://localhost:3000", 
    "http://127.0.0.1:3000",
    "https://pharmacy-pos-sg91.onrender.com",  // ADD YOUR RENDER URL
    "http://localhost:5000"  // For local development
  ],
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
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      console.log('Database is empty. Running seed.js...');
      
      const seedPath = path.join(__dirname, 'seed.js');
      if (fs.existsSync(seedPath)) {
        const seedDatabase = require(seedPath);
        await seedDatabase();  // <-- This executes the seed
        console.log('\u2705 Database seeded successfully');
      } else {
        console.log('\u26a0\ufe0f  seed.js file not found');
      }
    } else {
      console.log(`Database already has ${userCount} user(s).`);
    }
  } catch (error) {
    console.error('Seeding failed:', error);
  }
};

// MongoDB connection with auto-seeding
const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://admin:Pem086p%40r@cluster0.d3yngri.mongodb.net/pharmacy_inventory?appName=Cluster0';

console.log('Connecting to MongoDB Atlas...');
console.log('Database: pharmacy_inventory');
console.log('Cluster: Cluster0');

mongoose.connect(MONGODB_URI)
.then(async () => {
  console.log('✅ MongoDB Atlas connected successfully!');
  console.log('Database:', mongoose.connection.name);
  
  // Check and seed database after connection
  await checkAndSeedDatabase();
})
.catch((err) => {
  console.error('❌ MongoDB connection failed:', err.message);
  
  // Try without database name first (connect to admin)
  console.log('\nTrying to connect without specific database...');
  const baseURI = 'mongodb+srv://admin:Pem086p%40r@cluster0.d3yngri.mongodb.net/?appName=Cluster0';
  
  mongoose.connect(baseURI)
    .then(async () => {
      console.log('✅ Connected to cluster!');
      
      // List available databases
      const adminDb = mongoose.connection.db.admin();
      const dbInfo = await adminDb.listDatabases();
      console.log('Available databases:');
      dbInfo.databases.forEach(db => {
        console.log(`  - ${db.name} (${db.sizeOnDisk} bytes)`);
      });
      
      // Check if pharmacy_inventory exists
      const dbNames = dbInfo.databases.map(d => d.name);
      if (dbNames.includes('pharmacy_inventory')) {
        console.log('✅ pharmacy_inventory database exists!');
      } else {
        console.log('⚠️  pharmacy_inventory database not found.');
        console.log('Creating it now...');
        // It will be created automatically when you use it
      }
      
      mongoose.disconnect();
    })
    .catch(err2 => {
      console.error('❌ Base connection failed:', err2.message);
    });
});

// Serve frontend if built
const frontendPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));

  app.get(/.*/, (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});
}


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});