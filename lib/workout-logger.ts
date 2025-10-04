import { supabase } from "./supabase"
import { ConnectionMonitor, type SetSyncProvider } from "./connection-monitor"

export interface WorkoutSet {
  id: string
  reps: number
  weight: number
  completed: boolean
  restStartTime?: number
  notes?: string
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
}

export class WorkoutLogger implements SetSyncProvider {
  private static readonly STORAGE_KEY = "liftlog_workouts"
  private static readonly IN_PROGRESS_KEY = "liftlog_in_progress_workouts"

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
          this.validateWorkoutSetIntegrity(userId, workoutId)
      }
      console.log("[WorkoutLogger] Development tools available at window.WorkoutLoggerDev")
    }
  }

  static getInProgressWorkout(week: number, day: number): WorkoutSession | null {
    if (typeof window === "undefined") return null

    try {
      const stored = localStorage.getItem(this.IN_PROGRESS_KEY)
      if (!stored) return null

      const workouts: WorkoutSession[] = JSON.parse(stored)
      return workouts.find((w) => w.week === week && w.day === day) || null
    } catch {
      return null
    }
  }

  static getCurrentWorkout(): WorkoutSession | null {
    if (typeof window === "undefined") return null

    try {
      const activeProgram = typeof window !== "undefined" ? this.getActiveProgram() : null
      if (!activeProgram) return null

      return this.getInProgressWorkout(activeProgram.currentWeek, activeProgram.currentDay)
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

    try {
      const stored = localStorage.getItem(this.IN_PROGRESS_KEY)
      let workouts: WorkoutSession[] = stored ? JSON.parse(stored) : []

      // Remove existing workout for this week/day
      workouts = workouts.filter((w) => !(w.week === workout.week && w.day === workout.day))

      // Add updated workout
      workouts.push(workout)

      localStorage.setItem(this.IN_PROGRESS_KEY, JSON.stringify(workouts))

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

    try {
      if (week && day) {
        const stored = localStorage.getItem(this.IN_PROGRESS_KEY)
        if (!stored) return

        let workouts: WorkoutSession[] = JSON.parse(stored)
        const workoutToDelete = workouts.find((w) => w.week === week && w.day === day)
        workouts = workouts.filter((w) => !(w.week === week && w.day === day))
        localStorage.setItem(this.IN_PROGRESS_KEY, JSON.stringify(workouts))

        // Delete from database
        if (userId && supabase && workoutToDelete) {
          await supabase
            .from("in_progress_workouts")
            .delete()
            .eq("id", workoutToDelete.id)
        }
      } else {
        // Clear all in-progress workouts
        localStorage.removeItem(this.IN_PROGRESS_KEY)

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
      userId: "current-user",
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
        })),
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

  static startRest(workoutId: string, exerciseId: string, setId: string): WorkoutSession | null {
    const workout = this.getCurrentWorkout()
    if (!workout || workout.id !== workoutId) return null

    const exercise = workout.exercises.find((ex) => ex.id === exerciseId)
    if (!exercise) return null

    const set = exercise.sets.find((s) => s.id === setId)
    if (!set) return null

    set.restStartTime = Date.now()
    this.saveCurrentWorkout(workout)
    return workout
  }

  static async completeWorkout(workoutId: string, userId?: string): Promise<WorkoutSession | null> {
    if (typeof window === "undefined") return null

    try {
      const stored = localStorage.getItem(this.IN_PROGRESS_KEY)
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

  private static async saveWorkoutToHistory(workout: WorkoutSession, userId?: string): Promise<void> {
    if (typeof window === "undefined") return

    try {
      const existing = localStorage.getItem(this.STORAGE_KEY)
      const workouts: WorkoutSession[] = existing ? JSON.parse(existing) : []

      // Remove existing workout with same ID to prevent duplicates
      const filteredWorkouts = workouts.filter(w => w.id !== workout.id)
      filteredWorkouts.push(workout)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredWorkouts))

      // Sync to database
      if (userId && supabase) {
        try {
          await supabase
            .from("workouts")
            .upsert({  // Changed from insert to upsert
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
        } catch (error) {
          console.error("Failed to sync completed workout to database:", error)
        }
      }
    } catch (error) {
      console.error("Failed to save workout to history:", error)
    }
  }

  static getWorkoutHistory(): WorkoutSession[] {
    if (typeof window === "undefined") return []

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  static getCompletedWorkout(week: number, day: number): WorkoutSession | null {
    const history = this.getWorkoutHistory()
    return history.find((workout) => workout.week === week && workout.day === day && workout.completed) || null
  }

  static getWorkout(week: number, day: number): WorkoutSession | null {
    // First check completed workouts in history
    const completed = this.getCompletedWorkout(week, day)
    if (completed) return completed

    // Then check in-progress workouts
    return this.getInProgressWorkout(week, day)
  }

  static hasCompletedWorkout(week: number, day: number): boolean {
    const history = this.getWorkoutHistory()
    return history.some((workout) => workout.week === week && workout.day === day && workout.completed)
  }

  static isWeekCompleted(week: number, daysPerWeek: number): boolean {
    for (let day = 1; day <= daysPerWeek; day++) {
      if (!this.hasCompletedWorkout(week, day)) {
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
        const { error } = await supabase
          .from("workout_sets")
          .insert(setLog)

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
          new Map(workouts.map(w => [w.id, w])).values()
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
          console.error("[WorkoutLogger] Failed to sync workouts:", error)
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
            new Map(inProgressWorkouts.map(w => [w.id, w])).values()
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
            console.error("[WorkoutLogger] Failed to sync in-progress workouts:", error)
          } else {
            console.log("[WorkoutLogger] Synced", uniqueInProgress.length, "in-progress workouts to database")
          }
        }
      }
    } catch (error) {
      console.error("[WorkoutLogger] Sync to database failed:", error)
    }
  }

  static async loadFromDatabase(userId: string): Promise<void> {
    if (!supabase) {
      console.log("[WorkoutLogger] Supabase not configured, skipping load")
      return
    }

    try {
      // Load completed workouts
      const { data: workoutsData, error: workoutsError } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", userId)
        .order("start_time", { ascending: false })

      if (workoutsError) {
        console.error("[WorkoutLogger] Failed to load workouts:", workoutsError)
      } else if (workoutsData && workoutsData.length > 0) {
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

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workouts))
        console.log("[WorkoutLogger] Loaded", workouts.length, "workouts from database")
      }

      // Load in-progress workouts
      const { data: inProgressData, error: inProgressError } = await supabase
        .from("in_progress_workouts")
        .select("*")
        .eq("user_id", userId)

      if (inProgressError) {
        console.error("[WorkoutLogger] Failed to load in-progress workouts:", inProgressError)
      } else if (inProgressData && inProgressData.length > 0) {
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

        localStorage.setItem(this.IN_PROGRESS_KEY, JSON.stringify(inProgressWorkouts))
        console.log("[WorkoutLogger] Loaded", inProgressWorkouts.length, "in-progress workouts from database")
      }
    } catch (error) {
      console.error("[WorkoutLogger] Load from database failed:", error)
    }
  }
}
