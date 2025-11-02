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

export class StorageTelemetry {
  private static lastWarningAt = 0
  private static readonly WARNING_INTERVAL_MS = 30_000

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
