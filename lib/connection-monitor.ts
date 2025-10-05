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

  static addToQueue(syncFn: () => Promise<void>) {
    this.syncQueue.push(syncFn)
    console.log('[ConnectionMonitor] Added to sync queue, total:', this.syncQueue.length)

    // If online, process immediately
    if (this.isOnline() && !this.isProcessingQueue) {
      this.processQueue()
    }
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
    let setSyncStatus: { queueSize: number; lastSync?: number } = { queueSize: 0, lastSync: undefined }

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
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  ConnectionMonitor.initialize()
}
