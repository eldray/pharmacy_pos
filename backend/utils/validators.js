// Shared server-side validators.

// Password policy: at least 8 chars, with an uppercase letter, a lowercase
// letter, and a digit. Returns an error string, or null if valid.
function validatePassword(password) {
  if (!password || typeof password !== 'string') return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain a number';
  return null;
}

// Basic email shape check. Returns an error string, or null if valid.
function validateEmail(email) {
  if (!email || typeof email !== 'string') return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
  return null;
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

module.exports = { validatePassword, validateEmail, normalizePaymentMethod, pick, PAYMENT_METHODS };
