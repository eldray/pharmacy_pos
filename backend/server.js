// server.js (FIXED VERSION)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==================== MIDDLEWARE ====================
// CORS configuration
app.use(cors({
  origin: [
    "http://localhost:3000", 
    "http://127.0.0.1:3000",
    "https://pharmacy-pos-sg91.onrender.com",
    "http://localhost:5000"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));

// ==================== API ROUTES ====================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/company', require('./routes/company'));
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/purchase-orders', require('./routes/purchaseOrders'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/inventory', require('./routes/inventory'));

// ==================== STATIC FILE SERVING ====================
const frontendPath = path.join(__dirname, '../frontend/dist');

if (fs.existsSync(frontendPath)) {
  console.log('✅ Frontend build found at:', frontendPath);
  app.use(express.static(frontendPath));
  
  // FIX: Use regex literal, not string with regex
  app.get(/.*/, (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ 
        error: 'API endpoint not found',
        path: req.path 
      });
    }
    // Serve frontend
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  console.log('⚠️  Frontend build not found at:', frontendPath);
  
  app.get(/.*/, (req, res) => {
    res.json({
      message: 'Pharmacy POS Backend API',
      status: 'running',
      note: 'Frontend not built. Run: npm run build:frontend',
      api_endpoints: [
        '/api/auth/login',
        '/api/auth/me',
        '/api/company',
        '/api/users',
        '/api/products',
        '/api/suppliers',
        '/api/purchase-orders',
        '/api/transactions',
        '/api/inventory'
      ]
    });
  });
}

// ==================== DATABASE SEEDING ====================
const checkAndSeedDatabase = async () => {
  try {
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      console.log('Database is empty. Running seed.js...');
      const seedPath = path.join(__dirname, 'seed.js');
      if (fs.existsSync(seedPath)) {
        const seedDatabase = require(seedPath);
        await seedDatabase();
        console.log('✅ Database seeded successfully');
      }
    } else {
      console.log(`✅ Database already has ${userCount} user(s)`);
    }
  } catch (error) {
    console.error('Seeding failed:', error);
  }
};

// ==================== MONGODB CONNECTION ====================
const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://admin:Pem086p%40r@cluster0.d3yngri.mongodb.net/pharmacy_inventory?appName=Cluster0';

console.log('Connecting to MongoDB Atlas...');

mongoose.connect(MONGODB_URI)
.then(async () => {
  console.log('✅ MongoDB Atlas connected successfully!');
  await checkAndSeedDatabase();
})
.catch((err) => {
  console.error('❌ MongoDB connection failed:', err.message);
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});