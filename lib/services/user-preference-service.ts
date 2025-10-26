/**
 * UserPreferenceService
 * Manages user preferences for RIR/RPE display.
 *
 * Preferences are stored in the profiles table and cached locally.
 */

import { RpeRirDisplayMode } from '@/lib/types/progression'

const PREFERENCE_STORAGE_KEY = 'liftlog_user_preferences'

export class UserPreferenceService {
  /**
   * In-memory cache for user preferences.
   * Key: userId
   */
  private static cache: Map<string, RpeRirDisplayMode> = new Map()

  /**
   * Get user's RIR/RPE display preference.
   * Default is 'rir' if not set.
   *
   * @param userId - User UUID
   * @returns Display mode: 'rir' | 'rpe' | 'off'
   */
  static async getRpeRirDisplayMode(userId: string): Promise<RpeRirDisplayMode> {
    // Check in-memory cache first
    if (this.cache.has(userId)) {
      return this.cache.get(userId)!
    }

    // Check localStorage
    const localStorage = this.getFromLocalStorage()
    if (localStorage[userId]) {
      const mode = localStorage[userId]
      this.cache.set(userId, mode)
      return mode
    }

    // TODO: Query Supabase profiles table
    // const profile = await db.query('profiles', { id: userId })
    // const mode = profile?.rpe_rir_display_mode || 'rir'

    const defaultMode: RpeRirDisplayMode = 'rir'
    this.cache.set(userId, defaultMode)
    return defaultMode
  }

  /**
   * Set user's RIR/RPE display preference.
   *
   * @param userId - User UUID
   * @param mode - Display mode: 'rir' | 'rpe' | 'off'
   */
  static async setRpeRirDisplayMode(userId: string, mode: RpeRirDisplayMode): Promise<void> {
    if (!this.isValidMode(mode)) {
      throw new Error(`Invalid display mode: ${mode}. Must be 'rir', 'rpe', or 'off'.`)
    }

    // Update in-memory cache
    this.cache.set(userId, mode)

    // Update localStorage
    const localStorage = this.getFromLocalStorage()
    localStorage[userId] = mode
    this.setLocalStorage(localStorage)

    // TODO: Update Supabase profiles table
    // await db.update('profiles', { id: userId }, { rpe_rir_display_mode: mode })

    // Dispatch event so all components can update
    this.dispatchPreferenceChangedEvent(userId, mode)
  }

  /**
   * Subscribe to preference changes.
   * Returns unsubscribe function.
   *
   * @param userId - User UUID
   * @param callback - Called when preference changes
   * @returns Unsubscribe function
   */
  static onPreferenceChanged(
    userId: string,
    callback: (mode: RpeRirDisplayMode) => void
  ): () => void {
    const handler = (event: CustomEvent) => {
      if (event.detail?.userId === userId) {
        callback(event.detail.mode)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('userPreferenceChanged', handler as EventListener)

      // Return unsubscribe function
      return () => {
        window.removeEventListener('userPreferenceChanged', handler as EventListener)
      }
    }

    return () => {} // No-op unsubscribe for SSR
  }

  /**
   * Clear cached preferences (for testing/logout).
   */
  static clearCache(): void {
    this.cache.clear()
  }

  /**
   * Clear all preferences from localStorage (for testing/reset).
   */
  static clearLocalStorage(): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(PREFERENCE_STORAGE_KEY)
    } catch {
      console.error('Failed to clear preferences from localStorage')
    }
  }

  /**
   * Helper methods
   */

  private static isValidMode(mode: any): mode is RpeRirDisplayMode {
    return mode === 'rir' || mode === 'rpe' || mode === 'off'
  }

  private static getFromLocalStorage(): { [userId: string]: RpeRirDisplayMode } {
    if (typeof window === 'undefined') return {}
    try {
      const data = window.localStorage.getItem(PREFERENCE_STORAGE_KEY)
      return data ? JSON.parse(data) : {}
    } catch {
      console.error('Failed to load preferences from localStorage')
      return {}
    }
  }

  private static setLocalStorage(prefs: { [userId: string]: RpeRirDisplayMode }): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(prefs))
    } catch {
      console.error('Failed to save preferences to localStorage')
    }
  }

  private static dispatchPreferenceChangedEvent(userId: string, mode: RpeRirDisplayMode): void {
    if (typeof window === 'undefined') return

    const event = new CustomEvent('userPreferenceChanged', {
      detail: { userId, mode }
    })
    window.dispatchEvent(event)
  }
}
