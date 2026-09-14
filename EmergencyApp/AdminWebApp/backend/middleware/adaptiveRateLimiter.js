// middleware/adaptiveRateLimiter.js
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

  middleware(keyGenerator = null) {
    return (req, res, next) => {
      // Default key strategy: User ID -> Phone -> Device Header -> IP
      const key = keyGenerator
        ? keyGenerator(req)
        : req.user?._id?.toString() ||
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
  15,        // 15 SOS alerts per minute per user/device
  'Too many emergency alerts sent from this device. Please wait a moment.'
);

const generalApiLimiter = new SlidingWindowLimiter(
  15 * 60 * 1000, // 15 minutes window
  500,            // 500 requests per 15 min per IP/User
  'Too many requests. Please slow down.'
);

const authLimiter = new SlidingWindowLimiter(
  15 * 60 * 1000, // 15 minutes
  15,             // 15 attempts
  'Too many authentication attempts. Please try again in 15 minutes.'
);

module.exports = {
  SlidingWindowLimiter,
  alertLimiter: alertLimiter.middleware(),
  generalApiLimiter: generalApiLimiter.middleware(),
  authLimiter: authLimiter.middleware(req => req.body?.email || req.ip),
};
