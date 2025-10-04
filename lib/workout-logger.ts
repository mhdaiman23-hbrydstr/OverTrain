import { supabase } from "./supabase"

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

export class WorkoutLogger {
  private static readonly STORAGE_KEY = "liftlog_workouts"
  private static readonly IN_PROGRESS_KEY = "liftlog_in_progress_workouts"

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

  static updateSet(
    workout: WorkoutSession,
    exerciseId: string,
    setId: string,
    updates: Partial<WorkoutSet>,
    userId?: string,
    skipDbSync: boolean = false, // New parameter to control database sync
  ): WorkoutSession | null {
    const updatedWorkout = JSON.parse(JSON.stringify(workout)) as WorkoutSession

    const exercise = updatedWorkout.exercises.find((ex) => ex.id === exerciseId)
    if (!exercise) return null

    const set = exercise.sets.find((s) => s.id === setId)
    if (!set) return null

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
  // SUPABASE SYNC METHODS
  // ============================================================================

  static async syncToDatabase(userId: string): Promise<void> {
    if (!supabase) {
      console.log("[WorkoutLogger] Supabase not configured, skipping sync")
      return
    }

    try {
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
