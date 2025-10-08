/**
 * Database-First Workout Logger Hook
 * 
 * This hook replaces the previous localStorage-first approach with a database-first
 * architecture while maintaining instant UI responsiveness through optimistic updates.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { DataSyncService } from '@/lib/data-sync-service'
import { ConnectionMonitor } from '@/lib/connection-monitor'
import type { WorkoutSession, WorkoutSet, WorkoutExercise } from './workout-logger'

// Define Exercise type locally since it's not exported from workout-logger
interface Exercise {
  id: string
  name: string
  targetSets?: number
}

export interface UseWorkoutLoggerDatabaseFirstOptions {
  programId?: string
  userId: string
  autoStart?: boolean
  enableNotifications?: boolean
}

export interface UseWorkoutLoggerDatabaseFirstReturn {
  // State
  workout: WorkoutSession | null
  isLoading: boolean
  error: string | null
  syncStatus: {
    isOnline: boolean
    isSyncing: boolean
    lastSync?: number
    queueSize: number
    hasErrors: boolean
  }
  
  // Actions
  startWorkout: (workoutName: string, week: number, day: number, exercises?: Exercise[]) => Promise<void>
  completeSet: (exerciseId: string, setId: string, setData: Partial<WorkoutSet>) => Promise<void>
  completeWorkout: (notes?: string) => Promise<void>
  pauseWorkout: () => void
  resumeWorkout: () => void
  abandonWorkout: () => Promise<void>
  
  // Sync actions
  forceSync: () => Promise<void>
  clearSyncQueue: () => void
  
  // Utilities
  formatDuration: (milliseconds: number) => string
  getCompletionStats: () => {
    totalSets: number
    completedSets: number
    completionPercentage: number
    totalWeight: number
  }
}

const STORAGE_KEY = 'workout-logger-database-first'

export function useWorkoutLoggerDatabaseFirst({
  programId,
  userId,
  autoStart = false,
  enableNotifications = true
}: UseWorkoutLoggerDatabaseFirstOptions): UseWorkoutLoggerDatabaseFirstReturn {
  const [workout, setWorkout] = useState<WorkoutSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState(DataSyncService.getSyncStatus())
  
  const syncStatusInterval = useRef<NodeJS.Timeout>()
  const connectionMonitorInterval = useRef<NodeJS.Timeout>()

  // Initialize connection monitoring
  useEffect(() => {
    // Update sync status periodically
    const updateSyncStatus = () => {
      setSyncStatus(DataSyncService.getSyncStatus())
    }
    
    updateSyncStatus()
    syncStatusInterval.current = setInterval(updateSyncStatus, 1000)
    
    // Monitor connection changes
    connectionMonitorInterval.current = setInterval(() => {
      const status = ConnectionMonitor.getStatus()
      if (status === 'online' && syncStatus.queueSize > 0) {
        // Try to sync pending operations when coming back online
        DataSyncService.forceSyncAll()
      }
      updateSyncStatus()
    }, 2000)
    
    return () => {
      if (syncStatusInterval.current) {
        clearInterval(syncStatusInterval.current)
      }
      if (connectionMonitorInterval.current) {
        clearInterval(connectionMonitorInterval.current)
      }
    }
  }, [])

  // Load existing workout on mount
  useEffect(() => {
    loadExistingWorkout()
  }, [userId])

  const loadExistingWorkout = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Step 1: Check for in-progress workout in database (priority)
      if (supabase) {
        const { data: dbWorkout, error: dbError } = await supabase
          .from('in_progress_workouts')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (dbWorkout && !dbError) {
          console.log('[WorkoutLogger] 🔄 Resuming workout from database')
          setWorkout({
            id: dbWorkout.id,
            userId: dbWorkout.user_id,
            programId: dbWorkout.program_id,
            workoutName: dbWorkout.workout_name,
            startTime: dbWorkout.start_time,
            endTime: undefined,
            exercises: dbWorkout.exercises,
            notes: dbWorkout.notes || undefined,
            completed: false,
            week: dbWorkout.week,
            day: dbWorkout.day,
          })
          setIsLoading(false)
          return
        }
      }

      // Step 2: Fallback to localStorage
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const workouts: WorkoutSession[] = JSON.parse(stored)
        const activeWorkout = workouts.find(w => !w.completed)
        
        if (activeWorkout) {
          console.log('[WorkoutLogger] 📱 Resuming workout from localStorage')
          setWorkout(activeWorkout)
          
          // Sync to database
          DataSyncService.saveWorkoutOptimistic(activeWorkout, userId, STORAGE_KEY)
        }
      }

    } catch (err) {
      console.error('[WorkoutLogger] Failed to load workout:', err)
      setError('Failed to load existing workout')
    } finally {
      setIsLoading(false)
    }
  }

  const startWorkout = useCallback(async (
    workoutName: string,
    week: number,
    day: number,
    exercises: Exercise[] = []
  ) => {
    try {
      setError(null)

      // Validate inputs
      if (!workoutName.trim()) {
        throw new Error('Workout name is required')
      }
      if (!userId) {
        throw new Error('User ID is required')
      }

      const newWorkout: WorkoutSession = {
        id: `workout-${Date.now()}`,
        userId,
        programId: programId || undefined,
        workoutName: workoutName.trim(),
        startTime: Date.now(),
        endTime: undefined,
        exercises: exercises.map(ex => ({
          id: `exercise-${Date.now()}-${Math.random()}`,
          exerciseId: ex.id,
          exerciseName: ex.name,
          targetSets: ex.targetSets || 3,
          targetReps: "8", // Default target reps as string
          targetRest: "90", // Default rest time in seconds as string
          completed: false,
          sets: Array.from({ length: ex.targetSets || 3 }, (_, i) => ({
            id: `set-${Date.now()}-${Math.random()}-${i}`,
            setNumber: i + 1,
            completed: false,
            reps: 0,
            weight: 0,
          })),
        })),
        notes: '',
        completed: false,
        week,
        day,
      }

      // Save with dual-write pattern
      const result = await DataSyncService.saveWorkoutOptimistic(newWorkout, userId, STORAGE_KEY)
      
      if (!result.success) {
        throw new Error('Failed to save workout')
      }

      setWorkout(newWorkout)
      console.log('[WorkoutLogger] ✅ Workout started successfully')

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start workout'
      console.error('[WorkoutLogger] Start workout error:', errorMessage)
      setError(errorMessage)
      throw err
    }
  }, [userId, programId])

  const completeSet = useCallback(async (
    exerciseId: string,
    setId: string,
    setData: Partial<WorkoutSet>
  ) => {
    if (!workout) {
      throw new Error('No active workout')
    }

    try {
      // Update state optimistically (instant UI)
      setWorkout(prev => {
        if (!prev) return prev
        
        const updatedWorkout = { ...prev }
        const exercise = updatedWorkout.exercises.find(ex => ex.id === exerciseId)
        
        if (exercise) {
          const set = exercise.sets.find(s => s.id === setId)
          if (set) {
            Object.assign(set, setData)
          }
        }
        
        return updatedWorkout
      })

      // Sync to database with instant response
      const result = await DataSyncService.saveSetOptimistic(
        workout.id,
        exerciseId,
        setId,
        setData,
        userId,
        workout,
        STORAGE_KEY
      )

      if (!result.success) {
        console.warn('[WorkoutLogger] Set sync queued, UI updated optimistically')
      }

      // Update sync status
      setSyncStatus(DataSyncService.getSyncStatus())

    } catch (err) {
      console.error('[WorkoutLogger] Complete set error:', err)
      setError('Failed to complete set')
      throw err
    }
  }, [workout, userId])

  const completeWorkout = useCallback(async (notes?: string) => {
    if (!workout) {
      throw new Error('No active workout')
    }

    try {
      setError(null)

      // Update state optimistically
      const completedWorkout: WorkoutSession = {
        ...workout,
        endTime: Date.now(),
        notes: notes || workout.notes,
        completed: true,
      }

      setWorkout(completedWorkout)

      // Sync to database
      await DataSyncService.saveWorkoutOptimistic(completedWorkout, userId, STORAGE_KEY)

      // Update sync status
      setSyncStatus(DataSyncService.getSyncStatus())

      console.log('[WorkoutLogger] ✅ Workout completed successfully')

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete workout'
      console.error('[WorkoutLogger] Complete workout error:', errorMessage)
      setError(errorMessage)
      throw err
    }
  }, [workout, userId])

  const pauseWorkout = useCallback(() => {
    // In this implementation, workouts are auto-paused
    // This could be enhanced with explicit pause state if needed
    console.log('[WorkoutLogger] Workout paused (auto-pause active)')
  }, [])

  const resumeWorkout = useCallback(() => {
    // In this implementation, workouts are auto-resumed when online
    console.log('[WorkoutLogger] Workout resumed')
  }, [])

  const abandonWorkout = useCallback(async () => {
    if (!workout) {
      throw new Error('No active workout')
    }

    try {
      setError(null)

      // Remove from database
      if (supabase) {
        await supabase
          .from('in_progress_workouts')
          .delete()
          .eq('id', workout.id)
      }

      // Clear from localStorage
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const workouts: WorkoutSession[] = JSON.parse(stored)
        const filtered = workouts.filter(w => w.id !== workout.id)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
      }

      setWorkout(null)
      console.log('[WorkoutLogger] 🗑️ Workout abandoned')

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to abandon workout'
      console.error('[WorkoutLogger] Abandon workout error:', errorMessage)
      setError(errorMessage)
      throw err
    }
  }, [workout])

  const forceSync = useCallback(async () => {
    try {
      await DataSyncService.forceSyncAll()
      setSyncStatus(DataSyncService.getSyncStatus())
      console.log('[WorkoutLogger] 🔄 Manual sync triggered')
    } catch (err) {
      console.error('[WorkoutLogger] Manual sync failed:', err)
      setError('Manual sync failed')
    }
  }, [])

  const clearSyncQueue = useCallback(() => {
    DataSyncService.clearSyncQueue()
    setSyncStatus(DataSyncService.getSyncStatus())
    console.log('[WorkoutLogger] 🗑️ Sync queue cleared')
  }, [])

  const formatDuration = useCallback((milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }, [])

  const getCompletionStats = useCallback(() => {
    if (!workout) {
      return {
        totalSets: 0,
        completedSets: 0,
        completionPercentage: 0,
        totalWeight: 0,
      }
    }

    let totalSets = 0
    let completedSets = 0
    let totalWeight = 0

    workout.exercises.forEach(exercise => {
      exercise.sets.forEach(set => {
        totalSets++
        if (set.completed) {
          completedSets++
          totalWeight += (set.reps || 0) * (set.weight || 0)
        }
      })
    })

    return {
      totalSets,
      completedSets,
      completionPercentage: totalSets > 0 ? (completedSets / totalSets) * 100 : 0,
      totalWeight,
    }
  }, [workout])

  return {
    // State
    workout,
    isLoading,
    error,
    syncStatus,
    
    // Actions
    startWorkout,
    completeSet,
    completeWorkout,
    pauseWorkout,
    resumeWorkout,
    abandonWorkout,
    
    // Sync actions
    forceSync,
    clearSyncQueue,
    
    // Utilities
    formatDuration,
    getCompletionStats,
  }
}
