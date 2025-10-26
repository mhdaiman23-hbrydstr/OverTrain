/**
 * StorageLock: Atomic localStorage operations
 *
 * Prevents race conditions in multi-tab environments where multiple
 * operations try to read-modify-write the same localStorage key simultaneously.
 *
 * Example race condition (BEFORE):
 * Tab A: get localStorage['workouts'] → [workout1]
 * Tab B: get localStorage['workouts'] → [workout1]
 * Tab A: set localStorage['workouts'] = [workout1, workout2]
 * Tab B: set localStorage['workouts'] = [workout1, workout3]  ← lost workout2!
 *
 * Solution: Lock the operation so only one tab can read-modify-write at a time.
 */

class StorageLock {
  private static locks = new Map<string, boolean>()
  private static queues = new Map<string, Array<() => void>>()

  /**
   * Execute a function with exclusive access to a localStorage key
   * Waits in queue if another operation is already using this key
   */
  static async withLock<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const isLocked = this.locks.get(key)
    if (isLocked) {
      // Key is locked, queue this operation
      return new Promise(resolve => {
        const queue = this.queues.get(key) || []
        queue.push(() => {
          resolve(this._executeWithLock(key, fn))
        })
        this.queues.set(key, queue)
      })
    }

    // Key is free, execute immediately
    return this._executeWithLock(key, fn)
  }

  /**
   * Internal: Execute the function while holding the lock
   * Always releases lock in finally block to prevent deadlocks
   */
  private static async _executeWithLock<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    this.locks.set(key, true)
    try {
      return await fn()
    } finally {
      this.locks.set(key, false)
      // Process next waiter in queue, if any
      const queue = this.queues.get(key)
      if (queue && queue.length > 0) {
        const next = queue.shift()
        next?.()
      }
    }
  }
}

export { StorageLock }
