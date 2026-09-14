// utils/cacheManager.js
/**
 * Lightweight, high-performance in-memory TTL Cache Manager.
 * Designed to absorb high-traffic read surges without database roundtrips.
 */
class MemoryCache {
  constructor(defaultTTLSeconds = 60) {
    this.cache = new Map();
    this.defaultTTL = defaultTTLSeconds * 1000;
    
    // Auto-cleanup expired keys every 30 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 30000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref(); // Prevent keeping Node process alive if exiting
    }
  }

  set(key, value, ttlSeconds = null) {
    const ttl = ttlSeconds != null ? ttlSeconds * 1000 : this.defaultTTL;
    const expiresAt = ttl > 0 ? Date.now() + ttl : null;
    this.cache.set(key, { value, expiresAt });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    this.cache.delete(key);
  }

  invalidatePrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Helper to get cached value or fetch fresh from async callback
   */
  async getOrSet(key, fetchFn, ttlSeconds = 60) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }
    const fresh = await fetchFn();
    if (fresh !== undefined && fresh !== null) {
      this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }
}

const cacheManager = new MemoryCache();

module.exports = cacheManager;
