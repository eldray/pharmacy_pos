const { Sequelize, DataTypes } = require('sequelize');

let sequelize;

// ✅ FIX 1: ONLY use DATABASE_URL if it ACTUALLY EXISTS as a string.
// The old code checked `NODE_ENV === 'production'`, but in Electron,
// NODE_ENV is 'production' even if you are connecting to a LOCAL database!
if (process.env.DATABASE_URL && typeof process.env.DATABASE_URL === 'string') {
  // Remote/Cloud PostgreSQL via connection string
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true'
        ? { require: true, rejectUnauthorized: false }
        : false
    },
    define: {
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      underscored: false
    },
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000
    }
  });
} else {
  // Local PostgreSQL (Electron app OR dev mode)
  sequelize = new Sequelize(
    process.env.DB_NAME || 'pharmacy_pos',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432'),
      dialect: 'postgres',
      // ✅ FIX 2: Silence SQL logs in Electron production mode
      logging: process.env.NODE_ENV === 'production' ? false : console.log,
      define: {
        timestamps: true,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        underscored: false
      },
      pool: {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000
      }
    }
  );
}

// ❌ REMOVED: sequelize.authenticate() 
// Why? Because server.js already calls `await sequelize.authenticate()`.
// Running it here at the bottom of the file causes race conditions 
// where models try to attach before the connection is fully verified.

module.exports = { sequelize, DataTypes };