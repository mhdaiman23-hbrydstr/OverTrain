/**
 * Cache Policy Configuration - Hybrid Approach
 * 
 * This module defines how LiftLog handles data persistence:
 * - Database is the source of truth for all workout history (long-term persistence)
 * - localStorage provides 24h caching for instant progression calculations
 * - Enables same-session progression preview while maintaining DB reliability
 */

export const CACHE_POLICY = {
  sourceOfTruth: 'database' as const,      // 'database' | 'local'
  historyTTL: 24 * 60 * 60 * 1000,         // 24h cache for progression calculations
  inProgressTTL: 48 * 60 * 60 * 1000,      // 48h for offline resumes (in milliseconds)
  programStateTTL: 24 * 60 * 60 * 1000,    // 24h for program state cache
} as const

export function now(): number {
  return Date.now()
}

/**
 * Set data in localStorage with TTL (Time To Live)
 * If TTL is 0, data is stored without expiration
 */
export function setCache<T>(key: string, value: T, ttlMs: number = 0): void {
  const payload = {
    v: 1,
    data: value,
    expiresAt: ttlMs > 0 ? now() + ttlMs : 0,
    createdAt: now()
  }
  localStorage.setItem(key, JSON.stringify(payload))
}

/**
 * Get data from localStorage, respecting TTL
 * Returns null if data is expired or doesn't exist
 */
export function getCache<T>(key: string): T | null {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  
  try {
    const { data, expiresAt } = JSON.parse(raw)
    
    // Check if data has expired
    if (expiresAt && expiresAt > 0 && expiresAt < now()) {
      localStorage.removeItem(key)
      return null
    }
    
    return data as T
  } catch (error) {
    console.warn(`[CachePolicy] Failed to parse cached data for key "${key}":`, error)
    localStorage.removeItem(key)
    return null
  }
}

/**
 * Clear all LiftLog-related data from localStorage
 */
export function clearLiftLogLocal(userId?: string): void {
  const keysToRemove: string[] = []
  
  for (const key of Object.keys(localStorage)) {
    const isLiftLogKey = 
      key.startsWith('liftlog_') ||
      key.startsWith('LL_') ||
      // Legacy enrichment keys removed ||
      key.includes('programChanged') ||
      (userId && key.includes(userId))
    
    if (isLiftLogKey) {
      keysToRemove.push(key)
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key))
  
  console.log(`[CachePolicy] Cleared ${keysToRemove.length} LiftLog keys from localStorage`, {
    userId,
    keys: keysToRemove
  })
}

/**
 * Check if we should use database as source of truth
 */
export function shouldUseDatabase(): boolean {
  return CACHE_POLICY.sourceOfTruth === 'database'
}

/**
 * Get TTL for in-progress workouts (for offline resume)
 */
export function getInProgressTTL(): number {
  return CACHE_POLICY.inProgressTTL
}

/**
 * Get TTL for program state cache
 */
export function getProgramStateTTL(): number {
  return CACHE_POLICY.programStateTTL
}

/**
 * Check if history should be cached (enabled for 24h progression calculations)
 */
export function shouldCacheHistory(): boolean {
  return CACHE_POLICY.historyTTL > 0
}

/**
 * Get TTL for workout history cache
 */
export function getHistoryTTL(): number {
  return CACHE_POLICY.historyTTL
}
