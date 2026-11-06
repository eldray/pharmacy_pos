// backend/tests/routes.test.js — regression guard for the class of bug that only
// shows up at runtime: `const { isClientError } = require('../utils/errors')` where
// the helper was never exported. require() does not throw on a missing named export,
// so the first customer request that hits it dies with "is not a function".
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const ROUTES_DIR = path.join(ROOT, 'routes');
const SCANNED_DIRS = ['routes', 'utils', 'middleware', 'models', 'config'];

// `[^{}]*` keeps the match inside a single destructuring pattern instead of
// running over the statements between two requires.
const DESTRUCTURED_REQUIRE = /(?:const|let|var)\s*\{([^{}]*)\}\s*=\s*require\(\s*['"](\.[^'"]*)['"]\s*\)/g;

function jsFiles(dir) {
  return fs
    .readdirSync(path.join(ROOT, dir))
    .filter((f) => f.endsWith('.js'))
    .map((f) => ({ dir, file: f, abs: path.join(ROOT, dir, f) }));
}

function namedImports(source) {
  // Doc comments carry usage examples like `require('./middleware/rateLimit')`.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const found = [];
  for (const match of code.matchAll(DESTRUCTURED_REQUIRE)) {
    const module = match[2];
    const names = match[1]
      .split(',')
      .map((entry) => entry.trim().split(':').pop().trim())
      .filter((name) => name && !name.startsWith('//'));
    found.push({ module, names });
  }
  return found;
}

test('every route file loads and exports an Express router', () => {
  for (const { file, abs } of jsFiles('routes')) {
    const router = require(abs);
    assert.equal(typeof router, 'function', `${file} must export middleware`);
    assert.equal(typeof router.handle, 'function', `${file} must export an Express router`);
  }
});

test('every route file is mounted by server.js', () => {
  const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  for (const { file } of jsFiles('routes')) {
    assert.ok(server.includes(`./routes/${file.replace(/\.js$/, '')}`), `${file} is dead code — not mounted in server.js`);
  }
});

test('no backend module imports a name its dependency does not export', () => {
  for (const dir of SCANNED_DIRS) {
    for (const { file, abs } of jsFiles(dir)) {
      const source = fs.readFileSync(abs, 'utf8');
      for (const { module, names } of namedImports(source)) {
        let target;
        try {
          target = require(path.join(ROOT, dir, module));
        } catch (err) {
          assert.fail(`${dir}/${file} cannot resolve require('${module}'): ${err.message}`);
        }
        for (const name of names) {
          assert.notEqual(
            target[name],
            undefined,
            `${dir}/${file} imports { ${name} } from '${module}', which does not export it`
          );
        }
      }
    }
  }
});

test('the money and error helpers routes depend on are real functions', () => {
  const errors = require('../utils/errors');
  for (const name of ['AppError', 'isClientError', 'clientMessage']) {
    assert.equal(typeof errors[name], 'function', `utils/errors is missing ${name}`);
  }

  const pricing = require('../utils/pricing');
  for (const name of ['unitPriceOf', 'priceCartItems', 'priceLabTests', 'resolveInsurance']) {
    assert.equal(typeof pricing[name], 'function', `utils/pricing is missing ${name}`);
  }

  const stock = require('../utils/stock');
  assert.ok(Object.keys(stock).length > 0, 'utils/stock exports nothing');

  const { labTestFieldsFor, RESULT_FIELDS } = require('../utils/editableFields');
  assert.equal(typeof labTestFieldsFor, 'function');
  assert.ok(RESULT_FIELDS.includes('results'), 'RESULT_FIELDS lost the field the lab form writes');
});
