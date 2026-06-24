// Dependency-free, in-memory rate limiter.
// Suitable for this single-process app (Electron / small server). For a
// multi-instance deployment, swap the Map for a shared store (e.g. Redis).
//
//   const { rateLimit } = require('./middleware/rateLimit');
//   app.use('/api', rateLimit({ windowMs: 15*60*1000, max: 300 }));
//   router.post('/login', rateLimit({ windowMs: 15*60*1000, max: 10 }), handler);

function rateLimit({
  windowMs = 15 * 60 * 1000, // 15 minutes
  max = 100,                 // requests per window per key
  message = 'Too many requests, please try again later.',
  keyGenerator = (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
} = {}) {
  // key -> { count, resetAt }
  const hits = new Map();

  // Periodically drop expired buckets so the Map doesn't grow unbounded.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, rec] of hits) {
      if (rec.resetAt <= now) hits.delete(key);
    }
  }, windowMs);
  if (sweep.unref) sweep.unref(); // don't keep the process alive

  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    const key = keyGenerator(req);
    let rec = hits.get(key);

    if (!rec || rec.resetAt <= now) {
      rec = { count: 0, resetAt: now + windowMs };
      hits.set(key, rec);
    }

    rec.count += 1;
    const remaining = Math.max(0, max - rec.count);

    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', Math.ceil((rec.resetAt - now) / 1000));

    if (rec.count > max) {
      const retryAfter = Math.ceil((rec.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({ success: false, message, retryAfter });
    }

    next();
  };
}

module.exports = { rateLimit };
