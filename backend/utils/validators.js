// Shared server-side validators.

// Password policy: at least 8 chars, with an uppercase letter, a lowercase
// letter, and a digit. Returns an error string, or null if valid.
// Every demo password fails this policy already; a database seeded before the
// policy existed is caught at login instead (routes/auth.js).
function validatePassword(password) {
  if (!password || typeof password !== 'string') return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain a number';
  return null;
}

// Usernames are what staff type at the till, so they are stored in one shape
// (lowercase, no surrounding space) and looked up the same way. Returns an
// error string, or null if valid.
function normalizeUsername(value) {
  if (value == null) return '';
  return String(value).trim().toLowerCase();
}

function validateUsername(value) {
  const username = normalizeUsername(value);
  if (!username) return 'Username is required';
  if (username.length < 3) return 'Username must be at least 3 characters long';
  if (username.length > 30) return 'Username must be 30 characters or fewer';
  if (!/^[a-z0-9._-]+$/.test(username)) {
    return 'Username may only contain letters, numbers, dots, hyphens and underscores';
  }
  if (!/^[a-z0-9]/.test(username) || !/[a-z0-9]$/.test(username)) {
    return 'Username must start and end with a letter or number';
  }
  return null;
}

/**
 * A login name for an account that predates usernames, or for a caller that did
 * not supply one. Always returns something valid so a backfill cannot leave a
 * row that can never sign in; callers must still resolve collisions.
 */
function usernameFromEmail(email, fallback = 'user') {
  const source = String(email || '').split('@')[0] || fallback;
  let slug = source.toLowerCase().replace(/[^a-z0-9._-]+/g, '').replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
  if (!slug) slug = normalizeUsername(fallback).replace(/[^a-z0-9._-]+/g, '') || 'user';
  slug = slug.slice(0, 30).replace(/[^a-z0-9]+$/, '');
  while (slug.length < 3) slug += '0';
  return slug;
}

// Basic email shape check. Returns an error string, or null if valid.
function validateEmail(email) {
  if (!email || typeof email !== 'string') return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
  return null;
}

// Email is contact details, not a credential — staff sign in with a username.
// Blank is fine; anything typed still has to be an address.
function validateOptionalEmail(email) {
  if (email == null || String(email).trim() === '') return null;
  return validateEmail(String(email).trim());
}

// Payment methods arrive as 'Cash', 'cash' or 'MTN' depending on which client
// made the sale, and the reports group on this column — so store one form.
// Unknown values keep their own spelling (lowercased) rather than being dropped.
const PAYMENT_METHODS = ['cash', 'card', 'mtn', 'vodafone', 'airteltigo', 'insurance', 'refund'];
function normalizePaymentMethod(value) {
  if (value == null) return null;
  const collapsed = String(value).trim().toLowerCase().replace(/[\s_-]+/g, '');
  return PAYMENT_METHODS.includes(collapsed) ? collapsed : String(value).trim().toLowerCase();
}

// Field allow-list for PUT/PATCH handlers: `{ ...req.body }` lets a client
// rewrite protected columns (price, status, ids), so copy only known fields.
function pick(source = {}, allowedKeys = []) {
  const out = {};
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) out[key] = source[key];
  }
  return out;
}

module.exports = {
  validatePassword, validateEmail, validateOptionalEmail,
  normalizeUsername, validateUsername, usernameFromEmail,
  normalizePaymentMethod, pick, PAYMENT_METHODS
};
