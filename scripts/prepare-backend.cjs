// scripts/prepare-backend.cjs
//
// Stages a clean copy of the backend at build-staging/backend for electron-builder.
//
// Why not bundle ./backend directly?
//   - it would ship dev-only node_modules (nodemon, ...)
//   - it would ship backend/.env (real DB password + secrets) and uploads/backups
//   - running `npm ci --omit=dev` inside ./backend would strip nodemon from the
//     developer's own working copy
//
// Usage: node scripts/prepare-backend.cjs   (also run by the build:* npm scripts)

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'backend');
const dest = path.join(root, 'build-staging', 'backend');

const EXCLUDE_TOP_LEVEL = new Set([
  'node_modules',
  'uploads',
  'backups',
  '.render',
  '.gitignore',
]);

function shouldCopy(srcPath) {
  const rel = path.relative(src, srcPath);
  if (rel === '') return true;
  const top = rel.split(path.sep)[0];
  if (EXCLUDE_TOP_LEVEL.has(top)) return false;
  const base = path.basename(srcPath);
  if (base === '.env' || base.startsWith('.env.')) return false;
  if (base.endsWith('.log')) return false;
  return true;
}

console.log('Preparing backend for packaging...');
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true, filter: shouldCopy });

console.log('Installing production dependencies...');
execSync('npm ci --omit=dev --no-audit --no-fund', { cwd: dest, stdio: 'inherit' });

for (const required of ['server.js', 'node_modules/express', 'node_modules/pg', 'node_modules/sequelize', 'data/products.json', 'data/lab-templates.json']) {
  if (!fs.existsSync(path.join(dest, required))) {
    console.error(`Staged backend is missing ${required}`);
    process.exit(1);
  }
}

console.log(`Backend staged at ${path.relative(root, dest)}`);
