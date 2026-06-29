// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config();

// Warn about default JWT_SECRET in standalone production
if (process.env.NODE_ENV === 'production' && !process.env.ELECTRON) {
  if (process.env.JWT_SECRET === 'change-this-to-a-long-random-string-in-production') {
    console.warn('⚠️  WARNING: JWT_SECRET is the default value. Change it in .env!');
  }
}

const { sequelize } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: (origin, callback) => {
    // ✅ Electron file:// protocol
    if (!origin || origin === 'file://' || origin.startsWith('file://')) {
      return callback(null, true);
    }

    const allowed = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
      /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
      /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}(:\d+)?$/,
    ];
    const isAllowed = allowed.some(pattern =>
      typeof pattern === 'string' ? pattern === origin : pattern.test(origin)
    );
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked: ${origin}`);
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// ==================== HEALTH ====================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'pharmacy-pos-backend',
    version: process.env.APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    electron: !!process.env.ELECTRON,
    nodeEnv: process.env.NODE_ENV || 'development',
    database: 'PostgreSQL'
  });
});

app.get('/health', (req, res) => res.redirect('/api/health'));

// ==================== ROUTES ====================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/company', require('./routes/company'));
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/purchase-orders', require('./routes/purchaseOrders'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/lab-tests', require('./routes/labTests'));
app.use('/api/lab-transactions', require('./routes/labTransactions'));

// ==================== ERROR HANDLING ====================
// ==================== SERVE FRONTEND (ELECTRON) ====================
const path = require('path');

if (process.env.ELECTRON === 'true') {
  // In Electron packaged mode, serve the React static files
  // __dirname is `resources/backend`, so frontend is one folder up
  const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');

  app.use(express.static(frontendPath));

  // React Router fallback: serve index.html for any non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });

  console.log('🎨 Frontend static files enabled for Electron');
} else {
  // Standard API 404 handler for normal backend-only usage
  app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found', path: req.url });
  });
}

app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// ==================== DATABASE INITIALIZATION ====================
async function createDatabaseIfNotExists() {
  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'pharmacy_pos'
  };

  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log(`✅ Connected to PostgreSQL as ${config.user}`);

    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [config.database]
    );

    if (result.rows.length === 0) {
      console.log(`📦 Creating database "${config.database}"...`);
      await client.query(`CREATE DATABASE "${config.database}"`);
      console.log(`✅ Database "${config.database}" created successfully`);
    } else {
      console.log(`✅ Database "${config.database}" already exists`);
    }

    await client.end();
    return true;
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    return false;
  }
}

// ==================== START SERVER ====================
const startServer = async () => {
  try {
    console.log('🚀 Starting server...');
    console.log('Connecting to PostgreSQL...');

    // Step 1: Create database if it doesn't exist
    await createDatabaseIfNotExists();
    console.log('');

    // Step 2: Connect to the database
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected');

    // ✅ FIXED: Use sync() without alter for safety
    // Change to sync({ alter: true }) ONLY during active development
    await sequelize.sync();
    console.log('✅ Schema synchronised');

    // ✅ FIXED: Import from models/index.js to load associations
    const { User } = require('./models');
    const count = await User.count();
    if (count === 0) {
      console.log('Empty database — seeding...');
      const seed = require('./seed');
      await seed();
    } else {
      console.log(`✅ Database has ${count} user(s) — skipping seed`);
    }

    console.log('🎉 Database initialization complete!');
    console.log(`✅ Server ready on http://${HOST}:${PORT}`);

    app.listen(PORT, HOST, () => {
      console.log(`✅ Server running on http://${HOST}:${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⚡ Electron: ${process.env.ELECTRON ? 'Yes' : 'No'}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    console.error('\n💡 Troubleshooting tips:');
    console.error('1. Make sure PostgreSQL is running');
    console.error('2. Check your .env file credentials');
    console.error('3. Verify PostgreSQL host and port');
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`${signal} received — closing DB connection...`);
  await sequelize.close();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer().catch(console.error);

module.exports = app;