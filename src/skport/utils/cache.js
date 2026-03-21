/**
 * @template T
 * @typedef {import('#/types/cache.js').CacheEntry<T>} CacheEntry
 */

/**
 * Generic cache utility with TTL (Time To Live) support
 * @template T
 */
class Cache {
  /**
   * @param {number} ttl - Time to live in milliseconds
   */
  constructor(ttl) {
    /** @type {Map<string, CacheEntry<T>>} */
    this.cache = new Map();
    /** @type {number} */
    this.ttl = ttl;
  }

  /**
   * Get a value from the cache
   * @param {string} key - The cache key
   * @returns {T | null} The cached value or null if not found or expired
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const cacheAge = Date.now() - entry.fetchTime;
    if (cacheAge >= this.ttl) {
      // Cache expired, delete it
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set a value in the cache
   * @param {string} key - The cache key
   * @param {T} value - The value to cache
   * @returns {void}
   */
  set(key, value) {
    this.cache.set(key, {
      data: value,
      fetchTime: Date.now(),
    });
  }

  /**
   * Check if a key exists in the cache and is not expired
   * @param {string} key - The cache key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    const cacheAge = Date.now() - entry.fetchTime;
    if (cacheAge >= this.ttl) {
      // Cache expired, delete it
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from the cache
   * @param {string} key - The cache key
   * @returns {boolean} True if the key was deleted, false if it didn't exist
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   * @returns {void}
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get the number of entries in the cache (including expired ones)
   * @returns {number}
   */
  size() {
    return this.cache.size;
  }

  /**
   * Clean up expired entries from the cache
   * @returns {number} Number of entries removed
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;
    const keysToDelete = [];

    // Collect expired keys first to avoid modifying map during iteration
    for (const [key, entry] of this.cache.entries()) {
      const cacheAge = now - entry.fetchTime;
      if (cacheAge >= this.ttl) {
        keysToDelete.push(key);
      }
    }

    // Delete expired keys
    for (const key of keysToDelete) {
      this.cache.delete(key);
      removed++;
    }

    return removed;
  }
}

/**
 * Get or set a value in the cache with a fetch function
 * @template T
 * @param {Cache<T>} cache - The cache instance
 * @param {string} key - The cache key
 * @param {() => Promise<T | null>} fetchFn - Function to fetch the value if not in cache
 * @returns {Promise<T | null>}
 */
async function getOrSet(cache, key, fetchFn) {
  // Check if value exists in cache
  const cached = cache.get(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh value
  const value = await fetchFn();
  if (value !== null && value !== undefined) {
    cache.set(key, value);
  }

  return value;
}

/**
 * Create a cache instance with a default TTL of 5 minutes
 * @template T
 * @param {number} [ttl=5 * 60 * 1000] - Time to live in milliseconds (default: 5 minutes)
 * @returns {Cache<T>}
 */
function createCache(ttl = 5 * 60 * 1000) {
  return new Cache(ttl);
}

/** @type {Map<string, Cache<any>>} */
const cacheRegistry = new Map();

/**
 * Get or create a named cache instance. Shared across the app; same name returns the same cache.
 * @template T
 * @param {string} name - Unique cache identifier
 * @param {number} [ttl=5 * 60 * 1000] - Time to live in milliseconds (used only on first creation)
 * @returns {Cache<T>}
 */
function getOrCreateCache(name, ttl = 5 * 60 * 1000) {
  let cache = cacheRegistry.get(name);
  if (!cache) {
    cache = new Cache(ttl);
    cacheRegistry.set(name, cache);
  }
  return cache;
}

export { Cache, getOrSet, createCache, getOrCreateCache };
