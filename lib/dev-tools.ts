/**
 * Development Tools for LiftLog
 *
 * Provides utilities for debugging and cache management during development
 */

import { clearLiftLogLocal } from './cache-policy'

/**
 * Global debug flag - can be toggled at runtime
 * Usage: window.LL.setDebug(true) or window.LL.setDebug(false)
 */
let DEBUG_ENABLED = false

/**
 * Check if debug mode is enabled
 * By default, debug mode is OFF to reduce console spam
 * Use window.LL.setDebug(true) to enable debug logs
 */
export function isDebugEnabled(): boolean {
  return DEBUG_ENABLED
}

/**
 * Conditional console.log that only logs when debug is enabled
 */
export function debugLog(module: string, ...args: any[]): void {
  if (isDebugEnabled()) {
    console.log(`[${module}]`, ...args)
  }
}

/**
 * Conditional console.warn that only logs when debug is enabled
 */
export function debugWarn(module: string, ...args: any[]): void {
  if (isDebugEnabled()) {
    console.warn(`[${module}]`, ...args)
  }
}

/**
 * Conditional console.error - always logs but includes debug context when enabled
 */
export function debugError(module: string, ...args: any[]): void {
  console.error(`[${module}]`, ...args)
}

export interface LiftLogDevTools {
  clearLocal: () => void
  clearLocalForUser: (userId: string) => void
  getLocalStorageInfo: () => { keys: string[], liftLogKeys: string[] }
  getCacheInfo: () => { totalSize: number, liftLogSize: number }
  setDebug: (enabled: boolean) => void
  getDebug: () => boolean
}

/**
 * Install development tools on the global window object
 */
export function installDevTools(userId?: string): void {
  const devTools: LiftLogDevTools = {
    clearLocal: () => {
      clearLiftLogLocal(userId)
      console.log('✅ LiftLog local cache cleared', { userId })
    },

    clearLocalForUser: (targetUserId: string) => {
      clearLiftLogLocal(targetUserId)
      console.log('✅ LiftLog local cache cleared for user', { userId: targetUserId })
    },

    getLocalStorageInfo: () => {
      const allKeys = Object.keys(localStorage)
      const liftLogKeys = allKeys.filter(key =>
        key.startsWith('liftlog_') ||
        key.startsWith('LL_')
      )

      return { keys: allKeys, liftLogKeys }
    },

    getCacheInfo: () => {
      const allKeys = Object.keys(localStorage)
      let totalSize = 0
      let liftLogSize = 0

      allKeys.forEach(key => {
        const value = localStorage.getItem(key)
        const size = value ? new Blob([value]).size : 0
        totalSize += size

        if (key.startsWith('liftlog_') || key.startsWith('LL_')) {
          liftLogSize += size
        }
      })

      return {
        totalSize: Math.round(totalSize / 1024), // KB
        liftLogSize: Math.round(liftLogSize / 1024) // KB
      }
    },

    setDebug: (enabled: boolean) => {
      DEBUG_ENABLED = enabled
      console.log(`🔧 Debug mode ${enabled ? 'ENABLED' : 'DISABLED'}`)
      console.log('Debug logs will now be', enabled ? 'visible' : 'hidden')
    },

    getDebug: () => {
      return DEBUG_ENABLED
    }
  }

  // @ts-expect-error - Adding dev tools to global window object
  window.LL = devTools

  console.log('[LL] Development tools installed:', {
    commands: [
      'window.LL.setDebug(true|false) - Toggle debug logging',
      'window.LL.getDebug() - Check debug status',
      'window.LL.clearLocal() - Clear all LiftLog cache',
      'window.LL.clearLocalForUser(userId) - Clear cache for specific user',
      'window.LL.getLocalStorageInfo() - Get localStorage info',
      'window.LL.getCacheInfo() - Get cache size info'
    ],
    userId,
    debugMode: DEBUG_ENABLED
  })
}

/**
 * Auto-install dev tools in development mode
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Install with no user initially, will be updated when user loads
  installDevTools()
}
