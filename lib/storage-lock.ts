/**
 * StorageLock - Prevents race conditions in localStorage operations
 *
 * Problem: Multiple tabs/operations can corrupt localStorage by interleaving reads/writes
 *
 * Example without lock:
 *   Tab A: read [W1, W2]
 *   Tab B: read [W1, W2]  (both read same data)
 *   Tab A: add W3, write [W1, W2, W3]
 *   Tab B: add W4, write [W1, W2, W4]  ← Tab A's W3 is lost!
 *
 * With lock: operations queue and execute sequentially (imperceptible to user)
 */

class StorageLock {
  private static locks = new Map<string, boolean>()
  private static queues = new Map<string, Array<() => void>>()

  /**
   * Execute a function with exclusive access to a localStorage key
   *
   * @param key - localStorage key to lock (e.g., "liftlog_workouts")
   * @param fn - Function to execute atomically
   * @returns Result of the function
   *
   * @example
   * await StorageLock.withLock("workouts", async () => {
   *   const data = localStorage.getItem("workouts")
   *   const parsed = JSON.parse(data)
   *   parsed.push(newWorkout)
   *   localStorage.setItem("workouts", JSON.stringify(parsed))
   * })
   */
  static async withLock<T>(key: string, fn: () => Promise<T> | T): Promise<T> {
    const isLocked = this.locks.get(key)

    if (isLocked) {
      // Lock is busy - wait in queue
      return new Promise((resolve) => {
        const queue = this.queues.get(key) || []
        queue.push(() => {
          this._executeWithLock(key, fn).then(resolve)
        })
        this.queues.set(key, queue)
      })
    }

    // Lock is available - acquire and execute immediately
    return this._executeWithLock(key, fn)
  }

  private static async _executeWithLock<T>(
    key: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    this.locks.set(key, true)

    try {
      // Execute user's function - could be sync or async
      const result = await Promise.resolve(fn())
      return result
    } finally {
      this.locks.set(key, false)

      // Process next operation in queue
      const queue = this.queues.get(key)
      if (queue && queue.length > 0) {
        const next = queue.shift()
        next?.()
      } else {
        // Clean up empty queue
        this.queues.delete(key)
      }
    }
  }

  /**
   * Synchronous version for non-async operations
   * Use when you know your function won't be async
   */
  static withLockSync<T>(key: string, fn: () => T): T {
    if (this.locks.get(key)) {
      throw new Error(
        `StorageLock: Cannot use sync lock on "${key}" when lock is already held. Use async withLock() instead.`
      )
    }

    this.locks.set(key, true)
    try {
      return fn()
    } finally {
      this.locks.set(key, false)
      const queue = this.queues.get(key)
      if (queue && queue.length > 0) {
        const next = queue.shift()
        next?.()
      } else {
        this.queues.delete(key)
      }
    }
  }

  /**
   * Clear all locks (use only for testing/emergency recovery)
   */
  static reset() {
    this.locks.clear()
    this.queues.clear()
  }

  /**
   * Check if a key is currently locked (for debugging)
   */
  static isLocked(key: string): boolean {
    return this.locks.get(key) === true
  }

  /**
   * Get queue length for a key (for debugging)
   */
  static getQueueLength(key: string): number {
    return this.queues.get(key)?.length ?? 0
  }
}

export { StorageLock }
