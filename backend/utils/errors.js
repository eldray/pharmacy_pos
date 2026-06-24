// Standardized error helpers.
//
// All API errors converge on the shape:  { success: false, message, code? }
// (with `error` details added only in development).

// Throwable app error carrying an HTTP status + optional machine code.
class AppError extends Error {
  constructor(message, status = 400, code) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

// Wrap an async route handler so thrown/rejected errors flow to the
// centralized error middleware instead of crashing / hanging the request.
//   router.get('/', asyncHandler(async (req, res) => { ... }))
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Express error-handling middleware (must be registered last).
function errorHandler(err, req, res, next) {
  // Map common Sequelize validation errors to 400 with a useful message.
  let status = err.status || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    status = 400;
    message = err.errors?.map((e) => e.message).join(', ') || message;
  }

  if (status >= 500) {
    console.error('Server error:', err.stack || err);
    // Don't leak internal details in production.
    if (process.env.NODE_ENV !== 'development') message = 'Internal server error';
  }

  res.status(status).json({
    success: false,
    message,
    ...(err.code && { code: err.code }),
    ...(process.env.NODE_ENV === 'development' && status >= 500 && { error: err.message }),
  });
}

module.exports = { AppError, asyncHandler, errorHandler };
