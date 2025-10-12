// ============================================
// REDIS CACHE HELPER
// Using Upstash Redis REST API for browser-safe caching
// ============================================

// Browser-safe Redis client using fetch API
class BrowserRedis {
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  private async request(command: string[]) {
    if (!this.url || !this.token) {
      console.warn('Redis not configured');
      return null;
    }

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        console.error('Redis request failed:', response.statusText);
        return null;
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Redis error:', error);
      return null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const result = await this.request(['GET', key]);
    if (!result) return null;
    return typeof result === 'string' ? JSON.parse(result) : result;
  }

  async set(key: string, value: any, options?: { ex?: number }) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    if (options?.ex) {
      await this.request(['SET', key, stringValue, 'EX', String(options.ex)]);
    } else {
      await this.request(['SET', key, stringValue]);
    }
  }

  async del(...keys: string[]) {
    await this.request(['DEL', ...keys]);
  }

  async keys(pattern: string) {
    const result = await this.request(['KEYS', pattern]);
    return result || [];
  }

  async exists(key: string) {
    const result = await this.request(['EXISTS', key]);
    return result || 0;
  }
}

// Initialize Redis client
const redis = new BrowserRedis(
  import.meta.env.VITE_UPSTASH_REDIS_URL || '',
  import.meta.env.VITE_UPSTASH_REDIS_TOKEN || ''
);

// Check if Redis is configured
const isRedisEnabled = (): boolean => {
  return !!(import.meta.env.VITE_UPSTASH_REDIS_URL && import.meta.env.VITE_UPSTASH_REDIS_TOKEN)
}

// ============================================
// CACHE KEYS
// ============================================

export const CacheKeys = {
  // Reviews
  reviews: (locationId: string, page: number = 0) => `reviews:${locationId}:page:${page}`,
  reviewsCount: (locationId: string) => `reviews:${locationId}:count`,
  reviewsList: (locationId: string) => `reviews:${locationId}:all`,
  
  // Analytics
  analytics: (locationId: string, period: string) => `analytics:${locationId}:${period}`,
  analyticsOverview: (locationId: string) => `analytics:${locationId}:overview`,
  sentiment: (locationId: string) => `sentiment:${locationId}`,
  
  // Locations
  userLocations: (userId: string) => `locations:user:${userId}`,
  locationDetails: (locationId: string) => `location:${locationId}`,
  
  // Google API responses
  googleReviews: (locationId: string) => `google:reviews:${locationId}`,
  googleLocations: (userId: string) => `google:locations:${userId}`,
  
  // AI Analysis
  aiJobStatus: (jobId: string) => `ai:job:${jobId}`,
  
  // Sync status
  syncStatus: (locationId: string) => `sync:status:${locationId}`,
}

// ============================================
// TTL (Time To Live) in seconds
// ============================================

export const CacheTTL = {
  reviews: 3600,           // 1 hour
  analytics: 21600,        // 6 hours
  locations: 43200,        // 12 hours
  googleAPI: 86400,        // 24 hours
  shortLived: 300,         // 5 minutes
  aiJobStatus: 600,        // 10 minutes
}

// ============================================
// CORE CACHE FUNCTIONS
// ============================================

/**
 * Get value from cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!isRedisEnabled()) {
    console.warn('Redis not configured, cache disabled')
    return null
  }
  
  try {
    const value = await redis.get<T>(key)
    if (value) {
      console.log(`✅ Cache HIT: ${key}`)
    } else {
      console.log(`❌ Cache MISS: ${key}`)
    }
    return value
  } catch (error) {
    console.error('Redis GET error:', error)
    return null
  }
}

/**
 * Set value in cache
 */
export async function setCache<T>(
  key: string, 
  value: T, 
  ttl: number = CacheTTL.reviews
): Promise<boolean> {
  if (!isRedisEnabled()) {
    return false
  }
  
  try {
    await redis.set(key, value, { ex: ttl })
    console.log(`💾 Cache SET: ${key} (TTL: ${ttl}s)`)
    return true
  } catch (error) {
    console.error('Redis SET error:', error)
    return false
  }
}

/**
 * Delete from cache
 */
export async function deleteCache(key: string | string[]): Promise<boolean> {
  if (!isRedisEnabled()) {
    return false
  }
  
  try {
    const keys = Array.isArray(key) ? key : [key]
    await redis.del(...keys)
    console.log(`🗑️ Cache DELETE: ${keys.join(', ')}`)
    return true
  } catch (error) {
    console.error('Redis DELETE error:', error)
    return false
  }
}

/**
 * Delete all keys matching pattern
 */
export async function deleteCachePattern(pattern: string): Promise<boolean> {
  if (!isRedisEnabled()) {
    return false
  }
  
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
      console.log(`🗑️ Cache DELETE pattern: ${pattern} (${keys.length} keys)`)
    }
    return true
  } catch (error) {
    console.error('Redis DELETE PATTERN error:', error)
    return false
  }
}

/**
 * Check if key exists
 */
export async function hasCache(key: string): Promise<boolean> {
  if (!isRedisEnabled()) {
    return false
  }
  
  try {
    const exists = await redis.exists(key)
    return exists > 0
  } catch (error) {
    console.error('Redis EXISTS error:', error)
    return false
  }
}

// ============================================
// CACHE HELPERS
// ============================================

/**
 * Get or fetch pattern
 * Try cache first, fallback to fetcher function
 */
export async function getCacheOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CacheTTL.reviews
): Promise<T> {
  // Try cache first
  const cached = await getCache<T>(key)
  if (cached !== null) {
    return cached
  }
  
  // Cache miss, fetch fresh data
  const fresh = await fetcher()
  
  // Save to cache
  await setCache(key, fresh, ttl)
  
  return fresh
}

/**
 * Invalidate all caches for a location
 */
export async function invalidateLocationCache(locationId: string): Promise<void> {
  if (!isRedisEnabled()) return
  
  const patterns = [
    `reviews:${locationId}:*`,
    `analytics:${locationId}:*`,
    `sentiment:${locationId}*`,
    `google:reviews:${locationId}*`,
    `location:${locationId}*`,
    `sync:status:${locationId}*`,
  ]
  
  for (const pattern of patterns) {
    await deleteCachePattern(pattern)
  }
  
  console.log(`🔄 Invalidated all cache for location: ${locationId}`)
}

/**
 * Invalidate user's location cache
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  if (!isRedisEnabled()) return
  
  await deleteCachePattern(`locations:user:${userId}*`)
  await deleteCachePattern(`google:locations:${userId}*`)
  
  console.log(`🔄 Invalidated cache for user: ${userId}`)
}

/**
 * Get cache stats (for monitoring)
 */
export async function getCacheStats(): Promise<{ totalKeys: number; enabled: boolean }> {
  if (!isRedisEnabled()) {
    return { totalKeys: 0, enabled: false }
  }
  
  try {
    const keys = await redis.keys('*')
    return {
      totalKeys: keys.length,
      enabled: true,
    }
  } catch (error) {
    console.error('Redis STATS error:', error)
    return { totalKeys: 0, enabled: true }
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  get: getCache,
  set: setCache,
  delete: deleteCache,
  deletePattern: deleteCachePattern,
  has: hasCache,
  getOrFetch: getCacheOrFetch,
  invalidateLocation: invalidateLocationCache,
  invalidateUser: invalidateUserCache,
  stats: getCacheStats,
  keys: CacheKeys,
  ttl: CacheTTL,
  enabled: isRedisEnabled(),
}

