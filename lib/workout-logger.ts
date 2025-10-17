import { supabase } from "./supabase"
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
  // NOTE: performedReps removed - it was only used for template display
  // Actual set reps come from perSetSuggestions (Week 2+) or user input (Week 1)
  targetRest: string
  suggestedWeight?: number
  progressionNote?: string
  muscleGroup?: string
  equipmentType?: string
  sets: WorkoutSet[]
  completed: boolean
  startTime?: number
  endTime?: number
  notes?: string
  skipped?: boolean
}

export interface WorkoutSession {
  id: string
  userId: string
  programId?: string
  programInstanceId?: string
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
  private static readonly DATABASE_LOAD_KEY = "liftlog_workouts_db_loaded_at"
  private static readonly DATABASE_STALE_MS = 5_000
  private static databaseLoadPromise: Promise<void> | null = null

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

  private static getCurrentUserId(): string | undefined {
    if (typeof window === "undefined") return undefined
    try {
      const storedUser = localStorage.getItem("liftlog_user")
      const currentUser = storedUser ? JSON.parse(storedUser) : null
      return currentUser?.id
    } catch {
      return undefined
    }
  }

  private static markDatabaseLoaded(): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.DATABASE_LOAD_KEY, Date.now().toString())
  }

  private static getLastDatabaseLoad(): number | undefined {
    if (typeof window === "undefined") return undefined
    const stored = localStorage.getItem(this.DATABASE_LOAD_KEY)
    if (!stored) return undefined
    const parsed = Number.parseInt(stored, 10)
    return Number.isNaN(parsed) ? undefined : parsed
  }

  static async ensureDatabaseLoaded(userId?: string, options?: { force?: boolean }): Promise<void> {
    if (!supabase || typeof window === "undefined") return

    const resolvedUserId = userId ?? this.getCurrentUserId()
    if (!resolvedUserId) return

    if (!options?.force) {
      const lastLoaded = this.getLastDatabaseLoad()
      if (lastLoaded && Date.now() - lastLoaded < this.DATABASE_STALE_MS) {
        return
      }
      if (this.databaseLoadPromise) {
        await this.databaseLoadPromise
        return
      }
    }

    this.databaseLoadPromise = this.loadFromDatabase(resolvedUserId, options?.force ?? false)
      .catch((error) => {
        console.error("[WorkoutLogger] Database preload failed:", error)
      })
      .finally(() => {
        this.markDatabaseLoaded()
        this.databaseLoadPromise = null
      })

    await this.databaseLoadPromise
  }

  // Register as set sync provider when module loads
  static {
    ConnectionMonitor.registerSetSyncProvider(WorkoutLogger)

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

  static tagWorkoutsWithInstance(instanceId: string, templateId: string, userId?: string): void {
    if (typeof window === "undefined") return
    if (!instanceId || !templateId) return

    if (!userId) {
      try {
        const storedUser = localStorage.getItem("liftlog_user")
        const currentUser = storedUser ? JSON.parse(storedUser) : null
        userId = currentUser?.id
      } catch {
        // Ignore parse errors and treat as anonymous
      }
    }

    const storageKeys = this.getUserStorageKeys(userId)
    const active = this.getActiveProgram()
    const instanceStart = typeof active?.startDate === 'number' ? active.startDate : undefined

    const assign = (key: string) => {
      const stored = localStorage.getItem(key)
      if (!stored) return

      let changed = false
      const workouts: WorkoutSession[] = JSON.parse(stored)
      const updated = workouts.map((workout) => {
        const withinInstanceWindow =
          typeof workout?.startTime === 'number' &&
          typeof instanceStart === 'number' &&
          workout.startTime >= instanceStart

        // If a workout was previously tagged to this instance but predates the
        // instance start, clear the tag so it doesn't leak into the new run.
        if (
          workout.programInstanceId === instanceId &&
          typeof instanceStart === 'number' &&
          (typeof workout.startTime !== 'number' || workout.startTime < instanceStart)
        ) {
          changed = true
          return {
            ...workout,
            programInstanceId: undefined,
          }
        }

        if (
          !workout.programInstanceId &&
          (workout.programId === templateId || !workout.programId) &&
          withinInstanceWindow
        ) {
          changed = true
          return {
            ...workout,
            programId: workout.programId || templateId,
            programInstanceId: instanceId,
          }
        }
        return workout
      })

      if (changed) {
        localStorage.setItem(key, JSON.stringify(updated))
      }
    }

    assign(storageKeys.workouts)
    assign(storageKeys.inProgress)
  }

  /**
   * Clean up corrupted or empty workout data
   */
  static cleanupCorruptedWorkouts(userId?: string): void {
    if (typeof window === "undefined") return

    const storageKeys = this.getUserStorageKeys(userId)
    let cleanedCount = 0

    console.log("[WorkoutLogger] Starting cleanup of corrupted workouts...")

    // Clean up in-progress workouts
    try {
      const inProgressRaw = localStorage.getItem(storageKeys.inProgress)
      if (inProgressRaw) {
        const inProgressWorkouts = JSON.parse(inProgressRaw)

        // Guard against corrupted localStorage (must be an array)
        if (!Array.isArray(inProgressWorkouts)) {
          console.warn("[WorkoutLogger] In-progress workouts is not an array, resetting")
          localStorage.removeItem(storageKeys.inProgress)
          return
        }

        const cleanedInProgress = inProgressWorkouts.filter((workout: WorkoutSession) => {
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
        const completedWorkouts = JSON.parse(workoutsRaw)

        // Guard against corrupted localStorage (must be an array)
        if (!Array.isArray(completedWorkouts)) {
          console.warn("[WorkoutLogger] Completed workouts is not an array, resetting")
          localStorage.removeItem(storageKeys.workouts)
          return
        }

        const cleanedWorkouts = completedWorkouts.filter((workout: WorkoutSession) => {
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
              return null // Remove invalid exercise
            }

            // Validate sets
            if (!Array.isArray(repairedExercise.sets) || repairedExercise.sets.length === 0) {
              console.warn("[WorkoutLogger] Exercise with no sets found:", repairedExercise.exerciseName)
              // Create default sets if missing
              repairedExercise.sets = Array.from({ length: repairedExercise.targetSets || 3 }, (_, i) => ({
                id: Math.random().toString(36).substr(2, 9),
                reps: 0,
                weight: 0,
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
          }).filter(Boolean) // Remove any null exercises

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
          }).filter(Boolean)

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

    const activeProgram = this.getActiveProgram()
    const instanceId = activeProgram?.instanceId
    const templateId = activeProgram?.templateId

    const storageKeys = this.getUserStorageKeys(userId)

    try {
      const stored = localStorage.getItem(storageKeys.inProgress)
      if (!stored) return null

      const workouts: WorkoutSession[] = JSON.parse(stored)
      const matchIndex = workouts.findIndex(
        (w) => w.week === week && w.day === day && this.matchesInstance(w, instanceId, templateId)
      )

      if (matchIndex === -1) {
        return null
      }

      const match = workouts[matchIndex]
      if (instanceId && !match.programInstanceId) {
        const updated = {
          ...match,
          programId: match.programId || templateId,
          programInstanceId: instanceId,
        }
        workouts[matchIndex] = updated
        localStorage.setItem(storageKeys.inProgress, JSON.stringify(workouts))
        return updated
      }

      return match
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

  private static matchesInstance(
    workout: WorkoutSession,
    instanceId?: string,
    templateId?: string
  ): boolean {
    // Legacy case: no instance tracking yet, fall back to template match.
    if (!instanceId) {
      if (!templateId) return true
      return workout.programId === templateId || !workout.programId
    }

    // Prefer explicit instance matches.
    if (!workout.programInstanceId) {
      return false
    }

    return workout.programInstanceId === instanceId
  }

  static async saveCurrentWorkout(workout: WorkoutSession, userId?: string): Promise<void> {
    if (typeof window === "undefined") return
    if (!workout.week || !workout.day) {
      console.error("[WorkoutLogger.saveCurrentWorkout] Missing week/day:", { week: workout.week, day: workout.day })
      return
    }

    const activeProgram = this.getActiveProgram()
    const templateId = activeProgram?.templateId
    const instanceId = workout.programInstanceId || activeProgram?.instanceId

    let normalizedWorkout = workout

    if (instanceId && !normalizedWorkout.programInstanceId) {
      normalizedWorkout = {
        ...normalizedWorkout,
        programInstanceId: instanceId,
      }
    }

    if (templateId && !normalizedWorkout.programId) {
      normalizedWorkout = {
        ...normalizedWorkout,
        programId: templateId,
      }
    }

    const storageKeys = this.getUserStorageKeys(userId)
    console.log("[WorkoutLogger.saveCurrentWorkout] Using storage key:", storageKeys.inProgress, "for workout ID:", normalizedWorkout.id)

    try {
      const stored = localStorage.getItem(storageKeys.inProgress)
      let workouts: WorkoutSession[] = stored ? JSON.parse(stored) : []
      console.log("[WorkoutLogger.saveCurrentWorkout] Found", workouts.length, "existing in-progress workouts")

      // Remove existing workout for this week/day
      workouts = workouts.filter(
        (w) =>
          !(
            w.week === normalizedWorkout.week &&
            w.day === normalizedWorkout.day &&
            this.matchesInstance(w, instanceId, templateId)
          )
      )

      // Add updated workout
      workouts.push(normalizedWorkout)
      console.log("[WorkoutLogger.saveCurrentWorkout] After adding workout, total in-progress:", workouts.length)

      localStorage.setItem(storageKeys.inProgress, JSON.stringify(workouts))
      console.log("[WorkoutLogger.saveCurrentWorkout] Saved to localStorage successfully")

      // Sync to database
      if (userId && supabase) {
        // Use update first, then insert if needed (avoids 409 conflicts)
        const { error: updateError } = await supabase
          .from("in_progress_workouts")
          .update({
            workout_name: normalizedWorkout.workoutName,
            start_time: normalizedWorkout.startTime,
            exercises: normalizedWorkout.exercises,
            notes: normalizedWorkout.notes || null,
            program_id: normalizedWorkout.programId || null,
            program_instance_id: normalizedWorkout.programInstanceId || null,
          })
          .eq('id', normalizedWorkout.id)
          .eq('user_id', userId)

        // If no rows updated, insert new workout
        if (updateError?.code === 'PGRST116') {
          await supabase
            .from("in_progress_workouts")
            .insert({
              id: normalizedWorkout.id,
              user_id: userId,
              program_id: normalizedWorkout.programId || null,
              program_instance_id: normalizedWorkout.programInstanceId || null,
              workout_name: normalizedWorkout.workoutName,
              start_time: normalizedWorkout.startTime,
              week: normalizedWorkout.week,
              day: normalizedWorkout.day,
              exercises: normalizedWorkout.exercises,
              notes: normalizedWorkout.notes || null,
            })
        }
      }
    } catch (error) {
      console.error("Failed to save workout:", error)
    }
  }

  static async clearInProgressWorkoutsForWeek(week: number, userId?: string): Promise<void> {
    if (typeof window === "undefined") return

    const storageKeys = this.getUserStorageKeys(userId)
    const stored = localStorage.getItem(storageKeys.inProgress)
    if (!stored) return

    const workouts: WorkoutSession[] = JSON.parse(stored)
    const filtered = workouts.filter(w => w.week !== week)

    console.log(`[WorkoutLogger] Cleared ${workouts.length - filtered.length} in-progress workouts from week ${week}`)
    localStorage.setItem(storageKeys.inProgress, JSON.stringify(filtered))
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

        const activeProgram = this.getActiveProgram()
        const instanceId = activeProgram?.instanceId
        const templateId = activeProgram?.templateId

        let workouts: WorkoutSession[] = JSON.parse(stored)
        const matchIndex = workouts.findIndex(
          (w) => w.week === week && w.day === day && this.matchesInstance(w, instanceId, templateId)
        )

        if (matchIndex === -1) {
          return
        }

        const [workoutToDelete] = workouts.splice(matchIndex, 1)
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
      // performedReps removed - only used for template display, not workout sessions
      targetRest: string
      suggestedWeight?: number
      progressionNote?: string
      muscleGroup?: string
      equipmentType?: string
      perSetSuggestions?: Array<{  // per-set weight and rep suggestions from previous week (Week 2+)
        weight: number
        reps: number
        baseWeight: number
        baseReps: number
        bounds: { min: number; max: number }
      }>
    }[],
    week?: number,
    day?: number,
    userId?: string,
  ): WorkoutSession {
    const activeProgram = this.getActiveProgram()
    const templateId = activeProgram?.templateId
    const instanceId = activeProgram?.instanceId

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
      programId: templateId,
      programInstanceId: instanceId,
      workoutName,
      startTime: Date.now(),
      week,
      day,
      exercises: exercises.map((ex) => ({
        id: Math.random().toString(36).substr(2, 9),
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        targetSets: ex.targetSets,
        // performedReps removed - not stored in workout sessions
        targetRest: ex.targetRest,
        suggestedWeight: ex.suggestedWeight,
        progressionNote: ex.progressionNote,
        muscleGroup: ex.muscleGroup,
        equipmentType: ex.equipmentType,
        sets: Array.from({ length: ex.targetSets }, (_, i) => {
          // Pre-fill reps ONLY if we have per-set suggestions from previous week (Week 2+)
          // Week 1 should start with 0 reps (user enters their baseline performance)
          let defaultReps = 0
          let defaultWeight = ex.suggestedWeight || 0

          if (ex.perSetSuggestions && ex.perSetSuggestions[i]) {
            // Week 2+: Use actual reps from previous week's performance
            defaultReps = ex.perSetSuggestions[i].reps
            defaultWeight = ex.perSetSuggestions[i].weight
            console.log(`[WorkoutLogger] Set ${i + 1} pre-filled from previous week: ${defaultWeight} lbs × ${defaultReps} reps`)
          } else {
            // Week 1 or no previous data: Start with 0 reps (user establishes baseline)
            console.log(`[WorkoutLogger] Set ${i + 1} starting with empty reps (no previous performance data)`)
          }

          return {
            id: Math.random().toString(36).substr(2, 9),
            reps: defaultReps, // Pre-fill ONLY from previous performance, not template
            weight: defaultWeight, // Pre-fill with suggested weight from progression
            completed: false,
          }
        }),
        completed: false,
      })),
      completed: false,
      notes: "",
    }

    console.log("[v0] Created workout structure:", {
      id: workout.id,
      exerciseCount: workout.exercises.length,
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

    const wasCompleted = set.completed
    Object.assign(set, updates)

    // Check if exercise is completed
    exercise.completed = exercise.sets.every((s) => s.completed)
    if (exercise.completed && !exercise.endTime) {
      exercise.endTime = Date.now()
    }

    // Save to localStorage (always) and optionally sync to database
    if (skipDbSync) {
      // Only save to localStorage without database sync
      this.saveCurrentWorkout(updatedWorkout)
    } else {
      // Save with userId to trigger database sync
      this.saveCurrentWorkout(updatedWorkout, userId)
    }

    // If set was just marked as completed, log it to database
    if (!wasCompleted && set.completed && userId) {
      const setNumber = exercise.sets.findIndex(s => s.id === setId) + 1
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
      if (!stored) {
        console.error(`[WorkoutLogger.completeWorkout] No in-progress workouts found in localStorage (key: ${storageKeys.inProgress})`)
        return null
      }

      const workouts: WorkoutSession[] = JSON.parse(stored)
      console.log(`[WorkoutLogger.completeWorkout] Found ${workouts.length} in-progress workouts, looking for ID: ${workoutId}`)
      console.log(`[WorkoutLogger.completeWorkout] Available workout IDs:`, workouts.map(w => w.id))
      
      const workout = workouts.find((w) => w.id === workoutId)
      if (!workout) {
        console.error(`[WorkoutLogger.completeWorkout] Workout ID ${workoutId} not found in in-progress workouts`)
        return null
      }

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
      console.error("[WorkoutLogger.completeWorkout] Failed to complete workout:", error)
      return null
    }
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

    const activeProgram = this.getActiveProgram()
    const templateId = activeProgram?.templateId
    const instanceId = workout.programInstanceId || activeProgram?.instanceId

    const normalizedWorkout: WorkoutSession = {
      ...workout,
      programId: workout.programId || templateId,
      programInstanceId: instanceId,
    }

    const storageKeys = this.getUserStorageKeys(userId)

    try {
      const existing = localStorage.getItem(storageKeys.workouts)
      const workouts: WorkoutSession[] = existing ? JSON.parse(existing) : []

      // Remove existing workout with same ID to prevent duplicates
      const filteredWorkouts = workouts.filter(w => w.id !== normalizedWorkout.id)
      filteredWorkouts.push(normalizedWorkout)
      localStorage.setItem(storageKeys.workouts, JSON.stringify(filteredWorkouts))

      // Sync to database using connection monitor
      if (userId && supabase) {
        // Add to connection monitor queue for auto-sync
        ConnectionMonitor.addToQueue(async () => {
          try {
            await supabase
              .from("workouts")
              .upsert({
                id: normalizedWorkout.id,
                user_id: userId,
                program_id: normalizedWorkout.programId || null,
                program_instance_id: normalizedWorkout.programInstanceId || null,
                workout_name: normalizedWorkout.workoutName,
                start_time: normalizedWorkout.startTime,
                end_time: normalizedWorkout.endTime || null,
                exercises: normalizedWorkout.exercises,
                notes: normalizedWorkout.notes || null,
                completed: normalizedWorkout.completed,
                week: normalizedWorkout.week || null,
                day: normalizedWorkout.day || null,
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
      return history
    } catch (error) {
      console.error("[WorkoutLogger] Error parsing workout history:", error)
      return []
    }
  }

  static getCompletedWorkout(
    week: number,
    day: number,
    userId?: string,
    programInstanceId?: string
  ): WorkoutSession | null {
    const activeProgram = this.getActiveProgram()
    const instanceId = programInstanceId ?? activeProgram?.instanceId
    const templateId = activeProgram?.templateId

    if (instanceId && templateId) {
      this.tagWorkoutsWithInstance(instanceId, templateId, userId)
    }

    const history = this.getWorkoutHistory(userId)
    return (
      history.find(
        (workout) =>
          workout.week === week &&
          workout.day === day &&
          workout.completed &&
          this.matchesInstance(workout, instanceId, templateId)
      ) || null
    )
  }

  static getWorkout(
    week: number,
    day: number,
    userId?: string,
    programInstanceId?: string
  ): WorkoutSession | null {
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
    const completed = this.getCompletedWorkout(week, day, userId, programInstanceId)
    if (completed) return completed

    // Then check in-progress workouts
    return this.getInProgressWorkout(week, day, userId)
  }

  static hasCompletedWorkout(
    week: number,
    day: number,
    userId?: string,
    programInstanceId?: string
  ): boolean {
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

    const activeProgram = this.getActiveProgram()
    const instanceId = programInstanceId ?? activeProgram?.instanceId
    const templateId = activeProgram?.templateId

    if (instanceId && templateId) {
      this.tagWorkoutsWithInstance(instanceId, templateId, userId)
    }

    const history = this.getWorkoutHistory(userId)

    // Guard against corrupted localStorage (history must be an array)
    if (!Array.isArray(history)) {
      console.warn('[WorkoutLogger] History is not an array, treating as empty')
      return false
    }

    const completedWorkout = history.find(
      (workout) =>
        workout.week === week &&
        workout.day === day &&
        workout.completed &&
        this.matchesInstance(workout, instanceId, templateId)
    )

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

  static isWeekCompleted(
    week: number,
    daysPerWeek: number,
    userId?: string,
    programInstanceId?: string
  ): boolean {
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
      if (!this.hasCompletedWorkout(week, day, userId, programInstanceId)) {
        return false
      }
    }
    return true
  }

  /**
   * Mark a workout as skipped (when ending program early)
   * Creates a completed workout with all exercises/sets marked as skipped.
   * Used by "End Program" to mark all future workouts as skipped.
   * 
   * @param params.templateDay - The workout template for the day
   * @param params.week - Week number
   * @param params.day - Day number
   * @param params.userId - User ID
   * @param params.templateId - Program template ID
   * @param params.workoutName - Name of the workout (e.g., "Push Day A")
   * @returns The created skipped workout session
   */
  static async skipWorkout(params: {
    templateDay: any
    week: number
    day: number
    userId?: string
    templateId?: string
    programInstanceId?: string
    workoutName: string
  }): Promise<WorkoutSession | null> {
    const { templateDay, week, day, userId, templateId, programInstanceId, workoutName } = params

    const activeProgram = this.getActiveProgram()
    const instanceId =
      programInstanceId ??
      (templateId && activeProgram?.templateId === templateId ? activeProgram.instanceId : activeProgram?.instanceId)

    // Create full exercise structure with all sets marked as skipped
    // This maintains data structure consistency with real workouts
    const exercises: WorkoutExercise[] = (templateDay.exercises || []).map((ex: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      exerciseId: ex.exerciseId || ex.name,
      exerciseName: ex.name,
      targetSets: ex.sets || 3,
      // performedReps removed - not stored in workout sessions
      targetRest: ex.rest || "60s",
      // Create sets with 0 reps/weight (consistent with "End Workout" behavior)
      sets: Array.from({ length: ex.sets || 3 }, () => ({
        id: Math.random().toString(36).substr(2, 9),
        reps: 0,
        weight: 0,
        completed: true,  // Mark as completed (allows week progression)
        skipped: true,    // Flag for UI display (blue minus icon)
      })),
      completed: true,
      skipped: true,
    }))

    // Create workout session matching the pattern from handleEndProgram
    const skippedWorkout: WorkoutSession = {
      id: Math.random().toString(36).substr(2, 9),
      userId: userId || "anonymous",
      programId: templateId,
      programInstanceId: instanceId,
      workoutName,
      startTime: Date.now(),
      endTime: Date.now(),
      exercises,
      notes: "Workout skipped - program ended early",
      completed: true,  // Mark as completed (allows week unlock)
      week,
      day,
      skipped: true,    // Flag for UI/reporting
    }

    // Save to history (same path as regular completed workouts)
    await this.saveWorkoutToHistory(skippedWorkout, userId)

    console.log(`[WorkoutLogger] Skipped workout: Week ${week}, Day ${day} (${workoutName})`)

    return skippedWorkout
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
    const setId = `${workoutId}-${exerciseId}-${setNumber}`
    const completedAt = Date.now()

    // Create set log entry
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
      week: week || null,
      day: day || null,
    }

    // Always save to localStorage first
    this.saveSetToLocalStorage(setLog)

    // If online, try to sync immediately
    if (userId && supabase && ConnectionMonitor.isOnline()) {
      try {
        // Use upsert to handle log/unlog/relog scenarios
        const { error } = await supabase
          .from("workout_sets")
          .upsert(setLog, {
            onConflict: 'id'
          })

        if (error) {
          console.error("[WorkoutLogger] Failed to log set to database, adding to queue:", error)
          this.addSetToSyncQueue(setLog)
        } else {
          console.log("[WorkoutLogger] Set logged successfully:", setId)
          this.removeSetFromSyncQueue(setId)
        }
      } catch (error) {
        console.error("[WorkoutLogger] Error logging set, adding to queue:", error)
        this.addSetToSyncQueue(setLog)
      }
    } else {
      // Offline - add to sync queue
      console.log("[WorkoutLogger] Offline, adding set to sync queue:", setId)
      this.addSetToSyncQueue(setLog)
    }
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
          programInstanceId: (w as any).program_instance_id || undefined,
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
          programInstanceId: (w as any).program_instance_id || undefined,
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
        if (forceRefresh) {
          const storageKeys = this.getUserStorageKeys(userId)
          localStorage.removeItem(storageKeys.workouts)
          localStorage.removeItem(storageKeys.inProgress)
          localStorage.removeItem(this.STORAGE_KEY)
          localStorage.removeItem(this.IN_PROGRESS_KEY)
          console.log("[WorkoutLogger] No data found in database. Cleared local caches (force refresh)")
        } else {
          console.log("[WorkoutLogger] No data found in database, keeping local data")
        }
      }

      this.markDatabaseLoaded()
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
   * Sync local data to database (preserve current work before loading fresh data)
   */
  static async syncToDatabase(userId: string): Promise<void> {
    if (!supabase) return

    try {
      const storageKeys = this.getUserStorageKeys(userId)

      // Sync in-progress workouts
      const localInProgress = localStorage.getItem(storageKeys.inProgress)
      if (localInProgress) {
        const inProgressWorkouts = JSON.parse(localInProgress)
        if (inProgressWorkouts.length > 0) {
          console.log("[WorkoutLogger] Syncing", inProgressWorkouts.length, "in-progress workouts to database")

          // Use individual updates/inserts to avoid bulk upsert conflicts
          for (const w of inProgressWorkouts) {
            const { data: updateData, error: updateError } = await supabase
              .from("in_progress_workouts")
              .update({
                workout_name: w.workoutName,
                start_time: w.startTime,
                exercises: w.exercises,
                notes: w.notes || null,
                program_id: w.programId || null,
                program_instance_id: w.programInstanceId || null,
              })
              .eq('id', w.id)
              .eq('user_id', userId)
              .select()

            // If no rows updated, insert
            if (!updateError && (!updateData || updateData.length === 0)) {
              await supabase
                .from("in_progress_workouts")
                .insert({
                  id: w.id,
                  user_id: userId,
                  program_id: w.programId || null,
                  program_instance_id: w.programInstanceId || null,
                  workout_name: w.workoutName,
                  start_time: w.startTime,
                  week: w.week || null,
                  day: w.day || null,
                  exercises: w.exercises,
                  notes: w.notes || null,
                })
                .select()
            }
          }

          console.log("[WorkoutLogger] Successfully synced", inProgressWorkouts.length, "in-progress workouts")
        }
      }

      // Sync completed workouts
      const localWorkouts = localStorage.getItem(storageKeys.workouts)
      if (localWorkouts) {
        const workouts = JSON.parse(localWorkouts)
        if (workouts.length > 0) {
          console.log("[WorkoutLogger] Syncing", workouts.length, "completed workouts to database")

          const { error } = await supabase
            .from("workouts")
            .upsert(
              workouts.map((w) => ({
                id: w.id,
                user_id: userId,
                program_id: w.programId || null,
                program_instance_id: w.programInstanceId || null,
                workout_name: w.workoutName,
                start_time: w.startTime,
                end_time: w.endTime || null,
                exercises: w.exercises,
                notes: w.notes || undefined,
                completed: w.completed,
                week: w.week || null,
                day: w.day || null,
              })),
              { onConflict: 'id' }
            )

          if (error) {
            console.error("[WorkoutLogger] Failed to sync completed workouts:", error)
          } else {
            console.log("[WorkoutLogger] Successfully synced completed workouts")
          }
        }
      }

      this.markDatabaseLoaded()
    } catch (error) {
      console.error("[WorkoutLogger] syncToDatabase failed:", error)
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
  /**
   * Clear all in-progress workouts (used when starting a brand-new instance)
   */
  static clearInProgress(userId?: string): void {
    if (typeof window === "undefined") return
    const storageKeys = this.getUserStorageKeys(userId)
    localStorage.removeItem(storageKeys.inProgress)
  }

  /**
   * Clear all in-progress workouts for a specific week
   * Used when advancing to a new week to clean up orphaned workouts
   */
  static async clearInProgressWorkoutsForWeek(week: number, userId?: string): Promise<void> {
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

    const activeProgram = this.getActiveProgram()
    const instanceId = activeProgram?.instanceId
    const templateId = activeProgram?.templateId

    const storageKeys = this.getUserStorageKeys(userId)

    try {
      const stored = localStorage.getItem(storageKeys.inProgress)
      if (!stored) return

      const workouts: WorkoutSession[] = JSON.parse(stored)
      console.log(`[WorkoutLogger] Before cleanup: ${workouts.length} in-progress workouts`)

      // Filter out workouts from the specified week that match the current instance
      const filteredWorkouts = workouts.filter(
        (w) => !(w.week === week && this.matchesInstance(w, instanceId, templateId))
      )

      const removedCount = workouts.length - filteredWorkouts.length
      
      if (removedCount > 0) {
        console.log(`[WorkoutLogger] Clearing ${removedCount} in-progress workouts from week ${week}`)
        localStorage.setItem(storageKeys.inProgress, JSON.stringify(filteredWorkouts))

        // Also delete from database
        if (userId && supabase) {
          const workoutsToDelete = workouts.filter(
            (w) => w.week === week && this.matchesInstance(w, instanceId, templateId)
          )

          for (const workout of workoutsToDelete) {
            await supabase
              .from("in_progress_workouts")
              .delete()
              .eq("id", workout.id)
              .eq("user_id", userId)
          }
          console.log(`[WorkoutLogger] Deleted ${workoutsToDelete.length} workouts from database`)
        }
      } else {
        console.log(`[WorkoutLogger] No in-progress workouts found for week ${week}`)
      }
    } catch (error) {
      console.error("[WorkoutLogger] Failed to clear in-progress workouts for week:", error)
    }
  }

}
