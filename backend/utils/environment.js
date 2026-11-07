// backend/utils/environment.js
//
// One definition of "this is a live installation", shared by the seed, the API
// surface and the logs. NODE_ENV=production is what the packaged desktop app
// sets when it starts the backend, so a till shipped to a pharmacy is production
// while `npm run dev` is not.

function isProduction() {
  return (process.env.NODE_ENV || '').toLowerCase() === 'production';
}

/**
 * Demo data — the five sample logins, invented suppliers, randomised stock — is
 * for development only. SEED_DEMO=false turns it off in a development database
 * too, for a developer who wants a realistic empty till.
 */
function isDemoSeedAllowed() {
  return !isProduction() && process.env.SEED_DEMO !== 'false';
}

// The passwords printed on the sign-in screen and in every README. They are fine
// for a demo database and unacceptable on a live till, so production refuses them
// at login as well as never seeding them — a database carried over from a demo
// install must not stay sign-in-able with a published password.
const DEMO_PASSWORDS = new Set([
  'admin123', 'manager123', 'cashier123', 'pharmacist123', 'lab123',
]);

function isDemoPassword(password) {
  return typeof password === 'string' && DEMO_PASSWORDS.has(password);
}

module.exports = { isProduction, isDemoSeedAllowed, isDemoPassword, DEMO_PASSWORDS };
