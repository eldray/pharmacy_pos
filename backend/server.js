// backend/server.js
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config();

const { isProduction, isDemoSeedAllowed } = require('./utils/environment');

// The repository's placeholder secret is public, so any token could be forged.
// Refuse to boot in production; elsewhere swap in a random secret for this
// process (sessions then expire on restart instead of being guessable).
const PLACEHOLDER_JWT = 'change-this-to-a-long-random-string-in-production';
function enforceJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret !== PLACEHOLDER_JWT && secret.length >= 32) return;

  if (isProduction()) {
    console.error('❌ JWT_SECRET is missing, is the repository placeholder, or is shorter than 32 characters.');
    console.error('   Set a long random value in backend/.env (e.g. `node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"`).');
    process.exit(1);
  }
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️  JWT_SECRET was the placeholder — using a random secret for this process. Logins will not survive a restart.');
}
enforceJwtSecret();

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
      // This server's own origin. Module scripts send an `Origin` header even for
      // same-origin fetches, so omitting these makes `express.static` reject the
      // SPA's own bundle with a 500 whenever the backend runs on a non-default port.
      `http://localhost:${PORT}`,
      `http://127.0.0.1:${PORT}`,
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

// ==================== RATE LIMITING ====================
// General API limiter — generous enough for normal POS use, blocks abuse.
const { rateLimit } = require('./middleware/rateLimit');
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// ==================== HEALTH ====================
// Also the unauthenticated runtime-mode probe the SPA reads before it decides
// whether to offer the demo sign-ins or the marketing landing page.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'pharmacy-pos-backend',
    version: process.env.APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    electron: !!process.env.ELECTRON,
    nodeEnv: process.env.NODE_ENV || 'development',
    production: isProduction(),
    demoLogin: isDemoSeedAllowed(),
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
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/branches', require('./routes/branches'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/insurance', require('./routes/insurance'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/lab-service-orders', require('./routes/lab-service-orders'));
app.use('/api/backup', require('./routes/backup'));

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

// Centralized error handler — standardizes every error to { success, message }.
const { errorHandler } = require('./utils/errors');
app.use(errorHandler);

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

    // Step 2: Connect
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected');

    // Step 3: Run migrations FIRST — they own the schema.
    console.log('📦 Running database migrations...');
    const { migrate } = require('./migrate');
    const migrationResult = await migrate('up');
    console.log(
      migrationResult.applied > 0
        ? `✅ Applied ${migrationResult.applied} migration(s)`
        : '✅ Database schema is up to date'
    );

    // A model column with no migration behind it otherwise surfaces as a 500 on the
    // first sale that touches it. Fail here, naming the column.
    const { checkSchemaDrift } = require('./utils/checkSchema');
    await checkSchemaDrift();
    console.log('✅ Schema matches models');

    // Step 4: Seed ONLY if there are no users yet.
    //         Seed is idempotent, so this is a cheap safety check.
    const { User, Branch } = require('./models');
    const userCount = await User.count();
    if (userCount === 0) {
      console.log('🌱 Empty database — running seed...');
      const seed = require('./seed');
      await seed();
      console.log('✅ Seeding complete');
    } else {
      console.log(`✅ Database has ${userCount} user(s) — skipping seed (run \`npm run seed\` to top up catalogue/reference rows)`);
    }

    // An install seeded before the lab catalogue shipped by default has users but no
    // lab tests. Fill it in once; after that the pharmacy's own edits are left alone.
    const { LabTestTemplate } = require('./models');
    const { seedLabCatalogue, labCatalogueEnabled } = require('./seed');
    if (labCatalogueEnabled() && (await LabTestTemplate.count()) === 0) {
      console.log('🧪 No lab tests on file — loading the standard lab catalogue...');
      await seedLabCatalogue();
    }

    // Step 5: The home branch is structure, not seed data, so it is ensured even
    //         when the seed was skipped — an install that already has users may
    //         still have no branch to attribute a sale to.
    const mainBranch = await Branch.ensureMainBranch({ name: process.env.SEED_BRANCH_NAME || 'Main Branch' });
    console.log(`✅ Main branch: ${mainBranch.name} (${mainBranch.code})`);

    if (isProduction()) {
      const demoAccounts = await User.demoPasswordAccounts();
      if (demoAccounts.length) {
        console.warn(`⚠️  ${demoAccounts.length} account(s) still use a published demo password and cannot sign in:`);
        demoAccounts.forEach((u) => console.warn(`   - ${u.email} (${u.role})`));
        console.warn('   Reset each one in User Management, or re-seed into a fresh database.');
      }
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