// Numeric route params.
//
// Every `/:id` in this API is a primary key, and `findByPk('undefined')` used
// to reach PostgreSQL, which answers `invalid input syntax for type integer`
// as a 500 — the response the UI shows when a stale client sends a missing id.
// Rejecting the shape here turns that whole class into a 400 before any query.

const NUMERIC_PARAMS = ['id', 'insId', 'testId', 'productId'];

function numericIdParams(router) {
  for (const name of NUMERIC_PARAMS) {
    router.param(name, (req, res, next, value) => {
      if (!/^\d{1,9}$/.test(String(value))) {
        return res.status(400).json({ success: false, message: `${name} must be a numeric id` });
      }
      req.params[name] = Number(value);
      next();
    });
  }
  return router;
}

module.exports = { numericIdParams, NUMERIC_PARAMS };
