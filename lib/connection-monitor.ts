/**
 * ConnectionMonitor - Track online/offline status and manage sync queue
 */

export type ConnectionStatus = 'online' | 'offline' | 'syncing' | 'synced' | 'error'

export interface SetSyncProvider {
  getSetSyncStatus(): { queueSize: number; lastSync?: number }
  syncQueuedSets(): Promise<void>
}

export class ConnectionMonitor {
  private static listeners: Set<(status: ConnectionStatus) => void> = new Set()
  private static currentStatus: ConnectionStatus = 'online'
  private static syncQueue: Array<() => Promise<void>> = []
  private static isProcessingQueue = false
  private static setSyncProvider?: SetSyncProvider
  private static activeSyncs: Set<Promise<void>> = new Set()

  static initialize() {
    if (typeof window === 'undefined') return

    // Set initial status
    this.currentStatus = navigator.onLine ? 'online' : 'offline'

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('[ConnectionMonitor] Connection restored')
      this.updateStatus('online')
      this.processQueue()
    })

    window.addEventListener('offline', () => {
      console.log('[ConnectionMonitor] Connection lost')
      this.updateStatus('offline')
    })

    // Check connection periodically (backup for unreliable events)
    setInterval(() => {
      const isOnline = navigator.onLine
      if (isOnline && this.currentStatus === 'offline') {
        this.updateStatus('online')
        this.processQueue()
      } else if (!isOnline && this.currentStatus === 'online') {
        this.updateStatus('offline')
      }
    }, 5000)
  }

  static getStatus(): ConnectionStatus {
    return this.currentStatus
  }

  static isOnline(): boolean {
    return typeof window !== 'undefined' && navigator.onLine && this.currentStatus !== 'offline'
  }

  static updateStatus(status: ConnectionStatus) {
    this.currentStatus = status
    this.notifyListeners(status)
  }

  static subscribe(callback: (status: ConnectionStatus) => void) {
    this.listeners.add(callback)
    // Immediately call with current status
    callback(this.currentStatus)

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback)
    }
  }

  private static notifyListeners(status: ConnectionStatus) {
    this.listeners.forEach(listener => {
      try {
        listener(status)
      } catch (error) {
        console.error('[ConnectionMonitor] Error in listener:', error)
      }
    })
  }

  static addToQueue(syncFn: () => Promise<void>): Promise<void> {
    // Create tracked promise that won't be cancelled
    const syncPromise = (async () => {
      this.syncQueue.push(syncFn)
      console.log('[ConnectionMonitor] Added to sync queue, total:', this.syncQueue.length)

      // If online, process immediately
      if (this.isOnline() && !this.isProcessingQueue) {
        await this.processQueue()
      }
    })()

    // Track active sync
    this.activeSyncs.add(syncPromise)

    // Clean up when done
    syncPromise.finally(() => {
      this.activeSyncs.delete(syncPromise)
    })

    return syncPromise // Allow callers to await if needed
  }

  private static async processQueue() {
    if (this.isProcessingQueue || this.syncQueue.length === 0) return
    if (!this.isOnline()) {
      console.log('[ConnectionMonitor] Offline, queue processing postponed')
      return
    }

    this.isProcessingQueue = true
    this.updateStatus('syncing')

    console.log('[ConnectionMonitor] Processing sync queue:', this.syncQueue.length, 'items')

    const errors: Error[] = []

    while (this.syncQueue.length > 0) {
      const syncFn = this.syncQueue[0]

      try {
        await syncFn()
        this.syncQueue.shift() // Remove successfully synced item
      } catch (error) {
        console.error('[ConnectionMonitor] Sync failed:', error)
        errors.push(error as Error)

        // If offline, stop processing
        if (!navigator.onLine) {
          this.updateStatus('offline')
          this.isProcessingQueue = false
          return
        }

        // Remove failed item after 3 retries
        const retryCount = (syncFn as any)._retryCount || 0
        if (retryCount >= 3) {
          console.error('[ConnectionMonitor] Max retries reached, discarding:', error)
          this.syncQueue.shift()
        } else {
          (syncFn as any)._retryCount = retryCount + 1
          // Move to end of queue for retry
          this.syncQueue.shift()
          this.syncQueue.push(syncFn)
        }
      }
    }

    this.isProcessingQueue = false

    if (errors.length > 0) {
      this.updateStatus('error')
      setTimeout(() => {
        if (this.currentStatus === 'error') {
          this.updateStatus('online')
        }
      }, 3000)
    } else {
      this.updateStatus('synced')
      // Auto-clear synced status after 2 seconds
      setTimeout(() => {
        if (this.currentStatus === 'synced') {
          this.updateStatus('online')
        }
      }, 2000)
    }
  }

  static clearQueue() {
    this.syncQueue = []
    console.log('[ConnectionMonitor] Sync queue cleared')
  }

  static getQueueSize(): number {
    return this.syncQueue.length
  }

  static registerSetSyncProvider(provider: SetSyncProvider) {
    this.setSyncProvider = provider
  }

  static getSetSyncStatus(): {
    queueSize: number;
    isOnline: boolean;
    status: ConnectionStatus;
    lastSync?: number;
  } {
    let setSyncStatus = { queueSize: 0, lastSync: undefined }

    if (this.setSyncProvider) {
      try {
        setSyncStatus = this.setSyncProvider.getSetSyncStatus()
      } catch (error) {
        console.error('[ConnectionMonitor] Failed to get set sync status:', error)
      }
    }

    return {
      queueSize: this.syncQueue.length + setSyncStatus.queueSize,
      isOnline: this.isOnline(),
      status: this.currentStatus,
      lastSync: setSyncStatus.lastSync
    }
  }

  static async forceSyncSets(): Promise<void> {
    if (this.setSyncProvider) {
      try {
        await this.setSyncProvider.syncQueuedSets()
      } catch (error) {
        console.error('[ConnectionMonitor] Failed to force sync sets:', error)
      }
    }
  }

  /**
   * Get count of active sync operations
   * Used for debugging and verification
   */
  static getActiveSyncCount(): number {
    return this.activeSyncs.size + this.syncQueue.length
  }

  /**
   * Optional: Wait for syncs if caller needs verification
   * Non-blocking - returns immediately if no syncs pending
   */
  static async waitForPendingSyncs(timeoutMs: number = 2000): Promise<boolean> {
    if (this.activeSyncs.size === 0 && this.syncQueue.length === 0) {
      return true // Nothing to wait for
    }

    console.log(`[ConnectionMonitor] Waiting for ${this.activeSyncs.size} active syncs, ${this.syncQueue.length} queued`)

    try {
      await Promise.race([
        Promise.all(Array.from(this.activeSyncs)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
      ])
      return true // All syncs completed
    } catch {
      console.warn('[ConnectionMonitor] Sync wait timed out (syncs continue in background)')
      return false // Timeout (syncs still running)
    }
  }
}

