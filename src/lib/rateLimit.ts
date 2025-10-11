// ============================================
// RATE LIMITER
// Client-side rate limiting for API calls
// ============================================

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  key: string
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store for rate limits
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Check if rate limit is exceeded
 */
export function isRateLimited(config: RateLimitConfig): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(config.key)
  
  // No entry or window expired
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(config.key, {
      count: 1,
      resetAt: now + config.windowMs,
    })
    return false
  }
  
  // Increment count
  entry.count++
  
  // Check if exceeded
  if (entry.count > config.maxRequests) {
    console.warn(`⚠️ Rate limit exceeded for: ${config.key}`)
    return true
  }
  
  rateLimitStore.set(config.key, entry)
  return false
}

/**
 * Get time until rate limit resets
 */
export function getRateLimitResetTime(key: string): number {
  const entry = rateLimitStore.get(key)
  if (!entry) return 0
  
  const now = Date.now()
  return Math.max(0, entry.resetAt - now)
}

/**
 * Clear rate limit for a key
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key)
}

/**
 * Clean up expired entries
 */
export function cleanupRateLimits(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}

// Auto cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000)
}

// ============================================
// PRE-CONFIGURED RATE LIMITERS
// ============================================

/**
 * Google API rate limiter
 * Max 10 locations per minute per user
 */
export function checkGoogleAPILimit(userId: string): boolean {
  return isRateLimited({
    key: `google-api:${userId}`,
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  })
}

/**
 * OpenAI API rate limiter
 * Max 100 reviews per minute per user
 */
export function checkOpenAILimit(userId: string): boolean {
  return isRateLimited({
    key: `openai-api:${userId}`,
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  })
}

/**
 * Sync button rate limiter
 * Max 1 sync per 5 seconds per location
 */
export function checkSyncLimit(locationId: string): boolean {
  return isRateLimited({
    key: `sync:${locationId}`,
    maxRequests: 1,
    windowMs: 5 * 1000, // 5 seconds
  })
}

/**
 * AI analysis button rate limiter
 * Max 1 analysis per 10 seconds per location
 */
export function checkAIAnalysisLimit(locationId: string): boolean {
  return isRateLimited({
    key: `ai-analysis:${locationId}`,
    maxRequests: 1,
    windowMs: 10 * 1000, // 10 seconds
  })
}

/**
 * Refresh rate limiter
 * Max 5 refreshes per minute per page
 */
export function checkRefreshLimit(page: string, userId: string): boolean {
  return isRateLimited({
    key: `refresh:${page}:${userId}`,
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  })
}

// ============================================
// DEBOUNCE HELPER
// ============================================

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function (...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, waitMs)
  }
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let lastCall = 0
  
  return function (...args: Parameters<T>) {
    const now = Date.now()
    
    if (now - lastCall >= limitMs) {
      lastCall = now
      func(...args)
    }
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  check: isRateLimited,
  getResetTime: getRateLimitResetTime,
  clear: clearRateLimit,
  cleanup: cleanupRateLimits,
  
  // Pre-configured
  googleAPI: checkGoogleAPILimit,
  openAI: checkOpenAILimit,
  sync: checkSyncLimit,
  aiAnalysis: checkAIAnalysisLimit,
  refresh: checkRefreshLimit,
  
  // Helpers
  debounce,
  throttle,
}

