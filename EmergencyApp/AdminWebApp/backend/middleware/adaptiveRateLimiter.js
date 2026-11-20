// middleware/adaptiveRateLimiter.js
const jwt = require('jsonwebtoken');

/**
 * Adaptive Rate Limiter designed for Disaster & Mobile Environments.
 * Accounts for Carrier-Grade NAT (CGNAT) where hundreds of mobile devices share a single cell-tower IP.
 */
class SlidingWindowLimiter {
  constructor(windowMs = 60000, maxRequests = 15, message = 'Rate limit exceeded.') {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.message = message;
    this.hits = new Map();

    // Periodic sweep every minute
    this.sweepInterval = setInterval(() => this.sweep(), 60000);
    if (this.sweepInterval.unref) {
      this.sweepInterval.unref();
    }
  }

  _extractTokenUserId(req) {
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const rawToken = authHeader.split(' ')[1];
    if (!rawToken || rawToken === 'null' || rawToken === 'undefined') return null;
    try {
      const decoded = jwt.decode(rawToken);
      return decoded?.id ? String(decoded.id) : (decoded?._id ? String(decoded._id) : null);
    } catch (_) {
      return null;
    }
  }

  middleware(keyGenerator = null) {
    return (req, res, next) => {
      // Default key strategy: JWT User ID -> req.user -> Body User/Phone -> Device Header -> IP
      const key = keyGenerator
        ? keyGenerator(req)
        : req.user?.id?.toString() ||
          req.user?._id?.toString() ||
          this._extractTokenUserId(req) ||
          req.body?.userId ||
          req.body?.userPhone ||
          req.body?.senderPhone ||
          req.headers['x-device-id'] ||
          req.ip;

      const now = Date.now();
      let timestamps = this.hits.get(key) || [];

      // Filter out timestamps older than window
      timestamps = timestamps.filter(t => now - t < this.windowMs);

      if (timestamps.length >= this.maxRequests) {
        console.warn(`🛑 [RateLimiter] Throttled client key: ${key} (${timestamps.length} requests in ${this.windowMs / 1000}s)`);
        return res.status(429).json({
          success: false,
          error: 'TOO_MANY_REQUESTS',
          message: this.message,
          retryAfterSeconds: Math.ceil((timestamps[0] + this.windowMs - now) / 1000)
        });
      }

      timestamps.push(now);
      this.hits.set(key, timestamps);
      next();
    };
  }

  sweep() {
    const now = Date.now();
    for (const [key, timestamps] of this.hits.entries()) {
      const valid = timestamps.filter(t => now - t < this.windowMs);
      if (valid.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, valid);
      }
    }
  }
}

// Pre-configured rate limiters
const alertLimiter = new SlidingWindowLimiter(
  60 * 1000, // 1 minute window
  30,        // 30 SOS alerts per minute per user/device (supports stress testing & emergency bursts)
  'Too many emergency alerts sent from this device. Please wait a moment.'
);

const generalApiLimiter = new SlidingWindowLimiter(
  15 * 60 * 1000, // 15 minutes window
  3000,           // 3000 requests per 15 min per User/IP (supports dashboard polling + live tracking)
  'Too many requests. Please slow down.'
);

const authLimiter = new SlidingWindowLimiter(
  15 * 60 * 1000, // 15 minutes
  60,             // 60 attempts per 15 minutes
  'Too many authentication attempts. Please try again in 15 minutes.'
);

module.exports = {
  SlidingWindowLimiter,
  alertLimiter: alertLimiter.middleware(),
  generalApiLimiter: generalApiLimiter.middleware(),
  authLimiter: authLimiter.middleware(req => {
    return (
      (req.body?.email && String(req.body.email).trim().toLowerCase()) ||
      (req.body?.username && String(req.body.username).trim()) ||
      (req.body?.identifier && String(req.body.identifier).trim()) ||
      (req.body?.phone && String(req.body.phone).trim()) ||
      req.ip
    );
  }),
};
