/**
 * Session Manager - Transparent Token Refresh
 *
 * Purpose: Keep users authenticated for multi-hour gym sessions without interruption
 *
 * Strategy:
 * 1. Supabase tokens expire after 1 hour by default
 * 2. Auto-refresh runs at 55 minutes (before expiry)
 * 3. Monitor auth state changes and handle failures gracefully
 * 4. Never interrupt user workflow - completely transparent
 *
 * Architecture:
 * - Database is source of truth
 * - localStorage is performance cache
 * - Session must stay valid for database writes to succeed
 */

import { supabase } from './supabase'
import { ConnectionMonitor } from './connection-monitor'

export interface SessionStatus {
  isValid: boolean
  expiresAt?: number
  timeUntilExpiry?: number
  needsRefresh: boolean
  userId?: string
  lastRefresh?: number
}

export class SessionManager {
  private static refreshCheckInterval: NodeJS.Timeout | null = null
  private static readonly CHECK_INTERVAL_MS = 5 * 60 * 1000 // Check every 5 minutes
  private static readonly REFRESH_THRESHOLD_MS = 10 * 60 * 1000 // Refresh if < 10 minutes remaining
  private static isRefreshing = false
  private static lastRefreshAttempt = 0
  private static readonly MIN_REFRESH_INTERVAL_MS = 60 * 1000 // Don't refresh more than once per minute

  /**
   * Start monitoring session health
   * Call this once on app initialization
   */
  static startMonitoring(): void {
    if (typeof window === 'undefined' || !supabase) {
      console.log('[SessionManager] Not available (server-side or no Supabase)')
      return
    }

    console.log('[SessionManager] 🔐 Starting session monitoring...')

    // Set up auth state change listener (handles automatic refresh)
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('[SessionManager] Auth state changed:', event)

      if (event === 'TOKEN_REFRESHED') {
        console.log('[SessionManager] ✅ Token refreshed successfully')
        this.isRefreshing = false
        this.lastRefreshAttempt = Date.now()
      } else if (event === 'SIGNED_OUT') {
        console.log('[SessionManager] 🚪 User signed out')
        this.stopMonitoring()
      } else if (event === 'SIGNED_IN') {
        console.log('[SessionManager] 🔓 User signed in')
        // Cache session for offline use
        this.cacheSessionForOffline().catch(() => {})
        // Start periodic checks
        this.startPeriodicChecks()
      }
    })

    // Initial check
    this.checkSessionHealth()

    // Start periodic checks
    this.startPeriodicChecks()

    console.log('[SessionManager] ✅ Session monitoring active')
  }

  /**
   * Stop monitoring (on logout or unmount)
   */
  static stopMonitoring(): void {
    if (this.refreshCheckInterval) {
      clearInterval(this.refreshCheckInterval)
      this.refreshCheckInterval = null
      console.log('[SessionManager] ⏹️ Monitoring stopped')
    }
  }

  /**
   * Start periodic session health checks
   */
  private static startPeriodicChecks(): void {
    // Clear any existing interval
    if (this.refreshCheckInterval) {
      clearInterval(this.refreshCheckInterval)
    }

    // Check session health periodically
    this.refreshCheckInterval = setInterval(() => {
      this.checkSessionHealth()
    }, this.CHECK_INTERVAL_MS)
  }

  /**
   * Check current session health and refresh if needed
   */
  private static async checkSessionHealth(): Promise<void> {
    if (!supabase) return

    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('[SessionManager] ❌ Error checking session:', error)
        return
      }

      if (!session) {
        console.log('[SessionManager] ⚠️ No active session')
        return
      }

      const now = Math.floor(Date.now() / 1000)
      const expiresAt = session.expires_at || 0
      const timeUntilExpiry = (expiresAt - now) * 1000 // Convert to milliseconds

      console.log('[SessionManager] Session check:', {
        expiresIn: `${Math.floor(timeUntilExpiry / 60000)} minutes`,
        expiresAt: new Date(expiresAt * 1000).toLocaleTimeString(),
        userId: session.user.id.substring(0, 8) + '...',
      })

      // Proactive refresh if expiring soon
      if (timeUntilExpiry < this.REFRESH_THRESHOLD_MS && timeUntilExpiry > 0) {
        console.log('[SessionManager] 🔄 Token expiring soon, refreshing proactively...')
        await this.refreshSession()
      }
    } catch (error) {
      console.error('[SessionManager] ❌ Session health check failed:', error)
    }
  }

  /**
   * Manually refresh session
   * This is called proactively before expiry
   */
  static async refreshSession(): Promise<boolean> {
    if (!supabase) {
      console.warn('[SessionManager] Cannot refresh: Supabase not configured')
      return false
    }

    // Prevent concurrent refresh attempts
    if (this.isRefreshing) {
      console.log('[SessionManager] ⏳ Refresh already in progress')
      return false
    }

    // Rate limiting: Don't refresh too frequently
    const timeSinceLastRefresh = Date.now() - this.lastRefreshAttempt
    if (timeSinceLastRefresh < this.MIN_REFRESH_INTERVAL_MS) {
      console.log('[SessionManager] ⏱️ Refresh rate limited (too soon)')
      return false
    }

    this.isRefreshing = true
    this.lastRefreshAttempt = Date.now()

    try {
      console.log('[SessionManager] 🔄 Refreshing session...')

      const { data: { session }, error } = await supabase.auth.refreshSession()

      if (error) {
        console.error('[SessionManager] ❌ Failed to refresh session:', error)
        this.isRefreshing = false

        // Emit event for UI to handle (optional re-login prompt)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sessionRefreshFailed', {
            detail: { error: error.message }
          }))
        }

        return false
      }

      if (!session) {
        console.error('[SessionManager] ❌ No session returned after refresh')
        this.isRefreshing = false
        return false
      }

      console.log('[SessionManager] ✅ Session refreshed successfully')
      console.log('[SessionManager] New expiry:', new Date(session.expires_at! * 1000).toLocaleTimeString())

      this.isRefreshing = false

      // Cache session for offline startup (fire-and-forget)
      this.cacheSessionForOffline().catch(() => {})

      // Emit success event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sessionRefreshed', {
          detail: { expiresAt: session.expires_at }
        }))
      }

      return true
    } catch (error) {
      console.error('[SessionManager] ❌ Session refresh error:', error)
      this.isRefreshing = false
      return false
    }
  }

  /**
   * Get current session status
   */
  static async getStatus(): Promise<SessionStatus> {
    if (!supabase) {
      return {
        isValid: false,
        needsRefresh: false,
      }
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        return {
          isValid: false,
          needsRefresh: true,
        }
      }

      const now = Math.floor(Date.now() / 1000)
      const expiresAt = session.expires_at || 0
      const timeUntilExpiry = (expiresAt - now) * 1000

      return {
        isValid: timeUntilExpiry > 0,
        expiresAt: session.expires_at,
        timeUntilExpiry,
        needsRefresh: timeUntilExpiry < this.REFRESH_THRESHOLD_MS,
        userId: session.user.id,
        lastRefresh: this.lastRefreshAttempt || undefined,
      }
    } catch (error) {
      console.error('[SessionManager] Error getting status:', error)
      return {
        isValid: false,
        needsRefresh: true,
      }
    }
  }

  /**
   * Force immediate session check (useful for debugging)
   */
  static async forceCheck(): Promise<SessionStatus> {
    await this.checkSessionHealth()
    return this.getStatus()
  }

  /**
   * Cache session to native Preferences for offline app startup.
   * Called after every successful session refresh.
   */
  private static async cacheSessionForOffline(): Promise<void> {
    try {
      const { Preferences } = await import('@capacitor/preferences')
      const { data: { session } } = await supabase!.auth.getSession()
      if (session) {
        await Preferences.set({
          key: 'overtrain_cached_session',
          value: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
            user: { id: session.user.id, email: session.user.email },
            cached_at: Date.now(),
          }),
        })
      }
    } catch {
      // Not on native or Preferences not available — safe to ignore
    }
  }

  /**
   * Attempt to restore session from native cache when offline.
   * Returns the cached user ID if a valid cached session exists.
   */
  static async restoreOfflineSession(): Promise<{ userId: string; email: string } | null> {
    // Only use offline cache when actually offline
    if (ConnectionMonitor.isOnline()) return null

    try {
      const { Preferences } = await import('@capacitor/preferences')
      const { value } = await Preferences.get({ key: 'overtrain_cached_session' })
      if (!value) return null

      const cached = JSON.parse(value)
      // Accept cached sessions up to 7 days old
      const maxAge = 7 * 24 * 60 * 60 * 1000
      if (Date.now() - cached.cached_at > maxAge) {
        console.log('[SessionManager] Cached session too old, discarding')
        await Preferences.remove({ key: 'overtrain_cached_session' })
        return null
      }

      // Try to set the cached session in Supabase
      if (supabase && cached.access_token && cached.refresh_token) {
        try {
          await supabase.auth.setSession({
            access_token: cached.access_token,
            refresh_token: cached.refresh_token,
          })
          console.log('[SessionManager] Restored cached session for offline use')
        } catch {
          console.log('[SessionManager] Could not restore session to Supabase (offline)')
        }
      }

      return { userId: cached.user?.id, email: cached.user?.email }
    } catch {
      return null
    }
  }
}

// Development tools
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).SessionManager = {
    getStatus: () => SessionManager.getStatus(),
    refreshNow: () => SessionManager.refreshSession(),
    forceCheck: () => SessionManager.forceCheck(),
    startMonitoring: () => SessionManager.startMonitoring(),
    stopMonitoring: () => SessionManager.stopMonitoring(),
  }
  console.log('[SessionManager] Dev tools available at window.SessionManager')
}
