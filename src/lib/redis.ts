// ============================================
// REDIS CACHE HELPER
// Using Upstash Redis for serverless caching
// ============================================

import { Redis } from '@upstash/redis'

// Initialize Redis client
const redis = new Redis({
  url: import.meta.env.VITE_UPSTASH_REDIS_URL || '',
  token: import.meta.env.VITE_UPSTASH_REDIS_TOKEN || '',
})

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

