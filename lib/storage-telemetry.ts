import StorageManager from "./indexed-db-storage"

interface TelemetryExtras {
  syncQueueSize?: number
}

interface TelemetrySnapshot {
  context: string
  timestamp: number
  cacheEntries: number
  localStorageBytes?: number
  localStorageQuota?: number
  storageUsage?: number
  storageQuota?: number
  syncQueueSize?: number
}

/**
 * Sync operation tracking for Phase 2 telemetry
 * Tracks timing, success/failure rates, and identifies bottlenecks
 */
export interface SyncOperation {
  id: string
  operation: 'workout_complete' | 'program_complete' | 'set_sync' | 'program_start' | 'data_load'
  startTime: number
  endTime?: number
  success?: boolean
  error?: string
  metadata?: Record<string, any>
}

// In-memory buffer for recent sync operations (last 50)
const syncOperationBuffer: SyncOperation[] = []
const MAX_BUFFER_SIZE = 50

export class StorageTelemetry {
  private static lastWarningAt = 0
  private static readonly WARNING_INTERVAL_MS = 30_000

  /**
   * Start tracking a sync operation
   * Returns an operation ID to use with endSyncOperation
   */
  static startSyncOperation(
    operation: SyncOperation['operation'],
    metadata?: Record<string, any>
  ): string {
    const id = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const op: SyncOperation = {
      id,
      operation,
      startTime: Date.now(),
      metadata,
    }
    
    syncOperationBuffer.push(op)
    if (syncOperationBuffer.length > MAX_BUFFER_SIZE) {
      syncOperationBuffer.shift()
    }
    
    console.log(`[SyncTelemetry] START ${operation}`, { id, ...metadata })
    return id
  }

  /**
   * End a tracked sync operation
   */
  static endSyncOperation(id: string, success: boolean, error?: string): void {
    const op = syncOperationBuffer.find(o => o.id === id)
    if (!op) {
      console.warn(`[SyncTelemetry] Operation not found: ${id}`)
      return
    }
    
    op.endTime = Date.now()
    op.success = success
    op.error = error
    
    const duration = op.endTime - op.startTime
    const level = success ? 'log' : 'error'
    
    console[level](`[SyncTelemetry] END ${op.operation}`, {
      id,
      duration: `${duration}ms`,
      success,
      error,
      ...op.metadata,
    })
    
    // Warn if operation took too long
    if (duration > 5000) {
      console.warn(`[SyncTelemetry] SLOW operation: ${op.operation} took ${duration}ms`, op)
    }
  }

  /**
   * Get recent sync operation stats
   */
  static getSyncStats(): {
    total: number
    successful: number
    failed: number
    pending: number
    avgDuration: number
    slowOperations: number
  } {
    const completed = syncOperationBuffer.filter(o => o.endTime !== undefined)
    const successful = completed.filter(o => o.success)
    const failed = completed.filter(o => !o.success)
    const pending = syncOperationBuffer.filter(o => o.endTime === undefined)
    
    const durations = completed.map(o => (o.endTime! - o.startTime))
    const avgDuration = durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length 
      : 0
    const slowOperations = durations.filter(d => d > 5000).length
    
    return {
      total: syncOperationBuffer.length,
      successful: successful.length,
      failed: failed.length,
      pending: pending.length,
      avgDuration: Math.round(avgDuration),
      slowOperations,
    }
  }

  /**
   * Log a sync failure with context for debugging
   */
  static logSyncFailure(
    context: string,
    error: any,
    metadata?: Record<string, any>
  ): void {
    const errorMessage = error?.message || String(error)
    const isNetworkError = errorMessage.includes('network') || 
                          errorMessage.includes('fetch') ||
                          errorMessage.includes('timeout') ||
                          errorMessage.includes('Failed to fetch')
    
    console.error(`[SyncTelemetry] FAILURE in ${context}`, {
      error: errorMessage,
      isNetworkError,
      timestamp: new Date().toISOString(),
      platform: this.getPlatformInfo(),
      ...metadata,
    })
  }

  /**
   * Get platform information for debugging
   */
  static getPlatformInfo(): {
    isNative: boolean
    platform: string
    userAgent: string
  } {
    if (typeof window === 'undefined') {
      return { isNative: false, platform: 'server', userAgent: '' }
    }
    
    const isNative = window.navigator?.userAgent?.includes("CapacitorNative") || 
                     (window as any).Capacitor?.isNativePlatform?.() || false
    
    return {
      isNative,
      platform: isNative ? 'native' : 'web',
      userAgent: window.navigator?.userAgent || '',
    }
  }

  /**
   * Debug helper: dump recent sync operations to console
   */
  static dumpSyncOperations(): void {
    console.group('[SyncTelemetry] Recent Operations')
    console.table(syncOperationBuffer.map(op => ({
      operation: op.operation,
      duration: op.endTime ? `${op.endTime - op.startTime}ms` : 'pending',
      success: op.success ?? 'pending',
      error: op.error || '-',
    })))
    console.log('Stats:', this.getSyncStats())
    console.groupEnd()
  }

  static async logQuotaWarning(context: string, extras: TelemetryExtras = {}): Promise<void> {
    if (typeof window === "undefined") return

    const now = Date.now()
    if (now - this.lastWarningAt < this.WARNING_INTERVAL_MS) {
      return
    }

    const snapshot = await this.collectSnapshot(context, extras)
    if (!this.shouldWarn(snapshot)) {
      return
    }

    this.lastWarningAt = now
    console.warn("[StorageTelemetry] Storage pressure detected", snapshot)
  }

  private static shouldWarn(snapshot: TelemetrySnapshot): boolean {
    const localQuota = snapshot.localStorageQuota
    const localBytes = snapshot.localStorageBytes
    const storageQuota = snapshot.storageQuota
    const storageUsage = snapshot.storageUsage

    const localRatio = localQuota && localQuota > 0 && localBytes !== undefined
      ? localBytes / localQuota
      : 0
    const storageRatio = storageQuota && storageQuota > 0 && storageUsage !== undefined
      ? storageUsage / storageQuota
      : 0

    const queuePressure = snapshot.syncQueueSize !== undefined && snapshot.syncQueueSize >= 100

    return localRatio >= 0.8 || storageRatio >= 0.85 || queuePressure
  }

  private static async collectSnapshot(context: string, extras: TelemetryExtras): Promise<TelemetrySnapshot> {
    const cacheStats = StorageManager.getCacheStats()
    const localStorageBytes = this.calculateLocalStorageUsage()

    let storageUsage: number | undefined
    let storageQuota: number | undefined
    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      try {
        const estimate = await navigator.storage.estimate()
        storageUsage = estimate.usage ?? estimate.usageDetails?.indexedDB
        storageQuota = estimate.quota
      } catch {
        // ignore estimate failures
      }
    }

    return {
      context,
      timestamp: Date.now(),
      cacheEntries: cacheStats.entries,
      localStorageBytes: localStorageBytes ?? undefined,
      localStorageQuota: storageQuota,
      storageUsage,
      storageQuota,
      syncQueueSize: extras.syncQueueSize,
    }
  }

  private static calculateLocalStorageUsage(): number | null {
    if (typeof window === "undefined") return null

    try {
      let totalChars = 0
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key) continue
        const value = localStorage.getItem(key) ?? ""
        totalChars += key.length + value.length
      }
      // Approximate bytes (UTF-16 => 2 bytes per char)
      return totalChars * 2
    } catch {
      return null
    }
  }
}

/**
 * Register debug utilities on window for console access
 * Usage from browser console:
 *   window.__syncDebug.stats()     - Get sync statistics
 *   window.__syncDebug.dump()      - Dump recent operations
 *   window.__syncDebug.platform()  - Get platform info
 */
if (typeof window !== 'undefined') {
  (window as any).__syncDebug = {
    stats: () => StorageTelemetry.getSyncStats(),
    dump: () => StorageTelemetry.dumpSyncOperations(),
    platform: () => StorageTelemetry.getPlatformInfo(),
  }
}
