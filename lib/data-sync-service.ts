import { supabase } from "./supabase"
import { ConnectionMonitor } from "./connection-monitor"
import type { WorkoutSession, WorkoutSet } from "./workout-logger"

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  lastSync?: number
  queueSize: number
  hasErrors: boolean
}

export interface SyncOperation {
  id: string
  type: 'workout' | 'set' | 'workout_completion'
  data: any
  timestamp: number
  retryCount: number
  maxRetries: number
}

/**
 * Enhanced Data Sync Service - Database First with Instant UI
 * 
 * This service implements the dual-write pattern with:
 * 1. Instant localStorage updates (optimistic UI)
 * 2. Background database sync (non-blocking)
 * 3. Retry logic and error handling
 * 4. Sync status tracking
 */
export class DataSyncService {
  private static readonly SYNC_QUEUE_KEY = 'liftlog_sync_queue'
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY_BASE = 1000 // 1 second base delay
  
  /**
   * Save workout with enhanced dual-write pattern
   * Provides instant UI response while syncing to database in background
   */
  static async saveWorkoutOptimistic(
    workout: WorkoutSession,
    userId: string,
    localStorageKey: string
  ): Promise<{ success: boolean; syncId: string }> {
    const syncId = `workout-${workout.id}-${Date.now()}`
    
    // Step 1: Instant localStorage update (optimistic UI)
    try {
      const existing = localStorage.getItem(localStorageKey)
      let workouts: WorkoutSession[] = existing ? JSON.parse(existing) : []
      
      // Remove existing workout for this week/day
      workouts = workouts.filter((w) => !(w.week === workout.week && w.day === workout.day))
      
      // Add updated workout
      workouts.push(workout)
      
      localStorage.setItem(localStorageKey, JSON.stringify(workouts))
      console.log(`[DataSync] ✅ Instant localStorage update for workout ${workout.id}`)
    } catch (error) {
      console.error('[DataSync] ❌ localStorage update failed:', error)
      return { success: false, syncId }
    }
    
    // Step 2: Queue for database sync (non-blocking)
    const syncOperation: SyncOperation = {
      id: syncId,
      type: 'workout',
      data: {
        workout: this.sanitizeWorkoutForDB(workout),
        userId,
        localStorageKey
      },
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.MAX_RETRIES
    }
    
    this.addToSyncQueue(syncOperation)
    this.processSyncQueue()
    
    console.log(`[DataSync] 🔄 Workout ${workout.id} queued for database sync (ID: ${syncId})`)
    
    return { success: true, syncId }
  }
  
  /**
   * Save set completion with instant UI response
   */
  static async saveSetOptimistic(
    workoutId: string,
    exerciseId: string,
    setId: string,
    setData: Partial<WorkoutSet>,
    userId: string,
    workout: WorkoutSession,
    localStorageKey: string
  ): Promise<{ success: boolean; syncId: string }> {
    const syncId = `set-${setId}-${Date.now()}`
    
    // Step 1: Instant localStorage update (optimistic UI)
    try {
      // Update set in workout
      const exercise = workout.exercises.find(ex => ex.id === exerciseId)
      if (exercise) {
        const set = exercise.sets.find(s => s.id === setId)
        if (set) {
          Object.assign(set, setData)
        }
      }
      
      // Save updated workout to localStorage
      const existing = localStorage.getItem(localStorageKey)
      let workouts: WorkoutSession[] = existing ? JSON.parse(existing) : []
      
      workouts = workouts.filter((w) => w.id !== workoutId)
      workouts.push(workout)
      
      localStorage.setItem(localStorageKey, JSON.stringify(workouts))
      console.log(`[DataSync] ✅ Instant set update for set ${setId}`)
    } catch (error) {
      console.error('[DataSync] ❌ Set localStorage update failed:', error)
      return { success: false, syncId }
    }
    
    // Step 2: Log set to database (immediate, not queued)
    if (setData.completed && setData.reps && setData.weight) {
      const exercise = workout.exercises.find(ex => ex.id === exerciseId)
      const setNumber = exercise?.sets.findIndex(s => s.id === setId) + 1 || 1
      const exerciseName = exercise?.exerciseName || 'Unknown Exercise'
      
      // Try immediate sync, but don't block UI
      this.logSetToDatabase(workoutId, exerciseId, exerciseName, setNumber, setData.reps, setData.weight, userId, workout.week, workout.day)
        .catch(error => {
          console.warn('[DataSync] Set sync failed, will retry via queue:', error)
          // Queue for retry if immediate sync fails
          const syncOperation: SyncOperation = {
            id: syncId,
            type: 'set',
            data: {
              workoutId,
              exerciseId,
              exerciseName,
              setNumber,
              reps: setData.reps,
              weight: setData.weight,
              userId,
              week: workout.week,
              day: workout.day
            },
            timestamp: Date.now(),
            retryCount: 0,
            maxRetries: this.MAX_RETRIES
          }
          this.addToSyncQueue(syncOperation)
        })
    }
    
    return { success: true, syncId }
  }
  
  /**
   * Get current sync status
   */
  static getSyncStatus(): SyncStatus {
    const queue = this.getSyncQueue()
    const connectionStatus = ConnectionMonitor.getStatus()
    
    return {
      isOnline: connectionStatus === 'online',
      isSyncing: connectionStatus === 'syncing',
      lastSync: this.getLastSyncTime(),
      queueSize: queue.length,
      hasErrors: queue.some(op => op.retryCount > 0)
    }
  }
  
  /**
   * Force sync all pending operations
   */
  static async forceSyncAll(): Promise<void> {
    console.log('[DataSync] 🔄 Force syncing all pending operations...')
    
    // Process sync queue
    await this.processSyncQueue()
    
    // Also sync any queued sets from the old system
    if (typeof window !== 'undefined' && (window as any).WorkoutLoggerDev) {
      await (window as any).WorkoutLoggerDev.syncQueuedSets()
    }
    
    console.log('[DataSync] ✅ Force sync completed')
  }
  
  /**
   * Clear sync queue (for rollback scenarios)
   */
  static clearSyncQueue(): void {
    if (typeof window === 'undefined') return
    
    localStorage.removeItem(this.SYNC_QUEUE_KEY)
    console.log('[DataSync] 🗑️ Sync queue cleared')
  }
  
  /**
   * Get sync queue for debugging
   */
  static getSyncQueue(): SyncOperation[] {
    if (typeof window === 'undefined') return []
    
    try {
      const queueData = localStorage.getItem(this.SYNC_QUEUE_KEY)
      return queueData ? JSON.parse(queueData) : []
    } catch {
      return []
    }
  }
  
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  
  /**
   * Add operation to sync queue
   */
  private static addToSyncQueue(operation: SyncOperation): void {
    if (typeof window === 'undefined') return
    
    try {
      const queue = this.getSyncQueue()
      
      // Remove existing operation with same ID if exists
      const filteredQueue = queue.filter(op => op.id !== operation.id)
      filteredQueue.push(operation)
      
      localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(filteredQueue))
    } catch (error) {
      console.error('[DataSync] Failed to add to sync queue:', error)
    }
  }
  
  /**
   * Process sync queue with retry logic
   */
  private static async processSyncQueue(): Promise<void> {
    if (!ConnectionMonitor.isOnline() || !supabase) {
      console.log('[DataSync] ⏸️ Sync paused - offline or no database')
      return
    }
    
    const queue = this.getSyncQueue()
    if (queue.length === 0) {
      console.log('[DataSync] ✅ Sync queue empty')
      return
    }
    
    console.log(`[DataSync] 🔄 Processing ${queue.length} queued operations...`)
    
    const successfulOps: string[] = []
    const failedOps: SyncOperation[] = []
    
    for (const operation of queue) {
      try {
        ConnectionMonitor.updateStatus('syncing')
        
        const success = await this.executeSyncOperation(operation)
        
        if (success) {
          successfulOps.push(operation.id)
          console.log(`[DataSync] ✅ Sync success: ${operation.type} ${operation.id}`)
        } else {
          // Retry logic
          if (operation.retryCount < operation.maxRetries) {
            operation.retryCount++
            operation.timestamp = Date.now()
            failedOps.push(operation)
            console.log(`[DataSync] 🔄 Queueing retry ${operation.retryCount}/${operation.maxRetries}: ${operation.id}`)
            
            // Exponential backoff
            const delay = this.RETRY_DELAY_BASE * Math.pow(2, operation.retryCount - 1)
            await new Promise(resolve => setTimeout(resolve, delay))
          } else {
            console.error(`[DataSync] ❌ Max retries exceeded: ${operation.id}`)
          }
        }
      } catch (error) {
        console.error(`[DataSync] ❌ Sync operation failed: ${operation.id}`, error)
        
        if (operation.retryCount < operation.maxRetries) {
          operation.retryCount++
          operation.timestamp = Date.now()
          failedOps.push(operation)
        }
      }
    }
    
    // Update queue
    const remainingQueue = queue.filter(op => !successfulOps.includes(op.id))
    const finalQueue = [...remainingQueue, ...failedOps]
    localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(finalQueue))
    
    // Update status
    ConnectionMonitor.updateStatus(successfulOps.length > 0 ? 'synced' : 'online')
    this.updateLastSyncTime()
    
    console.log(`[DataSync] 📊 Sync completed: ${successfulOps.length} success, ${finalQueue.length} remaining`)
  }
  
  /**
   * Execute individual sync operation
   */
  private static async executeSyncOperation(operation: SyncOperation): Promise<boolean> {
    switch (operation.type) {
      case 'workout':
        return await this.syncWorkoutToDatabase(operation.data)
      case 'set':
        return await this.logSetToDatabase(
          operation.data.workoutId,
          operation.data.exerciseId,
          operation.data.exerciseName,
          operation.data.setNumber,
          operation.data.reps,
          operation.data.weight,
          operation.data.userId,
          operation.data.week,
          operation.data.day
        )
      case 'workout_completion':
        return await this.syncWorkoutCompletionToDatabase(operation.data)
      default:
        console.warn('[DataSync] Unknown operation type:', operation.type)
        return false
    }
  }
  
  /**
   * Sync workout to database
   */
  private static async syncWorkoutToDatabase(data: any): Promise<boolean> {
    try {
      if (!supabase) {
        console.error('[DataSync] Supabase not available')
        return false
      }
      
      const { workout, userId } = data
      
      const { error } = await supabase
        .from('in_progress_workouts')
        .upsert({
          id: workout.id,
          user_id: userId,
          program_id: workout.programId || null,
          workout_name: workout.workoutName,
          start_time: workout.startTime,
          week: workout.week,
          day: workout.day,
          exercises: workout.exercises,
          notes: workout.notes || null,
        }, { onConflict: 'id' })
      
      if (error) {
        console.error('[DataSync] Workout sync error:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('[DataSync] Workout sync failed:', error)
      return false
    }
  }
  
  /**
   * Log set to database
   */
  private static async logSetToDatabase(
    workoutId: string,
    exerciseId: string,
    exerciseName: string,
    setNumber: number,
    reps: number,
    weight: number,
    userId: string,
    week?: number,
    day?: number
  ): Promise<boolean> {
    try {
      if (!supabase) {
        console.error('[DataSync] Supabase not available')
        return false
      }
      
      const setId = `${workoutId}-${exerciseId}-${setNumber}`
      const completedAt = Date.now()
      
      const { error } = await supabase
        .from('workout_sets')
        .upsert({
          id: setId,
          user_id: userId,
          workout_id: workoutId,
          exercise_id: exerciseId,
          exercise_name: exerciseName,
          set_number: setNumber,
          reps,
          weight,
          completed: true,
          completed_at: completedAt,
          notes: null,
          week: week ?? null,
          day: day ?? null,
        }, { onConflict: 'id' })
      
      if (error) {
        console.error('[DataSync] Set sync error:', error)
        return false
      }
      
      return true
    } catch (error) {
      console.error('[DataSync] Set sync failed:', error)
      return false
    }
  }
  
  /**
   * Sync workout completion to database
   */
  private static async syncWorkoutCompletionToDatabase(data: any): Promise<boolean> {
    try {
      if (!supabase) {
        console.error('[DataSync] Supabase not available')
        return false
      }
      
      const { workout, userId } = data
      
      const { error } = await supabase
        .from('workouts')
        .upsert({
          id: workout.id,
          user_id: userId,
          program_id: workout.programId || null,
          workout_name: workout.workoutName,
          start_time: workout.startTime,
          end_time: workout.endTime || null,
          exercises: workout.exercises,
          notes: workout.notes || null,
          completed: workout.completed,
          week: workout.week || null,
          day: workout.day || null,
        }, { onConflict: 'id' })
      
      if (error) {
        console.error('[DataSync] Workout completion sync error:', error)
        return false
      }
      
      // Remove from in_progress table
      await supabase
        .from('in_progress_workouts')
        .delete()
        .eq('id', workout.id)
      
      return true
    } catch (error) {
      console.error('[DataSync] Workout completion sync failed:', error)
      return false
    }
  }
  
  /**
   * Sanitize workout for database (remove circular references, etc.)
   */
  private static sanitizeWorkoutForDB(workout: WorkoutSession): any {
    return {
      id: workout.id,
      userId: workout.userId,
      programId: workout.programId || null,
      workoutName: workout.workoutName,
      startTime: workout.startTime,
      endTime: workout.endTime || null,
      exercises: workout.exercises,
      notes: workout.notes || null,
      completed: workout.completed,
      week: workout.week || null,
      day: workout.day || null,
    }
  }
  
  /**
   * Get last sync time
   */
  private static getLastSyncTime(): number | undefined {
    if (typeof window === 'undefined') return undefined
    
    try {
      const lastSync = localStorage.getItem('liftlog_last_sync')
      return lastSync ? parseInt(lastSync) : undefined
    } catch {
      return undefined
    }
  }
  
  /**
   * Update last sync time
   */
  private static updateLastSyncTime(): void {
    if (typeof window === 'undefined') return
    
    localStorage.setItem('liftlog_last_sync', Date.now().toString())
  }
}

// Development tools
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).DataSyncServiceDev = {
    getSyncStatus: () => DataSyncService.getSyncStatus(),
    getSyncQueue: () => DataSyncService.getSyncQueue(),
    forceSyncAll: () => DataSyncService.forceSyncAll(),
    clearSyncQueue: () => DataSyncService.clearSyncQueue(),
    getSyncStatistics: () => ({
      queueSize: DataSyncService.getSyncQueue().length,
      lastSync: DataSyncService.getSyncStatus().lastSync,
      status: DataSyncService.getSyncStatus()
    })
  }
  console.log('[DataSync] Development tools available at window.DataSyncServiceDev')
}
