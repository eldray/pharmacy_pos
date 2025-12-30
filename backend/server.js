// backend/server.js - CORRECTED VERSION
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { sequelize } = require('./database');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Determine database path
let dbPath = process.env.DB_PATH || './pharmacy-pos.db';

// In Electron packaged app, use app data directory
if (process.env.ELECTRON) {
  const userDataPath = require('electron')?.app?.getPath('userData') || process.cwd();
  const dbDir = path.join(userDataPath, 'database');  // FIXED: userDataPath, not userDataData
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  dbPath = path.join(dbDir, 'pharmacy-pos.db');
  console.log('Electron mode - Database path:', dbPath);
}

// Update sequelize config with correct path
// This line might not be needed anymore since database.js handles it
// sequelize.options.storage = dbPath;

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// ==================== API ROUTES ====================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/company', require('./routes/company'));
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/purchase-orders', require('./routes/purchaseOrders'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/inventory', require('./routes/inventory'));

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'pharmacy-pos-backend',
    version: process.env.APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    electron: !!process.env.ELECTRON,
    database: sequelize.options.storage,
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// ==================== ERROR HANDLING ====================
app.use((req, res, next) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    path: req.url 
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// ==================== DATABASE INITIALIZATION ====================
const checkAndSeedDatabase = async () => {
  try {
    console.log('Initializing database...');
    
    // Sync models
    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized');
    
    // Check if we need to seed
    const User = require('./models/User');
    const userCount = await User.count();
    
    if (userCount === 0) {
      console.log('Database is empty. Seeding...');
      const seedDatabase = require('./seed');
      await seedDatabase();
      console.log('✅ Database seeded successfully');
    } else {
      console.log(`✅ Database already has ${userCount} user(s)`);
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    // Don't crash - just log the error
  }
};

// ==================== START SERVER ====================
const startServer = async () => {
  try {
    // Initialize database
    await checkAndSeedDatabase();
    
    // Start server
    app.listen(PORT, '127.0.0.1', () => {
      console.log(`✅ Server running on http://127.0.0.1:${PORT}`);
      console.log(`📁 Database: ${sequelize.options.storage}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⚡ Electron: ${process.env.ELECTRON ? 'Yes' : 'No'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing database connection...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Closing database connection...');
  await sequelize.close();
  process.exit(0);
});

// Start the server
startServer().catch(console.error);

module.exports = app;