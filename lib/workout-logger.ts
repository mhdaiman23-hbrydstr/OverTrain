import { supabase } from "./supabase"
import type { WorkoutDay, ExerciseTemplate } from "./gym-templates"
import { ConnectionMonitor, type SetSyncProvider } from "./connection-monitor"

export interface WorkoutSet {
  id: string
  reps: number
  weight: number
  completed: boolean
  restStartTime?: number
  notes?: string
  skipped?: boolean
}

export interface WorkoutExercise {
  id: string
  exerciseId: string
  exerciseName: string
  targetSets: number
  targetReps: string
  targetRest: string
  suggestedWeight?: number
  progressionNote?: string
  sets: WorkoutSet[]
  completed: boolean
  startTime?: number
  endTime?: number
  notes?: string
  skipped?: boolean
  // Progression metadata for volume compensation
  bounds?: { min: number; max: number }
  strategy?: string
  tier?: string
  baseVolume?: number
  userOverridden?: boolean
}

export interface WorkoutSession {
  id: string
  userId: string
  programId?: string
  workoutName: string
  startTime: number
  endTime?: number
  exercises: WorkoutExercise[]
  notes?: string
  completed: boolean
  week?: number
  day?: number
  skipped?: boolean
}

export class WorkoutLogger implements SetSyncProvider {
  private static readonly STORAGE_KEY = "liftlog_workouts"
  private static readonly IN_PROGRESS_KEY = "liftlog_in_progress_workouts"

  // Instance methods required by SetSyncProvider interface
  getSetSyncStatus(): { queueSize: number; lastSync?: number } {
    return WorkoutLogger.getSetSyncStatus()
  }

  async syncQueuedSets(): Promise<void> {
    return WorkoutLogger.syncQueuedSets()
  }

  static getUserStorageKeys(userId?: string): { workouts: string; inProgress: string } {
    // Always try to get current user ID if not provided
    if (!userId && typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem("liftlog_user")
        const currentUser = storedUser ? JSON.parse(storedUser) : null
        userId = currentUser?.id
      } catch {
        // Fallback to anonymous if localStorage is not available
      }
    }

    if (userId) {
      return {
        workouts: `${this.STORAGE_KEY}_${userId}`,
        inProgress: `${this.IN_PROGRESS_KEY}_${userId}`
      }
    }

    // Only use global keys for truly anonymous users
    return {
      workouts: this.STORAGE_KEY,
      inProgress: this.IN_PROGRESS_KEY
    }
  }

  // Register as set sync provider when module loads
  static {
    ConnectionMonitor.registerSetSyncProvider(new WorkoutLogger())

    // Attach testing methods to window object in development
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      (window as any).WorkoutLoggerDev = {
        testOfflineSync: (userId: string) => this.testOfflineSync(userId),
        getSyncStatistics: (userId?: string) => this.getSyncStatistics(userId),
        syncQueuedSets: () => this.syncQueuedSets(),
        getSetSyncStatus: () => this.getSetSyncStatus(),
        forceSyncSets: () => ConnectionMonitor.forceSyncSets(),
        resolveSetConflicts: (userId: string) => this.resolveSetConflicts(userId),
        validateWorkoutIntegrity: (userId: string, workoutId: string) =>
          this.validateWorkoutSetIntegrity(userId, workoutId),
        // New: Manual sync tools for restoring data
        syncCurrentDataToDatabase: (userId: string) => this.syncToDatabase(userId),
        loadFromDatabase: (userId: string) => this.loadFromDatabase(userId, true),
        debugLocalStorage: () => this.debugLocalStorage(),
        // New: Migration tools
        migrateGlobalToUserSpecific: (userId: string) => this.migrateGlobalToUserSpecific(userId),
        cleanupCorruptedWorkouts: (userId?: string) => this.cleanupCorruptedWorkouts(userId),
        validateAndRepairWorkoutIntegrity: (userId?: string) => this.validateAndRepairWorkoutIntegrity(userId),
        // New: Database debugging tools
        debugDatabaseAccess: (userId: string) => this.debugDatabaseAccess(userId),
        forceLoadFromDatabase: (userId: string) => this.forceLoadFromDatabase(userId)
      }
      console.log("[WorkoutLogger] Development tools available at window.WorkoutLoggerDev")
    }
  }

  /**
   * Debug localStorage contents
   */
  static debugLocalStorage() {
    if (typeof window === "undefined") return

    console.log("=== LocalStorage Debug Info ===")

    // Get current user
    const currentUser = localStorage.getItem("liftlog_user")
    console.log("Current User:", currentUser ? JSON.parse(currentUser) : null)

    // Show all liftlog storage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith("liftlog_")) {
        const value = localStorage.getItem(key)
        const data = value ? JSON.parse(value) : null
        console.log(`\n${key}:`, data ? `${Array.isArray(data) ? data.length + ' items' : typeof data}` : 'null')
        if (data && Array.isArray(data) && data.length > 0) {
          console.log("First item:", data[0])
        }
      }
    }
    console.log("=== End Debug Info ===")
  }

  /**
   * Migrate data from global keys to user-specific keys
   */
  static migrateGlobalToUserSpecific(userId: string): void {
    if (typeof window === "undefined") return

    console.log("[WorkoutLogger] Starting migration from global to user-specific keys for user:", userId)

    const userSpecificKeys = this.getUserStorageKeys(userId)
    let migratedCount = 0

    // Migrate completed workouts
    try {
      const globalWorkouts = localStorage.getItem(this.STORAGE_KEY)
      const userWorkouts = localStorage.getItem(userSpecificKeys.workouts)

      if (globalWorkouts && !userWorkouts) {
        const workouts: WorkoutSession[] = JSON.parse(globalWorkouts)
        // Filter workouts that belong to this user (if possible to determine)
        const userWorkoutsData = workouts.filter(w => w.userId === userId || w.userId === "anonymous")

        if (userWorkoutsData.length > 0) {
          localStorage.setItem(userSpecificKeys.workouts, JSON.stringify(userWorkoutsData))
          migratedCount += userWorkoutsData.length
          console.log(`[WorkoutLogger] Migrated ${userWorkoutsData.length} completed workouts to user-specific storage`)
        }
      }
    } catch (error) {
      console.error("[WorkoutLogger] Failed to migrate completed workouts:", error)
    }

    // Migrate in-progress workouts
    try {
      const globalInProgress = localStorage.getItem(this.IN_PROGRESS_KEY)
      const userInProgress = localStorage.getItem(userSpecificKeys.inProgress)

      if (globalInProgress && !userInProgress) {
        const inProgress: WorkoutSession[] = JSON.parse(globalInProgress)
        const userInProgressData = inProgress.filter(w => w.userId === userId || w.userId === "anonymous")

        if (userInProgressData.length > 0) {
          localStorage.setItem(userSpecificKeys.inProgress, JSON.stringify(userInProgressData))
          migratedCount += userInProgressData.length
          console.log(`[WorkoutLogger] Migrated ${userInProgressData.length} in-progress workouts to user-specific storage`)
        }
      }
    } catch (error) {
      console.error("[WorkoutLogger] Failed to migrate in-progress workouts:", error)
    }

    // After successful migration, optionally clean up global data
    if (migratedCount > 0) {
      console.log(`[WorkoutLogger] Migration completed. Total items migrated: ${migratedCount}`)
      // Note: Not clearing global data immediately to allow for rollback
    }
  }

  /**
   * Remove old skipped workouts from history
   * Skipped workouts should not be in completed history
   */
  static cleanupSkippedWorkoutsFromHistory(userId?: string): void {
    if (typeof window === "undefined") return

    const storageKeys = this.getUserStorageKeys(userId)

    try {
      const historyRaw = localStorage.getItem(storageKeys.workouts)
      if (!historyRaw) return

      const history: WorkoutSession[] = JSON.parse(historyRaw)
      const originalCount = history.length

      // Filter out workouts with "skipped-" in the ID
      const cleanedHistory = history.filter(workout => {
        if (workout.id.includes('skipped-')) {
          console.log(`[WorkoutLogger] 🗑️ Removing skipped workout from history: Week ${workout.week} Day ${workout.day} (${workout.id})`)
          return false
        }
        return true
      })

      const removedCount = originalCount - cleanedHistory.length

      if (removedCount > 0) {
        localStorage.setItem(storageKeys.workouts, JSON.stringify(cleanedHistory))
        console.log(`[WorkoutLogger] ✅ Cleaned up ${removedCount} skipped workouts from history`)
      } else {
        console.log(`[WorkoutLogger] ✓ No skipped workouts found in history`)
      }
    } catch (error) {
      console.error("[WorkoutLogger] Failed to cleanup skipped workouts:", error)
    }
  }

  /**
   * Migrate completed workouts from in-progress storage to history
   * This fixes workouts that were marked complete but never moved to history
   * Also removes duplicates where the same workout exists in both locations
   */
  static migrateCompletedWorkoutsToHistory(userId?: string): void {
    if (typeof window === "undefined") return

    const storageKeys = this.getUserStorageKeys(userId)
    let migratedCount = 0
    let deduplicatedCount = 0

    try {
      // Check BOTH global and user-specific keys (for backward compatibility)
      const globalInProgressRaw = localStorage.getItem(this.IN_PROGRESS_KEY)
      const userInProgressRaw = localStorage.getItem(storageKeys.inProgress)
      
      // Get history from user-specific key
      const historyRaw = localStorage.getItem(storageKeys.workouts)
      const history: WorkoutSession[] = historyRaw ? JSON.parse(historyRaw) : []
      
      // Build a map of completed workouts in history by week/day for fast lookup
      const historyByWeekDay = new Map<string, WorkoutSession>()
      history.forEach(w => {
        if (w.completed && w.week && w.day) {
          const key = `${w.week}-${w.day}`
          // Keep the workout with the most recent startTime or most data
          const existing = historyByWeekDay.get(key)
          if (!existing || (w.startTime || 0) > (existing.startTime || 0)) {
            historyByWeekDay.set(key, w)
          }
        }
      })

      // Process both global and user-specific in-progress storage
      const keysToProcess = [
        { key: this.IN_PROGRESS_KEY, label: 'global' },
        { key: storageKeys.inProgress, label: 'user-specific' }
      ]

      for (const { key, label } of keysToProcess) {
        const inProgressRaw = localStorage.getItem(key)
        if (!inProgressRaw) continue

        console.log(`[WorkoutLogger] Checking ${label} in-progress storage for completed workouts...`)

        const inProgressWorkouts: WorkoutSession[] = JSON.parse(inProgressRaw)
        
        // Separate completed from in-progress
        const completedWorkouts = inProgressWorkouts.filter(w => w.completed)
        const stillInProgress = inProgressWorkouts.filter(w => !w.completed)

        if (completedWorkouts.length > 0) {
          console.log(`[WorkoutLogger] Found ${completedWorkouts.length} completed workouts in ${label} in-progress storage`)

          // For each completed workout, check if it should be migrated or deduplicated
          completedWorkouts.forEach(workout => {
            if (!workout.week || !workout.day) return

            const weekDayKey = `${workout.week}-${workout.day}`
            const existingInHistory = historyByWeekDay.get(weekDayKey)

            if (!existingInHistory) {
              // No workout in history for this week/day - migrate this one
              history.push(workout)
              historyByWeekDay.set(weekDayKey, workout)
              migratedCount++
              console.log(`[WorkoutLogger] ✅ Migrated completed workout: Week ${workout.week} Day ${workout.day}`)
            } else {
              // Workout already exists in history - this is a duplicate, don't migrate
              deduplicatedCount++
              console.log(`[WorkoutLogger] 🗑️ Removed duplicate: Week ${workout.week} Day ${workout.day} (already in history)`)
            }
          })
        }

        // Save the cleaned in-progress storage (only actual in-progress workouts remain)
        if (completedWorkouts.length > 0) {
          localStorage.setItem(key, JSON.stringify(stillInProgress))
          console.log(`[WorkoutLogger] ${stillInProgress.length} workouts remain in ${label} in-progress storage`)
        }
      }

      // Save updated history if we migrated anything
      if (migratedCount > 0) {
        localStorage.setItem(storageKeys.workouts, JSON.stringify(history))
        console.log(`[WorkoutLogger] ✅ Migrated ${migratedCount} completed workouts to history`)
      }
      
      if (deduplicatedCount > 0) {
        console.log(`[WorkoutLogger] 🧹 Removed ${deduplicatedCount} duplicate completed workouts from in-progress storage`)
      }

      if (migratedCount === 0 && deduplicatedCount === 0) {
        console.log("[WorkoutLogger] ✓ No completed workouts found in in-progress storage - data is clean")
      }

    } catch (error) {
      console.error("[WorkoutLogger] Failed to migrate completed workouts:", error)
    }
  }


  /**
   * Clean up false skipped sets - removes skipped flag from sets that have actual data
   */
  static cleanupFalseSkippedSets(userId?: string): void {
    if (typeof window === "undefined") return

    const storageKeys = this.getUserStorageKeys(userId)
    let cleanedCount = 0

    try {
      // Clean up completed workouts
      const workoutsRaw = localStorage.getItem(storageKeys.workouts)
      if (workoutsRaw) {
        const completedWorkouts: WorkoutSession[] = JSON.parse(workoutsRaw)
        let hasChanges = false

        const cleanedWorkouts = completedWorkouts.map(workout => {
          const cleanedWorkout = { ...workout }

          cleanedWorkout.exercises = cleanedWorkout.exercises.map(exercise => {
            const cleanedExercise = { ...exercise }

            cleanedExercise.sets = cleanedExercise.sets.map(set => {
              // If set is marked as skipped but has actual data (reps > 0 or weight > 0), remove skipped flag
              if (set.skipped && (set.reps > 0 || set.weight > 0)) {
                console.log("[WorkoutLogger] Removing false skipped flag from set with data:", {
                  exercise: exercise.exerciseName,
                  reps: set.reps,
                  weight: set.weight
                })
                cleanedCount++
                hasChanges = true
                return { ...set, skipped: false }
              }
              return set
            })

            // If exercise was marked skipped but has completed sets with data, remove skipped flag
            if (exercise.skipped && cleanedExercise.sets.some(s => s.completed && !s.skipped)) {
              console.log("[WorkoutLogger] Removing false skipped flag from exercise:", exercise.exerciseName)
              cleanedExercise.skipped = false
              hasChanges = true
            }

            return cleanedExercise
          })

          // If workout was marked skipped but has exercises with actual data, remove skipped flag
          if (workout.skipped && cleanedWorkout.exercises.some(ex =>
            ex.sets.some(s => s.completed && (s.reps > 0 || s.weight > 0))
          )) {
            console.log("[WorkoutLogger] Removing false skipped flag from workout:", workout.workoutName)
            cleanedWorkout.skipped = false
            hasChanges = true
          }

          return cleanedWorkout
        })

        if (hasChanges) {
          localStorage.setItem(storageKeys.workouts, JSON.stringify(cleanedWorkouts))
          console.log(`[WorkoutLogger] Cleaned up ${cleanedCount} false skipped sets in completed workouts`)
        }
      }
    } catch (error) {
      console.error("[WorkoutLogger] Failed to clean up false skipped sets in completed workouts:", error)
    }

    // Clean up in-progress workouts
    try {
      const inProgressRaw = localStorage.getItem(storageKeys.inProgress)
      if (inProgressRaw) {
        const inProgressWorkouts: WorkoutSession[] = JSON.parse(inProgressRaw)
        let hasChanges = false

        const cleanedInProgress = inProgressWorkouts.map(workout => {
          const cleanedWorkout = { ...workout }

          cleanedWorkout.exercises = cleanedWorkout.exercises.map(exercise => {
            const cleanedExercise = { ...exercise }

            cleanedExercise.sets = cleanedExercise.sets.map(set => {
              if (set.skipped && (set.reps > 0 || set.weight > 0)) {
                console.log("[WorkoutLogger] Removing false skipped flag from in-progress set:", {
                  exercise: exercise.exerciseName,
                  reps: set.reps,
                  weight: set.weight
                })
                cleanedCount++
                hasChanges = true
                return { ...set, skipped: false }
              }
              return set
            })

            if (exercise.skipped && cleanedExercise.sets.some(s => s.completed && !s.skipped)) {
              cleanedExercise.skipped = false
              hasChanges = true
            }

            return cleanedExercise
          })

          if (workout.skipped && cleanedWorkout.exercises.some(ex =>
            ex.sets.some(s => s.completed && (s.reps > 0 || s.weight > 0))
          )) {
            cleanedWorkout.skipped = false
            hasChanges = true
          }

          return cleanedWorkout
        })

        if (hasChanges) {
          localStorage.setItem(storageKeys.inProgress, JSON.stringify(cleanedInProgress))
        }
      }
    } catch (error) {
      console.error("[WorkoutLogger] Failed to clean up false skipped sets in in-progress workouts:", error)
    }

    if (cleanedCount > 0) {
      console.log(`[WorkoutLogger] Total false skipped sets cleaned: ${cleanedCount}`)
    }
  }

  /**
   * Clean up corrupted or empty workout data
   */
  static cleanupCorruptedWorkouts(userId?: string): void {
    if (typeof window === "undefined") return

    const storageKeys = this.getUserStorageKeys(userId)
    let cleanedCount = 0


    try {
      const inProgressRaw = localStorage.getItem(storageKeys.inProgress)
      if (inProgressRaw) {
        const inProgressWorkouts: WorkoutSession[] = JSON.parse(inProgressRaw)
        const cleanedInProgress = inProgressWorkouts.filter(workout => {
          // Check if workout has required fields and valid exercises
          const isValid = workout.id &&
                         workout.workoutName &&
                         Array.isArray(workout.exercises) &&
                         workout.exercises.length > 0 &&
                         workout.exercises.every(ex => ex.id && ex.exerciseName && Array.isArray(ex.sets) && ex.sets.length > 0)

          if (!isValid) {
            console.log("[WorkoutLogger] Removing corrupted in-progress workout:", workout.id)
            cleanedCount++
          }
          return isValid
        })

        if (cleanedInProgress.length !== inProgressWorkouts.length) {
          localStorage.setItem(storageKeys.inProgress, JSON.stringify(cleanedInProgress))
          console.log(`[WorkoutLogger] Cleaned up ${inProgressWorkouts.length - cleanedInProgress.length} corrupted in-progress workouts`)
        }
      }
    } catch (error) {
      console.error("[WorkoutLogger] Failed to clean up in-progress workouts:", error)
    }

    // Clean up completed workouts
    try {
      const workoutsRaw = localStorage.getItem(storageKeys.workouts)
      if (workoutsRaw) {
        const completedWorkouts: WorkoutSession[] = JSON.parse(workoutsRaw)
        const cleanedWorkouts = completedWorkouts.filter(workout => {
          // Check if workout has required fields and valid exercises
          const isValid = workout.id &&
                         workout.workoutName &&
                         Array.isArray(workout.exercises) &&
                         workout.exercises.length > 0 &&
                         workout.exercises.every(ex => ex.id && ex.exerciseName && Array.isArray(ex.sets) && ex.sets.length > 0)

          if (!isValid) {
            console.log("[WorkoutLogger] Removing corrupted completed workout:", workout.id)
            cleanedCount++
          }
          return isValid
        })

        if (cleanedWorkouts.length !== completedWorkouts.length) {
          localStorage.setItem(storageKeys.workouts, JSON.stringify(cleanedWorkouts))
          console.log(`[WorkoutLogger] Cleaned up ${completedWorkouts.length - cleanedWorkouts.length} corrupted completed workouts`)
        }
      }
    } catch (error) {
      console.error("[WorkoutLogger] Failed to clean up completed workouts:", error)
    }

    console.log(`[WorkoutLogger] Cleanup completed. Total items removed: ${cleanedCount}`)
  }

  /**
   * Validate and repair workout data integrity
   */
  static validateAndRepairWorkoutIntegrity(userId?: string): void {
    if (typeof window === "undefined") return

    console.log("[WorkoutLogger] Starting workout data integrity validation...")

    const storageKeys = this.getUserStorageKeys(userId)
    let repairedCount = 0
    let validatedWorkouts = 0

    // Validate and repair completed workouts
    try {
      const workoutsRaw = localStorage.getItem(storageKeys.workouts)
      if (workoutsRaw) {
        const completedWorkouts: WorkoutSession[] = JSON.parse(workoutsRaw)
        const repairedWorkouts = completedWorkouts.map(workout => {
          let needsRepair = false
          const repairedWorkout = { ...workout }

          // Validate basic workout structure
          if (!repairedWorkout.id || !repairedWorkout.workoutName || !Array.isArray(repairedWorkout.exercises)) {
            console.warn("[WorkoutLogger] Invalid workout structure found:", repairedWorkout.id)
            return null // Remove invalid workout
          }

          // Validate exercises
          repairedWorkout.exercises = repairedWorkout.exercises.map(exercise => {
            const repairedExercise = { ...exercise }

            // Ensure exercise has required fields
            if (!repairedExercise.id || !repairedExercise.exerciseName) {
              console.warn("[WorkoutLogger] Invalid exercise found in workout:", repairedWorkout.id)
              return null
            }

            // Validate sets
            if (!Array.isArray(repairedExercise.sets) || repairedExercise.sets.length === 0) {
              console.warn("[WorkoutLogger] Exercise with no sets found:", repairedExercise.exerciseName)
              // Create default sets if missing
              repairedExercise.sets = Array.from({ length: repairedExercise.targetSets || 3 }, (_, i) => ({
                id: Math.random().toString(36).substr(2, 9),
                reps: 0,
                weight: repairedExercise.suggestedWeight || 0, // Pre-fill suggested weight
                completed: false,
              }))
              needsRepair = true
              repairedCount++
            }

            // Validate individual sets
            repairedExercise.sets = repairedExercise.sets.map(set => {
              const repairedSet = { ...set }

              // Ensure set has required fields
              if (!repairedSet.id) {
                repairedSet.id = Math.random().toString(36).substr(2, 9)
                needsRepair = true
              }

              // Ensure numeric values
              if (typeof repairedSet.reps !== 'number') {
                repairedSet.reps = parseInt(String(repairedSet.reps)) || 0
                needsRepair = true
              }

              if (typeof repairedSet.weight !== 'number') {
                repairedSet.weight = parseFloat(String(repairedSet.weight)) || 0
                needsRepair = true
              }

              // Ensure boolean completed
              if (typeof repairedSet.completed !== 'boolean') {
                repairedSet.completed = Boolean(repairedSet.completed)
                needsRepair = true
              }

              return repairedSet
            }).filter(Boolean) // Remove any null sets

            // Remove exercises with no valid sets
            if (repairedExercise.sets.length === 0) {
              console.warn("[WorkoutLogger] Removing exercise with no valid sets:", repairedExercise.exerciseName)
              return null
            }

            return repairedExercise
          }).filter((ex): ex is WorkoutExercise => ex !== null) // Remove any null exercises

          // Check if workout still has valid exercises
          if (repairedWorkout.exercises.length === 0) {
            console.warn("[WorkoutLogger] Removing workout with no valid exercises:", repairedWorkout.id)
            return null
          }

          if (needsRepair) {
            repairedCount++
            console.log("[WorkoutLogger] Repaired workout:", repairedWorkout.id)
          }

          validatedWorkouts++
          return repairedWorkout
        }).filter(Boolean) // Remove any null workouts

        if (repairedWorkouts.length !== completedWorkouts.length) {
          localStorage.setItem(storageKeys.workouts, JSON.stringify(repairedWorkouts))
          console.log(`[WorkoutLogger] Validated ${validatedWorkouts} completed workouts, repaired ${repairedCount}`)
        }
      }
    } catch (error) {
      console.error("[WorkoutLogger] Failed to validate completed workouts:", error)
    }

    // Validate and repair in-progress workouts
    try {
      const inProgressRaw = localStorage.getItem(storageKeys.inProgress)
      if (inProgressRaw) {
        const inProgressWorkouts: WorkoutSession[] = JSON.parse(inProgressRaw)
        const repairedInProgress = inProgressWorkouts.map(workout => {
          let needsRepair = false
          const repairedWorkout = { ...workout }

          // Validate basic workout structure
          if (!repairedWorkout.id || !repairedWorkout.workoutName || !Array.isArray(repairedWorkout.exercises)) {
            console.warn("[WorkoutLogger] Invalid in-progress workout structure found:", repairedWorkout.id)
            return null // Remove invalid workout
          }

          // Apply same validation as completed workouts
          repairedWorkout.exercises = repairedWorkout.exercises.map(exercise => {
            const repairedExercise = { ...exercise }

            if (!repairedExercise.id || !repairedExercise.exerciseName) {
              return null
            }

            if (!Array.isArray(repairedExercise.sets) || repairedExercise.sets.length === 0) {
              repairedExercise.sets = Array.from({ length: repairedExercise.targetSets || 3 }, (_, i) => ({
                id: Math.random().toString(36).substr(2, 9),
                reps: 0,
                weight: repairedExercise.suggestedWeight || 0,
                completed: false,
              }))
              needsRepair = true
              repairedCount++
            }

            repairedExercise.sets = repairedExercise.sets.map(set => {
              const repairedSet = { ...set }

              if (!repairedSet.id) {
                repairedSet.id = Math.random().toString(36).substr(2, 9)
                needsRepair = true
              }

              if (typeof repairedSet.reps !== 'number') {
                repairedSet.reps = parseInt(String(repairedSet.reps)) || 0
                needsRepair = true
              }

              if (typeof repairedSet.weight !== 'number') {
                repairedSet.weight = parseFloat(String(repairedSet.weight)) || 0
                needsRepair = true
              }

              if (typeof repairedSet.completed !== 'boolean') {
                repairedSet.completed = Boolean(repairedSet.completed)
                needsRepair = true
              }

              return repairedSet
            }).filter(Boolean)

            if (repairedExercise.sets.length === 0) {
              return null
            }

            return repairedExercise
          }).filter((ex): ex is WorkoutExercise => ex !== null)

          if (repairedWorkout.exercises.length === 0) {
            return null
          }

          if (needsRepair) {
            repairedCount++
            console.log("[WorkoutLogger] Repaired in-progress workout:", repairedWorkout.id)
          }

          validatedWorkouts++
          return repairedWorkout
        }).filter(Boolean)

        if (repairedInProgress.length !== inProgressWorkouts.length) {
          localStorage.setItem(storageKeys.inProgress, JSON.stringify(repairedInProgress))
          console.log(`[WorkoutLogger] Validated in-progress workouts, total repairs: ${repairedCount}`)
        }
      }
    } catch (error) {
      console.error("[WorkoutLogger] Failed to validate in-progress workouts:", error)
    }

    console.log(`[WorkoutLogger] Workout data integrity validation completed. Validated ${validatedWorkouts} workouts, repaired ${repairedCount} issues.`)
  }

  /**
   * Debug database access and permissions
   */
  static async debugDatabaseAccess(userId: string): Promise<void> {
    if (!supabase) {
      console.log("Supabase not configured")
      return
    }

    console.log("=== Database Access Debug ===")
    console.log("User ID:", userId)

    try {
      // Test basic access
      console.log("\n1. Testing basic workouts table access...")
      const { data: basicAccess, error: basicError } = await supabase
        .from("workouts")
        .select("count")
        .eq("user_id", userId)
        .limit(1)

      console.log("Basic access result:", { basicAccess, basicError })

      // Test getting count
      console.log("\n2. Getting workout count...")
      const { data: countData, error: countError } = await supabase
        .from("workouts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)

      console.log("Count result:", { countData, countError })

      // Test actual data fetch
      console.log("\n3. Fetching actual workout data...")
      const { data: workoutsData, error: workoutsError } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", userId)
        .limit(5)

      console.log("Workouts data:", workoutsData)
      console.log("Workouts error:", workoutsError)

      // Test in-progress workouts
      console.log("\n4. Fetching in-progress workout data...")
      const { data: inProgressData, error: inProgressError } = await supabase
        .from("in_progress_workouts")
        .select("*")
        .eq("user_id", userId)
        .limit(5)

      console.log("In-progress data:", inProgressData)
      console.log("In-progress error:", inProgressError)

      // Test current session
      console.log("\n5. Checking current session...")
      const { data: session, error: sessionError } = await supabase.auth.getSession()
      console.log("Current session:", { session, sessionError })

    } catch (error) {
      console.error("Database access debug failed:", error)
    }

    console.log("=== End Database Access Debug ===")
  }

  /**
   * Force load data from database (bypassing local data preservation)
   */
  static async forceLoadFromDatabase(userId: string): Promise<void> {
    console.log("=== Force Loading From Database ===")
    console.log("This will replace all local data with database data")

    try {
      await this.loadFromDatabase(userId, true)
      console.log("Force load completed")
    } catch (error) {
      console.error("Force load failed:", error)
    }

    console.log("=== End Force Load ===")
  }

  static getInProgressWorkout(week: number, day: number, userId?: string): WorkoutSession | null {
    if (typeof window === "undefined") return null

    const storageKeys = this.getUserStorageKeys(userId)

    try {
      const stored = localStorage.getItem(storageKeys.inProgress)
      if (!stored) return null

      const workouts: WorkoutSession[] = JSON.parse(stored)
      const workout = workouts.find((w) => w.week === week && w.day === day) || null
      
      // Validate and fix any incorrectly marked sets
      if (workout) {
        workout.exercises = workout.exercises.map(exercise => ({
          ...exercise,
          sets: exercise.sets.map(set => {
            // If set is marked completed but has no data, it was incorrectly marked
            // Reset it to incomplete
            if (set.completed && set.reps === 0 && set.weight === 0 && !set.skipped) {
              return { ...set, completed: false }
            }
            return set
          })
        }))
      }
      
      return workout
    } catch {
      return null
    }
  }

  static getCurrentWorkout(): WorkoutSession | null {
    if (typeof window === "undefined") return null

    try {
      const activeProgram = typeof window !== "undefined" ? this.getActiveProgram() : null
      if (!activeProgram) return null

      // Get current user ID from localStorage
      const storedUser = localStorage.getItem("liftlog_user")
      const currentUser = storedUser ? JSON.parse(storedUser) : null
      const userId = currentUser?.id

      return this.getInProgressWorkout(activeProgram.currentWeek, activeProgram.currentDay, userId)
    } catch {
      return null
    }
  }

  private static getActiveProgram() {
    try {
      const stored = localStorage.getItem("liftlog_active_program")
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  static async saveCurrentWorkout(workout: WorkoutSession, userId?: string): Promise<void> {
    if (typeof window === "undefined") return
    if (!workout.week || !workout.day) return

    const storageKeys = this.getUserStorageKeys(userId)

    try {
      const stored = localStorage.getItem(storageKeys.inProgress)
      let workouts: WorkoutSession[] = stored ? JSON.parse(stored) : []

      // Remove existing workout for this week/day
      workouts = workouts.filter((w) => !(w.week === workout.week && w.day === workout.day))

      // Add updated workout
      workouts.push(workout)

      localStorage.setItem(storageKeys.inProgress, JSON.stringify(workouts))

      // Sync to database
      if (userId && supabase) {
        await supabase
          .from("in_progress_workouts")
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
          })
      }
    } catch (error) {
      console.error("Failed to save workout:", error)
    }
  }

  static async clearCurrentWorkout(week?: number, day?: number, userId?: string): Promise<void> {
    if (typeof window === "undefined") return

    // Get current user ID if not provided
    if (!userId) {
      try {
        const storedUser = localStorage.getItem("liftlog_user")
        const currentUser = storedUser ? JSON.parse(storedUser) : null
        userId = currentUser?.id
      } catch {
        // Fallback to anonymous if localStorage is not available
      }
    }

    const storageKeys = this.getUserStorageKeys(userId)

    try {
      if (week && day) {
        const stored = localStorage.getItem(storageKeys.inProgress)
        if (!stored) return

        let workouts: WorkoutSession[] = JSON.parse(stored)
        const workoutToDelete = workouts.find((w) => w.week === week && w.day === day)
        workouts = workouts.filter((w) => !(w.week === week && w.day === day))
        localStorage.setItem(storageKeys.inProgress, JSON.stringify(workouts))

        // Delete from database
        if (userId && supabase && workoutToDelete) {
          await supabase
            .from("in_progress_workouts")
            .delete()
            .eq("id", workoutToDelete.id)
        }
      } else {
        // Clear all in-progress workouts
        localStorage.removeItem(storageKeys.inProgress)

        // Delete all from database
        if (userId && supabase) {
          await supabase
            .from("in_progress_workouts")
            .delete()
            .eq("user_id", userId)
        }
      }
    } catch (error) {
      console.error("Failed to clear workout:", error)
    }
  }

  static startWorkout(
    workoutName: string,
    exercises: {
      exerciseId: string
      exerciseName: string
      targetSets: number
      targetReps: string
      targetRest: string
      suggestedWeight?: number
      progressionNote?: string
    }[],
    week?: number,
    day?: number,
    userId?: string,
  ): WorkoutSession {
    if (week && day) {
      const existing = this.getInProgressWorkout(week, day)
      if (existing) {
        const isCorrupted =
          !existing.week || !existing.day || existing.exercises.some((ex) => !ex.sets || ex.sets.length === 0)

        if (isCorrupted) {
          console.log("[v0] Found corrupted workout data, clearing and creating fresh workout")
          this.clearCurrentWorkout(week, day)
          // Fall through to create new workout
        } else {
          console.log(
            "[v0] Found existing workout for week",
            week,
            "day",
            day,
            "with",
            existing.exercises.length,
            "exercises",
          )
          console.log("[v0] Workout structure:", {
            id: existing.id,
            exerciseCount: existing.exercises.length,
            exercises: existing.exercises.map((ex) => ({
              name: ex.exerciseName,
              setsCount: ex.sets?.length || 0,
              hasSets: !!ex.sets,
            })),
          })
          return existing
        }
      }
    }

    console.log("[v0] Creating new workout for week", week, "day", day)
    const workout: WorkoutSession = {
      id: Math.random().toString(36).substr(2, 9),
      userId: userId || "anonymous",
      workoutName,
      startTime: Date.now(),
      week,
      day,
      exercises: exercises.map((ex) => ({
        id: Math.random().toString(36).substr(2, 9),
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        targetRest: ex.targetRest,
        suggestedWeight: ex.suggestedWeight,
        progressionNote: ex.progressionNote,
        sets: Array.from({ length: ex.targetSets }, (_, i) => ({
          id: Math.random().toString(36).substr(2, 9),
          reps: 0,
          weight: ex.suggestedWeight || 0, // Pre-fill with suggested weight from progression
          completed: false,
          skipped: false, // Explicitly set skipped to false
        })),
        completed: false,
        skipped: false, // Explicitly set skipped to false
      })),
      completed: false,
      skipped: false, // Explicitly set skipped to false
      notes: "",
    }

    console.log("[v0] 🏋️ WORKOUT CREATION - Full workout object:", {
      id: workout.id,
      exerciseCount: workout.exercises.length,
      workout: JSON.parse(JSON.stringify(workout)), // Deep clone for inspection
      firstExerciseSets: workout.exercises[0]?.sets.map(s => ({
        id: s.id,
        reps: s.reps,
        weight: s.weight,
        completed: s.completed,
        skipped: s.skipped
      })),
      exercises: workout.exercises.map((ex) => ({
        name: ex.exerciseName,
        setsCount: ex.sets.length,
      })),
    })

    this.saveCurrentWorkout(workout)
    console.log("[v0] Saved workout to localStorage")
    return workout
  }

  static async updateSet(
    workout: WorkoutSession,
    exerciseId: string,
    setId: string,
    updates: Partial<WorkoutSet>,
    userId?: string,
    skipDbSync: boolean = false, // New parameter to control database sync
  ): Promise<WorkoutSession | null> {
    const updatedWorkout = JSON.parse(JSON.stringify(workout)) as WorkoutSession

    const exercise = updatedWorkout.exercises.find((ex) => ex.id === exerciseId)
    if (!exercise) return null

    const set = exercise.sets.find((s) => s.id === setId)
    if (!set) return null

    const originalSetState = { ...set }
    const wasCompleted = set.completed
    Object.assign(set, updates)

    const shouldLogSet = !wasCompleted && set.completed && !!userId

    if (shouldLogSet) {
      ConnectionMonitor.updateStatus('syncing')
      const setNumber = exercise.sets.findIndex((s) => s.id === setId) + 1
      try {
        await this.logSetCompletion(
          workout.id,
          exercise.id,
          exercise.exerciseName,
          setNumber,
          set.reps,
          set.weight,
          true,
          userId,
          workout.week,
          workout.day,
          set.notes
        )
      } catch (error) {
        Object.assign(set, originalSetState)
        exercise.completed = exercise.sets.every((s) => s.completed)
        if (!exercise.completed && exercise.endTime) {
          delete exercise.endTime
        }
        throw error
      }
    }

    exercise.completed = exercise.sets.every((s) => s.completed)
    if (exercise.completed && !exercise.endTime) {
      exercise.endTime = Date.now()
    } else if (!exercise.completed && exercise.endTime) {
      delete exercise.endTime
    }

    if (skipDbSync) {
      this.saveCurrentWorkout(updatedWorkout)
    } else {
      this.saveCurrentWorkout(updatedWorkout, userId)
    }

    return updatedWorkout
  }

  
  static async completeWorkout(workoutId: string, userId?: string): Promise<WorkoutSession | null> {
    if (typeof window === "undefined") return null

    // Get current user ID if not provided
    if (!userId) {
      try {
        const storedUser = localStorage.getItem("liftlog_user")
        const currentUser = storedUser ? JSON.parse(storedUser) : null
        userId = currentUser?.id
      } catch {
        // Fallback to anonymous if localStorage is not available
      }
    }

    const storageKeys = this.getUserStorageKeys(userId)

    try {
      const stored = localStorage.getItem(storageKeys.inProgress)
      if (!stored) return null

      const workouts: WorkoutSession[] = JSON.parse(stored)
      const workout = workouts.find((w) => w.id === workoutId)
      if (!workout) return null

      workout.completed = true
      workout.endTime = Date.now()

      // Save to workout history
      await this.saveWorkoutToHistory(workout, userId)

      // Remove from in-progress
      if (workout.week && workout.day) {
        await this.clearCurrentWorkout(workout.week, workout.day, userId)
      }

      return workout
    } catch (error) {
      console.error("Failed to complete workout:", error)
      return null
    }
  }

  static async skipWorkout({
    templateDay,
    week,
    day,
    userId,
    templateId,
    workoutName,
  }: {
    templateDay: WorkoutDay
    week: number
    day: number
    userId?: string
    templateId?: string
    workoutName?: string
  }): Promise<WorkoutSession | null> {
    if (!templateDay) {
      return null
    }

    let resolvedUserId = userId
    if (!resolvedUserId) {
      try {
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem("liftlog_user") : null
        const currentUser = storedUser ? JSON.parse(storedUser) : null
        resolvedUserId = currentUser?.id
      } catch {
        // ignore
      }
    }

    const effectiveUserId = resolvedUserId || "anonymous"
    const scheduleName = workoutName || templateDay.name || `Week ${week} Day ${day}`
    const workoutId = `skipped-${week}-${day}-${Math.random().toString(36).slice(2)}`
    const timestamp = Date.now()

    const plan = templateDay.exercises || []

    const getWeekData = (exercise: ExerciseTemplate, targetWeek: number) => {
      const progression = exercise.progressionTemplate as Record<string, { sets?: number; repRange?: string } | undefined>
      const directKey = `week${targetWeek}`
      if (progression[directKey]) {
        return progression[directKey]
      }
      const availableWeeks = Object.keys(progression)
        .filter((key) => key.startsWith('week'))
        .map((key) => Number.parseInt(key.replace('week', ''), 10))
        .filter((value) => !Number.isNaN(value))
        .sort((a, b) => a - b)

      for (let i = availableWeeks.length - 1; i >= 0; i--) {
        const current = availableWeeks[i]
        if (current <= targetWeek && progression[`week${current}`]) {
          return progression[`week${current}`]
        }
      }

      return progression.week1
    }

    const skippedExercises = plan.map((exercise, index) => {
      const weekData = getWeekData(exercise, week) || {}
      const targetSets = Math.max(weekData?.sets ?? exercise.progressionTemplate.week1?.sets ?? 3, 1)
      const targetReps = weekData?.repRange || exercise.progressionTemplate.week1?.repRange || '8-10'
      const exerciseId = exercise.id || exercise.exerciseName.toLowerCase().replace(/\s+/g, '-')

      const sets = Array.from({ length: targetSets }, (_, setIndex) => ({
        id: `${workoutId}-set-${index}-${setIndex}`,
        reps: 0,
        weight: 0,
        completed: true,
        skipped: true,
      }))

      return {
        id: `${workoutId}-ex-${index}`,
        exerciseId,
        exerciseName: exercise.exerciseName,
        targetSets,
        targetReps,
        targetRest: exercise.restTime !== undefined ? `${exercise.restTime}` : 'Rest as needed',
        muscleGroup: exercise.category,
        sets,
        completed: true,
        skipped: true,
        notes: 'Skipped exercise',
      }
    })

    const skippedWorkout: WorkoutSession = {
      id: workoutId,
      userId: effectiveUserId,
      programId: templateId,
      workoutName: scheduleName,
      startTime: timestamp,
      endTime: timestamp,
      exercises: skippedExercises,
      notes: 'Skipped workout',
      completed: true,
      week,
      day,
      skipped: true,
    }

    await this.clearCurrentWorkout(week, day, effectiveUserId)
    await this.saveWorkoutToHistory(skippedWorkout, effectiveUserId)

    return skippedWorkout
  }


  private static async saveWorkoutToHistory(workout: WorkoutSession, userId?: string): Promise<void> {
    if (typeof window === "undefined") return

    // Get current user ID if not provided
    if (!userId) {
      try {
        const storedUser = localStorage.getItem("liftlog_user")
        const currentUser = storedUser ? JSON.parse(storedUser) : null
        userId = currentUser?.id
      } catch {
        // Fallback to anonymous if localStorage is not available
      }
    }

    const storageKeys = this.getUserStorageKeys(userId)

    const activeProgram = this.getActiveProgram()
    const activeTemplateId = activeProgram?.template?.id ?? activeProgram?.templateId
    const isProgramWorkout = typeof workout.week === "number" && typeof workout.day === "number"

    if (isProgramWorkout && activeTemplateId && !workout.programId) {
      workout.programId = activeTemplateId
    }

    try {
      const existing = localStorage.getItem(storageKeys.workouts)
      const workouts: WorkoutSession[] = existing ? JSON.parse(existing) : []

      // Remove existing workout with same ID to prevent duplicates
      const filteredWorkouts = workouts.filter(w => w.id !== workout.id)
      filteredWorkouts.push(workout)
      localStorage.setItem(storageKeys.workouts, JSON.stringify(filteredWorkouts))

      // Sync to database using connection monitor
      if (userId && supabase) {
        // Add to connection monitor queue for auto-sync
        ConnectionMonitor.addToQueue(async () => {
          try {
            if (!supabase) return
            await supabase
              .from("workouts")
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
              },
              { onConflict: 'id' })
            console.log("[WorkoutLogger] Completed workout synced to database")
          } catch (error) {
            console.error("Failed to sync completed workout to database:", error)
            throw error // Let connection monitor handle retries
          }
        })
      }
    } catch (error) {
      console.error("Failed to save workout to history:", error)
    }
  }

  static getWorkoutHistory(userId?: string): WorkoutSession[] {
    if (typeof window === "undefined") return []

    // Get current user ID if not provided
    if (!userId) {
      try {
        const storedUser = localStorage.getItem("liftlog_user")
        const currentUser = storedUser ? JSON.parse(storedUser) : null
        userId = currentUser?.id
      } catch {
        // Fallback to anonymous if localStorage is not available
      }
    }

    const storageKeys = this.getUserStorageKeys(userId)

    try {
      const stored = localStorage.getItem(storageKeys.workouts)
      const history = stored ? JSON.parse(stored) : []

      // Minimal debug logging (only in development)
      if (process.env.NODE_ENV === "development" && history.length > 0) {
        const week1Workouts = history.filter((w: WorkoutSession) => w.week === 1)
        console.log(`[WorkoutLogger] User ${userId} - Week 1 workouts: ${week1Workouts.length}/${history.length}`)
      }

      return history
    } catch (error) {
      console.error("[WorkoutLogger] Error parsing workout history:", error)
      return []
    }
  }

  static getCompletedWorkout(week: number, day: number, userId?: string): WorkoutSession | null {
    const history = this.getWorkoutHistory(userId)
    const matchingWorkouts = history.filter((workout: WorkoutSession) => 
      workout.week === week && workout.day === day && workout.completed
    )
    
    if (matchingWorkouts.length === 0) return null
    
    // ALWAYS filter out skipped workouts and prioritize actual logged data
    // This applies even when there's only one match
    const workoutsWithData = matchingWorkouts.filter(workout => {
      // Exclude workouts with "skipped" in the ID
      if (workout.id.includes('skipped-')) {
        console.log(`[WorkoutLogger] ⏭️ Skipping workout with ID: ${workout.id}`)
        return false
      }
      
      // Check if workout has actual logged sets (non-zero weight/reps)
      const hasLoggedData = workout.exercises?.some(exercise => 
        exercise.sets?.some(set => 
          set.completed && set.weight > 0 && set.reps > 0
        )
      )
      
      if (!hasLoggedData) {
        console.log(`[WorkoutLogger] ⏭️ Skipping workout with no logged data: ${workout.id}`)
      }
      
      return hasLoggedData
    })
    
    // If we have workouts with actual data, use the most recent one
    if (workoutsWithData.length > 0) {
      const selected = workoutsWithData.sort((a, b) => (b.startTime || 0) - (a.startTime || 0))[0]
      console.log(`[WorkoutLogger] ✅ Selected completed workout: ${selected.id} (has logged data)`)
      return selected
    }
    
    // If no workouts with data, return null (don't return skipped workouts)
    console.log(`[WorkoutLogger] ❌ No completed workouts with actual data found for Week ${week} Day ${day}`)
    return null
  }

  static getWorkout(week: number, day: number, userId?: string): WorkoutSession | null {
    // Get current user ID if not provided
    if (!userId && typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem("liftlog_user")
        const currentUser = storedUser ? JSON.parse(storedUser) : null
        userId = currentUser?.id
      } catch {
        // Fallback to anonymous if localStorage is not available
      }
    }

    // First check completed workouts in history
    const completed = this.getCompletedWorkout(week, day, userId)
    if (completed) return completed

    // Then check in-progress workouts
    return this.getInProgressWorkout(week, day, userId)
  }

  static hasCompletedWorkout(week: number, day: number, userId?: string): boolean {
    // Get current user ID if not provided
    if (!userId) {
      try {
        const storedUser = localStorage.getItem("liftlog_user")
        const currentUser = storedUser ? JSON.parse(storedUser) : null
        userId = currentUser?.id
      } catch {
        // Fallback to anonymous if localStorage is not available
      }
    }

    const history = this.getWorkoutHistory(userId)
    const activeProgram = this.getActiveProgram()
    const activeTemplateId = activeProgram?.template?.id ?? activeProgram?.templateId
    const programStartDate = typeof activeProgram?.startDate === "number" ? activeProgram.startDate : undefined

    const completedWorkout = history.find((workout) => {
      if (workout.week !== week || workout.day !== day) {
        return false
      }

      if (!workout.completed) {
        return false
      }

      if (programStartDate && typeof workout.startTime === "number" && workout.startTime < programStartDate) {
        return false
      }

      if (activeTemplateId && workout.programId && workout.programId !== activeTemplateId) {
        return false
      }

      return true
    })

    // Minimal debug logging (only in development)
    if (week === 1 && day === 1 && process.env.NODE_ENV === "development") {
      console.log(`[WorkoutLogger] Week 1 Day 1 completion:`, {
        found: !!completedWorkout,
        userId
      })
    }

    // Additional validation: ensure the completed workout has actual exercise data
    if (completedWorkout) {
      const hasValidData = completedWorkout.exercises &&
                           completedWorkout.exercises.length > 0 &&
                           completedWorkout.exercises.every(ex => ex.sets && ex.sets.length > 0)

      if (!hasValidData) {
        console.warn(`[WorkoutLogger] Found completed workout for Week ${week}, Day ${day} with invalid data - treating as not completed`)
        console.warn(`[WorkoutLogger] Invalid workout details:`, completedWorkout)
        return false
      }
    }

    return !!completedWorkout
  }
  static isWeekCompleted(week: number, daysPerWeek: number, userId?: string): boolean {
    // Get current user ID if not provided
    if (!userId) {
      try {
        const storedUser = localStorage.getItem("liftlog_user")
        const currentUser = storedUser ? JSON.parse(storedUser) : null
        userId = currentUser?.id
      } catch {
        // Fallback to anonymous if localStorage is not available
      }
    }

    for (let day = 1; day <= daysPerWeek; day++) {
      if (!this.hasCompletedWorkout(week, day, userId)) {
        return false
      }
    }
    return true
  }

  // ============================================================================
  // REAL-TIME SET LOGGING METHODS
  // ============================================================================

  /**
   * Log individual set completion to database with offline fallback
   */
  static async logSetCompletion(
    workoutId: string,
    exerciseId: string,
    exerciseName: string,
    setNumber: number,
    reps: number,
    weight: number,
    completed: boolean = true,
    userId?: string,
    week?: number,
    day?: number,
    notes?: string
  ): Promise<void> {
    if (!userId) {
      throw new Error('User must be authenticated to log sets')
    }

    if (!supabase) {
      throw new Error('Database client is not configured')
    }

    if (!ConnectionMonitor.isOnline()) {
      ConnectionMonitor.updateStatus('offline')
      throw new Error('No connection. Reconnect before logging sets.')
    }

    const setId = `${workoutId}-${exerciseId}-${setNumber}`
    const completedAt = Date.now()

    const setLog = {
      id: setId,
      user_id: userId,
      workout_id: workoutId,
      exercise_id: exerciseId,
      exercise_name: exerciseName,
      set_number: setNumber,
      reps,
      weight,
      completed,
      completed_at: completedAt,
      notes: notes || null,
      week: week ?? null,
      day: day ?? null,
    }

    const { error } = await supabase
      .from('workout_sets')
      .upsert(setLog, { onConflict: 'id' })

    if (error) {
      // Log error but don't throw - allow local operation to succeed
      console.error('[WorkoutLogger] Failed to sync set to database:', error.message)
      
      // Provide helpful error context
      if (error.message.includes('relation "public.workout_sets" does not exist')) {
        console.error('[WorkoutLogger] The workout_sets table does not exist. Run workout_sets_migration.sql to create it.')
      } else if (error.message.includes('policy')) {
        console.error('[WorkoutLogger] RLS policy error. Ensure you are authenticated and policies are configured correctly.')
      }
      
      ConnectionMonitor.updateStatus('error')
      
      // Auto-clear error after 3 seconds to prevent persistent error banner
      setTimeout(() => {
        if (ConnectionMonitor.getStatus() === 'error') {
          ConnectionMonitor.updateStatus('online')
        }
      }, 3000)
      
      // Don't throw - the set is still saved locally
      return
    }

    // Log success to console for monitoring and debugging
    console.log('[WorkoutLogger] ✅ Set synced to database successfully:', {
      workoutId,
      exerciseId,
      exerciseName,
      setNumber,
      reps,
      weight,
      week,
      day,
      notes: notes || 'none'
    })
    
    ConnectionMonitor.updateStatus('synced')
    setTimeout(() => {
      if (ConnectionMonitor.getStatus() === 'synced') {
        ConnectionMonitor.updateStatus('online')
      }
    }, 1500)
  }

  /**
   * Save set to localStorage for backup
   */
  private static saveSetToLocalStorage(setLog: any): void {
    if (typeof window === "undefined") return

    try {
      const key = "liftlog_sets_backup"
      const existing = localStorage.getItem(key)
      const sets: any[] = existing ? JSON.parse(existing) : []

      // Remove existing set with same ID
      const filtered = sets.filter(s => s.id !== setLog.id)
      filtered.push(setLog)

      localStorage.setItem(key, JSON.stringify(filtered))
    } catch (error) {
      console.error("[WorkoutLogger] Failed to save set to localStorage:", error)
    }
  }

  /**
   * Add set to sync queue for later processing
   */
  private static addSetToSyncQueue(setLog: any): void {
    if (typeof window === "undefined") return

    try {
      const key = "liftlog_sets_sync_queue"
      const existing = localStorage.getItem(key)
      const queue: any[] = existing ? JSON.parse(existing) : []

      // Remove existing set with same ID
      const filtered = queue.filter(s => s.id !== setLog.id)
      filtered.push(setLog)

      localStorage.setItem(key, JSON.stringify(filtered))

      // Add to connection monitor queue
      ConnectionMonitor.addToQueue(async () => {
        await this.syncQueuedSets()
      })
    } catch (error) {
      console.error("[WorkoutLogger] Failed to add set to sync queue:", error)
    }
  }

  /**
   * Remove set from sync queue after successful sync
   */
  private static removeSetFromSyncQueue(setId: string): void {
    if (typeof window === "undefined") return

    try {
      const key = "liftlog_sets_sync_queue"
      const existing = localStorage.getItem(key)
      if (!existing) return

      const queue: any[] = JSON.parse(existing)
      const filtered = queue.filter(s => s.id !== setId)

      localStorage.setItem(key, JSON.stringify(filtered))
    } catch (error) {
      console.error("[WorkoutLogger] Failed to remove set from sync queue:", error)
    }
  }

  /**
   * Sync all queued sets to database
   */
  static async syncQueuedSets(): Promise<void> {
    if (typeof window === "undefined" || !supabase) return

    try {
      const key = "liftlog_sets_sync_queue"
      const existing = localStorage.getItem(key)
      if (!existing) return

      const queue: any[] = JSON.parse(existing)
      if (queue.length === 0) return

      console.log(`[WorkoutLogger] Syncing ${queue.length} queued sets`)

      const syncedSetIds: string[] = []
      const errors: any[] = []

      for (const setLog of queue) {
        try {
          const { error } = await supabase
            .from("workout_sets")
            .upsert(setLog, { onConflict: "id" })

          if (error) {
            console.error("[WorkoutLogger] Failed to sync set:", setLog.id, error)
            errors.push({ id: setLog.id, error })
          } else {
            syncedSetIds.push(setLog.id)
          }
        } catch (error) {
          console.error("[WorkoutLogger] Error syncing set:", setLog.id, error)
          errors.push({ id: setLog.id, error })
        }
      }

      // Remove successfully synced sets from queue
      if (syncedSetIds.length > 0) {
        const remainingQueue = queue.filter(s => !syncedSetIds.includes(s.id))
        localStorage.setItem(key, JSON.stringify(remainingQueue))
        console.log(`[WorkoutLogger] Successfully synced ${syncedSetIds.length} sets`)
      }

      if (errors.length > 0) {
        console.error(`[WorkoutLogger] Failed to sync ${errors.length} sets`)
      }
    } catch (error) {
      console.error("[WorkoutLogger] Failed to sync queued sets:", error)
    }
  }

  /**
   * Get sync queue status
   */
  static getSetSyncStatus(): { queueSize: number; lastSync?: number } {
    if (typeof window === "undefined") return { queueSize: 0 }

    try {
      const key = "liftlog_sets_sync_queue"
      const existing = localStorage.getItem(key)
      const queue: any[] = existing ? JSON.parse(existing) : []

      return {
        queueSize: queue.length,
        lastSync: queue.length > 0 ? Math.max(...queue.map(s => s.completed_at)) : undefined
      }
    } catch {
      return { queueSize: 0 }
    }
  }

  /**
   * Resolve conflicts between local and remote set data
   */
  static async resolveSetConflicts(userId: string): Promise<void> {
    if (typeof window === "undefined" || !supabase) return

    try {
      // Get local backup sets
      const backupKey = "liftlog_sets_backup"
      const localBackupRaw = localStorage.getItem(backupKey)
      const localSets: any[] = localBackupRaw ? JSON.parse(localBackupRaw) : []

      if (localSets.length === 0) return

      console.log(`[WorkoutLogger] Resolving conflicts for ${localSets.length} local sets`)

      for (const localSet of localSets) {
        try {
          // Check if set exists in database
          const { data: remoteSet, error: fetchError } = await supabase
            .from("workout_sets")
            .select("*")
            .eq("id", localSet.id)
            .eq("user_id", userId)
            .single()

          if (fetchError && fetchError.code !== 'PGRST116') { // Not found error
            console.error(`[WorkoutLogger] Error checking set ${localSet.id}:`, fetchError)
            continue
          }

          if (!remoteSet) {
            // No remote set exists, upload local set
            const { error: insertError } = await supabase
              .from("workout_sets")
              .insert(localSet)

            if (insertError) {
              console.error(`[WorkoutLogger] Failed to insert set ${localSet.id}:`, insertError)
            } else {
              console.log(`[WorkoutLogger] Resolved conflict: Uploaded local set ${localSet.id}`)
            }
          } else {
            // Conflict exists - decide which to keep
            const shouldKeepLocal = await this.chooseWinnerSet(localSet, remoteSet)

            if (shouldKeepLocal) {
              // Update remote with local data
              const { error: updateError } = await supabase
                .from("workout_sets")
                .update({
                  reps: localSet.reps,
                  weight: localSet.weight,
                  completed: localSet.completed,
                  completed_at: localSet.completed_at,
                  notes: localSet.notes,
                  updated_at: new Date().toISOString()
                })
                .eq("id", localSet.id)
                .eq("user_id", userId)

              if (updateError) {
                console.error(`[WorkoutLogger] Failed to update remote set ${localSet.id}:`, updateError)
              } else {
                console.log(`[WorkoutLogger] Resolved conflict: Local data won for ${localSet.id}`)
              }
            } else {
              console.log(`[WorkoutLogger] Resolved conflict: Remote data kept for ${localSet.id}`)
            }
          }
        } catch (error) {
          console.error(`[WorkoutLogger] Error resolving conflict for set ${localSet.id}:`, error)
        }
      }

      // Clear local backup after successful resolution
      localStorage.removeItem(backupKey)
      console.log("[WorkoutLogger] Conflict resolution completed, backup cleared")
    } catch (error) {
      console.error("[WorkoutLogger] Conflict resolution failed:", error)
    }
  }

  /**
   * Determine which set data should be kept during conflict resolution
   */
  private static async chooseWinnerSet(localSet: any, remoteSet: any): Promise<boolean> {
    // Strategy 1: Keep the most recently completed set
    if (localSet.completed_at !== remoteSet.completed_at) {
      return localSet.completed_at > remoteSet.completed_at
    }

    // Strategy 2: Keep the set with higher weight (assuming progression)
    if (localSet.weight !== remoteSet.weight) {
      return localSet.weight > remoteSet.weight
    }

    // Strategy 3: Keep the set with more reps (assuming effort)
    if (localSet.reps !== remoteSet.reps) {
      return localSet.reps > remoteSet.reps
    }

    // Strategy 4: If all else equal, prefer completed over not completed
    if (localSet.completed !== remoteSet.completed) {
      return localSet.completed && !remoteSet.completed
    }

    // Strategy 5: Default to local (assuming user's last action is preferred)
    return true
  }

  /**
   * Merge workout sessions with set logs for data integrity
   */
  static async validateWorkoutSetIntegrity(userId: string, workoutId: string): Promise<void> {
    if (typeof window === "undefined" || !supabase) return

    try {
      // Get workout session
      const workout = this.getWorkoutHistory().find(w => w.id === workoutId)
      if (!workout) return

      // Get all sets for this workout from database
      const { data: dbSets, error } = await supabase
        .from("workout_sets")
        .select("*")
        .eq("workout_id", workoutId)
        .eq("user_id", userId)

      if (error) {
        console.error("[WorkoutLogger] Error fetching workout sets:", error)
        return
      }

      if (!dbSets || dbSets.length === 0) {
        console.log(`[WorkoutLogger] No sets found for workout ${workoutId}`)
        return
      }

      // Cross-reference workout sets with database sets
      const expectedSets: string[] = []
      workout.exercises.forEach(exercise => {
        exercise.sets.forEach(set => {
          expectedSets.push(`${workoutId}-${exercise.id}-${exercise.sets.indexOf(set) + 1}`)
        })
      })

      const dbSetIds = dbSets.map(set => set.id)
      const missingInDb = expectedSets.filter(id => !dbSetIds.includes(id))
      const extraInDb = dbSetIds.filter(id => !expectedSets.includes(id))

      if (missingInDb.length > 0) {
        console.warn(`[WorkoutLogger] Found ${missingInDb.length} sets missing from database for workout ${workoutId}`)
      }

      if (extraInDb.length > 0) {
        console.warn(`[WorkoutLogger] Found ${extraInDb.length} extra sets in database for workout ${workoutId}`)
      }

      console.log(`[WorkoutLogger] Integrity check completed for workout ${workoutId}:`, {
        expectedSets: expectedSets.length,
        dbSets: dbSets.length,
        missingInDb: missingInDb.length,
        extraInDb: extraInDb.length
      })
    } catch (error) {
      console.error("[WorkoutLogger] Workout set integrity check failed:", error)
    }
  }

  // ============================================================================
  // TESTING AND DEBUGGING METHODS
  // ============================================================================

  /**
   * Test offline/online sync behavior (development only)
   */
  static async testOfflineSync(userId: string): Promise<void> {
    if (typeof window === "undefined" || process.env.NODE_ENV !== "development") {
      return
    }

    console.log("[WorkoutLogger] Starting offline sync test...")

    // Create a test workout set
    const testWorkoutId = "test-workout-" + Date.now()
    const testExerciseId = "test-exercise-" + Date.now()
    const testSet = {
      id: testWorkoutId + "-" + testExerciseId + "-1",
      user_id: userId,
      workout_id: testWorkoutId,
      exercise_id: testExerciseId,
      exercise_name: "Test Exercise",
      set_number: 1,
      reps: 10,
      weight: 135.5,
      completed: true,
      completed_at: Date.now(),
      notes: null,
      week: 1,
      day: 1,
    }

    try {
      // Test 1: Simulate offline logging
      console.log("[WorkoutLogger] Test 1: Offline set logging")
      await this.logSetCompletion(
        testWorkoutId,
        testExerciseId,
        "Test Exercise",
        1,
        10,
        135.5,
        true,
        userId,
        1,
        1,
        "Test set"
      )

      // Check if set is in queue
      const queueStatus = this.getSetSyncStatus()
      console.log("[WorkoutLogger] Queue status after offline log:", queueStatus)

      // Test 2: Simulate connection restored
      console.log("[WorkoutLogger] Test 2: Simulating connection restored")
      await this.syncQueuedSets()

      // Check queue status after sync
      const finalStatus = this.getSetSyncStatus()
      console.log("[WorkoutLogger] Final queue status:", finalStatus)

      // Test 3: Verify data in database
      if (supabase) {
        const { data: syncedSet, error } = await supabase
          .from("workout_sets")
          .select("*")
          .eq("id", testSet.id)
          .single()

        if (error) {
          console.error("[WorkoutLogger] Test failed: Could not retrieve synced set:", error)
        } else {
          console.log("[WorkoutLogger] Test passed: Set successfully synced to database:", syncedSet)
        }

        // Cleanup test data
        await supabase
          .from("workout_sets")
          .delete()
          .eq("id", testSet.id)
      }

      console.log("[WorkoutLogger] Offline sync test completed")
    } catch (error) {
      console.error("[WorkoutLogger] Offline sync test failed:", error)
    }
  }

  /**
   * Get detailed sync statistics for debugging
   */
  static getSyncStatistics(userId?: string): {
    localStorage: {
      inProgressWorkouts: number
      completedWorkouts: number
      queuedSets: number
      backupSets: number
    }
    queue: {
      size: number
      oldestItem?: number
      newestItem?: number
    }
    status: string
  } {
    if (typeof window === "undefined") {
      return {
        localStorage: {
          inProgressWorkouts: 0,
          completedWorkouts: 0,
          queuedSets: 0,
          backupSets: 0
        },
        queue: { size: 0 },
        status: "Server-side"
      }
    }

    // Count workouts
    const inProgressRaw = localStorage.getItem(this.IN_PROGRESS_KEY)
    const completedRaw = localStorage.getItem(this.STORAGE_KEY)
    const queuedRaw = localStorage.getItem("liftlog_sets_sync_queue")
    const backupRaw = localStorage.getItem("liftlog_sets_backup")

    const inProgressWorkouts = inProgressRaw ? JSON.parse(inProgressRaw).length : 0
    const completedWorkouts = completedRaw ? JSON.parse(completedRaw).length : 0
    const queuedSets = queuedRaw ? JSON.parse(queuedRaw).length : 0
    const backupSets = backupRaw ? JSON.parse(backupRaw).length : 0

    // Get queue details
    let queueSize = 0
    let oldestItem: number | undefined
    let newestItem: number | undefined

    if (queuedRaw) {
      const queue = JSON.parse(queuedRaw)
      queueSize = queue.length
      if (queue.length > 0) {
        const timestamps = queue.map((item: any) => item.completed_at)
        oldestItem = Math.min(...timestamps)
        newestItem = Math.max(...timestamps)
      }
    }

    return {
      localStorage: {
        inProgressWorkouts,
        completedWorkouts,
        queuedSets,
        backupSets
      },
      queue: {
        size: queueSize,
        oldestItem,
        newestItem
      },
      status: ConnectionMonitor.getStatus()
    }
  }

  // ============================================================================
  // SUPABASE SYNC METHODS
  // ============================================================================

  static async syncToDatabase(userId: string): Promise<void> {
    if (!supabase) {
      console.log("[WorkoutLogger] Supabase not configured, skipping sync")
      return
    }

    try {
      // First resolve any conflicts
      await this.resolveSetConflicts(userId)

      // Then sync any queued sets
      await this.syncQueuedSets()

      // Sync completed workouts
      const workouts = this.getWorkoutHistory()
      if (workouts.length > 0) {
        // Remove duplicates by ID (keep latest)
        const uniqueWorkouts = Array.from(
          new Map(workouts.map((w: WorkoutSession) => [w.id, w])).values()
        )

        const { error } = await supabase
          .from("workouts")
          .upsert(
            uniqueWorkouts.map((w) => ({
              id: w.id,
              user_id: userId,
              program_id: w.programId || null,
              workout_name: w.workoutName,
              start_time: w.startTime,
              end_time: w.endTime || null,
              exercises: w.exercises,
              notes: w.notes || null,
              completed: w.completed,
              week: w.week || null,
              day: w.day || null,
            })),
            { onConflict: 'id' }
          )

        if (error) {
          console.warn("[WorkoutLogger] Failed to sync workouts (table may not exist):", error.message || error)
        } else {
          console.log("[WorkoutLogger] Synced", uniqueWorkouts.length, "workouts to database")
        }
      }

      // Sync in-progress workouts
      const stored = localStorage.getItem(this.IN_PROGRESS_KEY)
      if (stored) {
        const inProgressWorkouts: WorkoutSession[] = JSON.parse(stored)
        if (inProgressWorkouts.length > 0) {
          // Remove duplicates by ID (keep latest)
          const uniqueInProgress = Array.from(
            new Map(inProgressWorkouts.map((w: WorkoutSession) => [w.id, w])).values()
          )

          const { error } = await supabase
            .from("in_progress_workouts")
            .upsert(
              uniqueInProgress.map((w) => ({
                id: w.id,
                user_id: userId,
                program_id: w.programId || null,
                workout_name: w.workoutName,
                start_time: w.startTime,
                week: w.week || null,
                day: w.day || null,
                exercises: w.exercises,
                notes: w.notes || null,
              })),
              { onConflict: 'id' }
            )

          if (error) {
            console.warn("[WorkoutLogger] Failed to sync in-progress workouts (table may not exist):", error.message || error)
          } else {
            console.log("[WorkoutLogger] Synced", uniqueInProgress.length, "in-progress workouts to database")
          }
        }
      }
    } catch (error) {
      console.error("[WorkoutLogger] Sync to database failed:", error)
    }
  }

  static async loadFromDatabase(userId: string, forceRefresh: boolean = false): Promise<void> {
    if (!supabase) {
      console.log("[WorkoutLogger] Supabase not configured, skipping load")
      return
    }

    console.log("[WorkoutLogger] Loading user data from database (forceRefresh:", forceRefresh, ")")

    let hasDatabaseData = false
    let totalLoaded = 0

    try {
      // First, check if user can access their own data
      console.log("[WorkoutLogger] Testing database access...")
      const { data: testAccess, error: accessError } = await supabase
        .from("workouts")
        .select("count")
        .eq("user_id", userId)
        .limit(1)

      if (accessError) {
        console.error("[WorkoutLogger] Database access error:", accessError)
        if (accessError.code === '401' || accessError.code?.includes('401')) {
          console.warn("[WorkoutLogger] Authentication error - cannot load from database")
          return
        }
      }

      // Load completed workouts
      console.log("[WorkoutLogger] Loading completed workouts...")
      const { data: workoutsData, error: workoutsError } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", userId)
        .order("start_time", { ascending: false })

      if (workoutsError) {
        console.error("[WorkoutLogger] Failed to load workouts:", workoutsError)
        console.log("[WorkoutLogger] Error details:", {
          code: workoutsError.code,
          message: workoutsError.message,
          details: workoutsError.details
        })
      } else if (workoutsData && workoutsData.length > 0) {
        console.log("[WorkoutLogger] Found", workoutsData.length, "workouts in database")
        console.log("[WorkoutLogger] Sample workout data:", workoutsData[0])

        const workouts: WorkoutSession[] = workoutsData.map((w) => ({
          id: w.id,
          userId: w.user_id,
          programId: w.program_id || undefined,
          workoutName: w.workout_name,
          startTime: w.start_time,
          endTime: w.end_time || undefined,
          exercises: w.exercises,
          notes: w.notes || undefined,
          completed: w.completed,
          week: w.week || undefined,
          day: w.day || undefined,
        }))

        const storageKeys = this.getUserStorageKeys(userId)

        // Only replace local data if forceRefresh or no local data exists
        const existingLocalData = localStorage.getItem(storageKeys.workouts)
        if (forceRefresh || !existingLocalData) {
          localStorage.setItem(storageKeys.workouts, JSON.stringify(workouts))
          console.log("[WorkoutLogger] Loaded", workouts.length, "workouts from database (forceRefresh:", forceRefresh, ")")
        } else {
          console.log("[WorkoutLogger] Preserving local workouts, found", existingLocalData.length, "characters of local data")
        }

        totalLoaded += workoutsData.length
        hasDatabaseData = true
      } else {
        console.log("[WorkoutLogger] No completed workouts found in database")
      }

      // Load in-progress workouts
      console.log("[WorkoutLogger] Loading in-progress workouts...")
      const { data: inProgressData, error: inProgressError } = await supabase
        .from("in_progress_workouts")
        .select("*")
        .eq("user_id", userId)

      if (inProgressError) {
        console.error("[WorkoutLogger] Failed to load in-progress workouts:", inProgressError)
        console.log("[WorkoutLogger] Error details:", {
          code: inProgressError.code,
          message: inProgressError.message,
          details: inProgressError.details
        })
      } else if (inProgressData && inProgressData.length > 0) {
        console.log("[WorkoutLogger] Found", inProgressData.length, "in-progress workouts in database")

        const inProgressWorkouts: WorkoutSession[] = inProgressData.map((w) => ({
          id: w.id,
          userId: w.user_id,
          programId: w.program_id || undefined,
          workoutName: w.workout_name,
          startTime: w.start_time,
          week: w.week || undefined,
          day: w.day || undefined,
          exercises: w.exercises,
          notes: w.notes || undefined,
          completed: false,
        }))

        const storageKeys = this.getUserStorageKeys(userId)

        // Only replace local data if forceRefresh or no local data exists
        const existingLocalInProgress = localStorage.getItem(storageKeys.inProgress)
        if (forceRefresh || !existingLocalInProgress) {
          localStorage.setItem(storageKeys.inProgress, JSON.stringify(inProgressWorkouts))
          console.log("[WorkoutLogger] Loaded", inProgressWorkouts.length, "in-progress workouts from database (forceRefresh:", forceRefresh, ")")
        } else {
          console.log("[WorkoutLogger] Preserving local in-progress workouts, found", existingLocalInProgress.length, "characters of local data")
        }

        totalLoaded += inProgressData.length
        hasDatabaseData = true
      } else {
        console.log("[WorkoutLogger] No in-progress workouts found in database")
      }

      console.log("[WorkoutLogger] Database loading completed. Total records loaded:", totalLoaded)

      if (!hasDatabaseData) {
        console.log("[WorkoutLogger] No data found in database, keeping local data")
      }
    } catch (error) {
      console.error("[WorkoutLogger] Load from database failed:", error)
      console.log("[WorkoutLogger] Will continue with local data only")
    }
  }

  /**
   * Smart loading strategy - sync local data to database first, then load fresh data
   */
  static async loadWithDatabasePriority(userId: string): Promise<void> {
    if (!supabase) {
      console.log("[WorkoutLogger] Supabase not configured, using localStorage fallback")
      return
    }

    console.log("[WorkoutLogger] Smart loading strategy activated")

    try {
      // STEP 1: Sync local data to database first (preserve current work)
      console.log("[WorkoutLogger] Step 1: Syncing local data to database...")
      await this.syncToDatabase(userId)

      // STEP 2: Then load fresh data from database
      console.log("[WorkoutLogger] Step 2: Loading fresh data from database...")
      await this.loadFromDatabase(userId, true)

      // STEP 3: Force sync any remaining queued changes
      await this.syncQueuedSets()

      console.log("[WorkoutLogger] Smart loading completed successfully")
    } catch (error) {
      console.error("[WorkoutLogger] Smart loading failed:", error)
      // Fallback to localStorage if database fails
      console.log("[WorkoutLogger] Falling back to localStorage")
    }
  }


  /**
   * Periodic sync to keep data fresh
   */
  static async periodicSync(userId: string): Promise<void> {
    if (!supabase) return

    try {
      console.log("[WorkoutLogger] Starting periodic sync")

      // Sync any pending changes first
      await this.syncQueuedSets()

      // Then refresh from database with gentle refresh (not force refresh to avoid loops)
      await this.loadFromDatabase(userId, false)

      console.log("[WorkoutLogger] Periodic sync completed")
    } catch (error) {
      console.error("[WorkoutLogger] Periodic sync failed:", error)
    }
  }
}

