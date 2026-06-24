// backend/backup-db.js
// Creates a timestamped pg_dump of the database into ./backups.
//
// Usage:
//   node backup-db.js                 -> backups/pharmacy_pos-YYYYMMDD-HHMMSS.dump
//   node backup-db.js /custom/dir     -> writes into a custom directory
//   npm run backup
//
// Restore (custom format, from the backend folder):
//   createdb -U postgres pharmacy_pos_restore
//   pg_restore -U postgres -d pharmacy_pos_restore backups/<file>.dump
//
// Requires the PostgreSQL client tools (pg_dump) to be installed and on PATH.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Resolve the pg_dump executable. Prefers PATH, then a PG_BIN env override,
// then common install locations (Windows / macOS / Linux). This lets backups
// work even when the PostgreSQL client tools aren't on PATH.
function resolvePgDump() {
  const exe = process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump';
  const candidates = [];
  if (process.env.PG_BIN) candidates.push(path.join(process.env.PG_BIN, exe));

  if (process.platform === 'win32') {
    for (const base of ['C:/Program Files/PostgreSQL', 'C:/Program Files (x86)/PostgreSQL']) {
      if (fs.existsSync(base)) {
        // Newest major version first (e.g. 16 before 15).
        fs.readdirSync(base)
          .sort((a, b) => parseInt(b) - parseInt(a))
          .forEach((v) => candidates.push(path.join(base, v, 'bin', exe)));
      }
    }
  } else {
    candidates.push('/usr/bin/pg_dump', '/usr/local/bin/pg_dump', '/opt/homebrew/bin/pg_dump');
  }

  const found = candidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } });
  return found || 'pg_dump'; // fall back to PATH lookup
}

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || '5432',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'pharmacy_pos',
};

const outDir = process.argv[2] || path.join(__dirname, 'backups');
fs.mkdirSync(outDir, { recursive: true });

// Timestamp: YYYYMMDD-HHMMSS (filesystem-safe)
const ts = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
const outFile = path.join(outDir, `${config.database}-${ts}.dump`);

// -F c = custom compressed format (restore with pg_restore)
const args = [
  '-h', config.host,
  '-p', String(config.port),
  '-U', config.user,
  '-F', 'c',
  '-f', outFile,
  config.database,
];

const pgDump = resolvePgDump();
console.log(`💾 Backing up "${config.database}" -> ${outFile}`);
console.log(`   using: ${pgDump}`);

const child = spawn(pgDump, args, {
  env: { ...process.env, PGPASSWORD: config.password },
  stdio: ['ignore', 'inherit', 'inherit'],
});

child.on('error', (err) => {
  if (err.code === 'ENOENT') {
    console.error('❌ pg_dump not found. Install the PostgreSQL client tools, or set PG_BIN to the folder containing pg_dump (e.g. PG_BIN="C:/Program Files/PostgreSQL/16/bin").');
  } else {
    console.error('❌ Backup failed:', err.message);
  }
  process.exit(1);
});

child.on('close', (code) => {
  if (code === 0) {
    const size = (fs.statSync(outFile).size / 1024).toFixed(1);
    console.log(`✅ Backup complete (${size} KB): ${outFile}`);
    process.exit(0);
  } else {
    console.error(`❌ pg_dump exited with code ${code}`);
    process.exit(code || 1);
  }
});
