// backend/src/core/cache/simpleCache.js

class SimpleCache {
  constructor({ maxEntries = 200, ttlMs = 5 * 60 * 1000 } = {}) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.map = new Map(); // key -> { value, expiresAt }
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }

    // refresh recency (simple LRU behavior)
    this.map.delete(key);
    this.map.set(key, entry);

    return entry.value;
  }

  set(key, value) {
    const expiresAt = Date.now() + this.ttlMs;

    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expiresAt });

    // Evict oldest
    while (this.map.size > this.maxEntries) {
      const oldestKey = this.map.keys().next().value;
      this.map.delete(oldestKey);
    }
  }
}

module.exports = { SimpleCache };
