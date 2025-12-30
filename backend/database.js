const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Get database path based on environment
let dbPath;

if (process.env.DB_PATH) {
  dbPath = process.env.DB_PATH;
} else if (process.env.ELECTRON) {
  const userDataPath = require('electron')?.app?.getPath('userData') || process.cwd();
  const dbDir = path.join(userDataPath, 'database');
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  dbPath = path.join(dbDir, 'pharmacy-pos.db');
} else {
  dbPath = path.join(__dirname, 'pharmacy-pos.db');
}

console.log('Database path:', dbPath);

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  // NO dialectModule line - Sequelize will use sqlite3 automatically
  define: {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    underscored: false
  },
  retry: {
    max: 5,
    match: [
      /SQLITE_BUSY/,
      /SQLITE_LOCKED/,
      /SQLITE_CONSTRAINT/
    ]
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Test connection
sequelize.authenticate()
  .then(() => {
    console.log('✅ SQLite connection established successfully');
  })
  .catch(err => {
    console.error('❌ Unable to connect to SQLite database:', err);
  });

module.exports = { sequelize, DataTypes };