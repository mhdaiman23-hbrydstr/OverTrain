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

  static saveCurrentWorkout(workout: WorkoutSession): void {
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
    } catch (error) {
      console.error("Failed to save workout:", error)
    }
  }

  static clearCurrentWorkout(week?: number, day?: number): void {
    if (typeof window === "undefined") return

    try {
      if (week && day) {
        const stored = localStorage.getItem(this.IN_PROGRESS_KEY)
        if (!stored) return

        let workouts: WorkoutSession[] = JSON.parse(stored)
        workouts = workouts.filter((w) => !(w.week === week && w.day === day))
        localStorage.setItem(this.IN_PROGRESS_KEY, JSON.stringify(workouts))
      } else {
        // Clear all in-progress workouts
        localStorage.removeItem(this.IN_PROGRESS_KEY)
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
      notes: exercises.find((e) => e.progressionNote)?.progressionNote || "",
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

    this.saveCurrentWorkout(updatedWorkout)
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

  static completeWorkout(workoutId: string): WorkoutSession | null {
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
      this.saveWorkoutToHistory(workout)

      // Remove from in-progress
      if (workout.week && workout.day) {
        this.clearCurrentWorkout(workout.week, workout.day)
      }

      return workout
    } catch (error) {
      console.error("Failed to complete workout:", error)
      return null
    }
  }

  private static saveWorkoutToHistory(workout: WorkoutSession): void {
    if (typeof window === "undefined") return

    try {
      const existing = localStorage.getItem(this.STORAGE_KEY)
      const workouts: WorkoutSession[] = existing ? JSON.parse(existing) : []
      workouts.push(workout)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workouts))
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
}
