import { GYM_TEMPLATES, type GymTemplate } from "./gym-templates"
import { WorkoutLogger } from "./workout-logger"

export interface ActiveProgram {
  templateId: string
  template: GymTemplate
  startDate: number
  currentWeek: number
  currentDay: number
  completedWorkouts: number
  totalWorkouts: number
  progress: number
}

export interface ProgramProgress {
  workoutId: string
  date: number
  completed: boolean
  exercises: {
    exerciseId: string
    sets: {
      reps: number
      weight: number
      completed: boolean
    }[]
  }[]
}

export interface ProgramHistoryEntry {
  id: string
  templateId: string
  name: string
  startDate: string
  completionRate: number
  totalWorkouts: number
  completedWorkouts: number
  isActive: boolean
  endDate?: string
}

export class ProgramStateManager {
  private static readonly ACTIVE_PROGRAM_KEY = "liftlog_active_program"
  private static readonly PROGRAM_PROGRESS_KEY = "liftlog_program_progress"
  private static readonly PROGRAM_HISTORY_KEY = "liftlog_program_history"

  static getActiveProgram(): ActiveProgram | null {
    if (typeof window === "undefined") return null

    try {
      const stored = localStorage.getItem(this.ACTIVE_PROGRAM_KEY)
      if (!stored) return null

      const program = JSON.parse(stored) as ActiveProgram

      if (!program.template || !program.template.schedule) {
        const template = GYM_TEMPLATES.find((t) => t.id === program.templateId)
        if (!template) {
          console.error("[v0] Template not found for active program:", program.templateId)
          return null
        }
        program.template = template
        // Save the corrected program back to localStorage
        localStorage.setItem(this.ACTIVE_PROGRAM_KEY, JSON.stringify(program))
      }

      return program
    } catch (error) {
      console.error("[v0] Error loading active program:", error)
      return null
    }
  }

  static setActiveProgram(templateId: string): ActiveProgram | null {
    if (typeof window === "undefined") return null

    const template = GYM_TEMPLATES.find((t) => t.id === templateId)
    if (!template) return null

    // Calculate total workouts in the program
    const daysInSchedule = Object.keys(template.schedule).length
    const totalWorkouts = daysInSchedule * 12 // Assuming 12 weeks for now

    const activeProgram: ActiveProgram = {
      templateId,
      template,
      startDate: Date.now(),
      currentWeek: 1,
      currentDay: 1,
      completedWorkouts: 0,
      totalWorkouts,
      progress: 0,
    }

    localStorage.setItem(this.ACTIVE_PROGRAM_KEY, JSON.stringify(activeProgram))
    console.log("[v0] Set active program:", activeProgram)

    window.dispatchEvent(new Event("programChanged"))

    const history = this.getProgramHistory()
    const newHistoryEntry = {
      id: `program-${Date.now()}`,
      templateId,
      name: template.name,
      startDate: new Date().toISOString(),
      completionRate: 0,
      totalWorkouts,
      completedWorkouts: 0,
      isActive: true,
    }

    // End any currently active program in history
    history.forEach((p) => {
      if (p.isActive) {
        p.isActive = false
        p.endDate = new Date().toISOString()
      }
    })

    history.push(newHistoryEntry)
    localStorage.setItem(this.PROGRAM_HISTORY_KEY, JSON.stringify(history))

    return activeProgram
  }

  static clearActiveProgram(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(this.ACTIVE_PROGRAM_KEY)
    localStorage.removeItem(this.PROGRAM_PROGRESS_KEY)
    localStorage.removeItem(this.PROGRAM_HISTORY_KEY)
  }

  static getCurrentWorkout(): { name: string; exercises: any[] } | null {
    const activeProgram = this.getActiveProgram()

    if (!activeProgram) {
      return null
    }

    const { template, currentDay } = activeProgram

    const scheduleKeys = Object.keys(template.schedule)

    if (currentDay > scheduleKeys.length) {
      // Reset to first day if we've completed the cycle
      activeProgram.currentDay = 1
      this.saveActiveProgram(activeProgram)
    }

    const dayKey = scheduleKeys[activeProgram.currentDay - 1]

    const workout = template.schedule[dayKey]

    if (!workout) {
      return null
    }

    // Convert gym template format to workout logger format
    const exercises = workout.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseName.toLowerCase().replace(/\s+/g, "-"),
      exerciseName: exercise.exerciseName,
      targetSets: exercise.progressionTemplate.week1?.sets || 3,
      targetReps: exercise.progressionTemplate.week1?.repRange || "8-10",
      targetRest: exercise.restTime,
      muscleGroup: exercise.category,
    }))

    return {
      name: workout.name,
      exercises,
    }
  }

  static completeWorkout(): void {
    const activeProgram = this.getActiveProgram()
    if (!activeProgram) return

    activeProgram.completedWorkouts += 1
    activeProgram.progress = (activeProgram.completedWorkouts / activeProgram.totalWorkouts) * 100

    const scheduleKeys = Object.keys(activeProgram.template.schedule)
    const daysPerWeek = scheduleKeys.length

    // Import WorkoutLogger to check completion status

    // Check if all days in the current week are now completed
    const isCurrentWeekComplete = WorkoutLogger.isWeekCompleted(activeProgram.currentWeek, daysPerWeek)

    if (isCurrentWeekComplete) {
      // All days in current week are done, advance to next week
      activeProgram.currentWeek += 1
      activeProgram.currentDay = 1
      console.log("[v0] Week completed! Advanced to week", activeProgram.currentWeek)
    } else {
      // Find the next incomplete day in the current week
      let nextDay = activeProgram.currentDay
      for (let day = 1; day <= daysPerWeek; day++) {
        if (!WorkoutLogger.hasCompletedWorkout(activeProgram.currentWeek, day)) {
          nextDay = day
          break
        }
      }
      activeProgram.currentDay = nextDay
      console.log("[v0] Advanced to next incomplete day:", nextDay)
    }

    this.saveActiveProgram(activeProgram)

    window.dispatchEvent(new Event("programChanged"))

    const historyEntry = this.getProgramHistory().find((p) => p.isActive)
    if (historyEntry) {
      historyEntry.completedWorkouts = activeProgram.completedWorkouts
      historyEntry.completionRate = activeProgram.progress
      localStorage.setItem(this.PROGRAM_HISTORY_KEY, JSON.stringify(this.getProgramHistory()))
    }

    console.log("[v0] Completed workout, updated progress:", activeProgram)
  }

  static recalculateProgress(): void {
    const activeProgram = this.getActiveProgram()
    if (!activeProgram) return

    const scheduleKeys = Object.keys(activeProgram.template.schedule)
    const daysPerWeek = scheduleKeys.length

    // Find the first incomplete workout
    let foundIncomplete = false
    for (let week = 1; week <= 12; week++) {
      for (let day = 1; day <= daysPerWeek; day++) {
        if (!WorkoutLogger.hasCompletedWorkout(week, day)) {
          activeProgram.currentWeek = week
          activeProgram.currentDay = day
          foundIncomplete = true
          console.log("[v0] Recalculated progress to week", week, "day", day)
          break
        }
      }
      if (foundIncomplete) break
    }

    this.saveActiveProgram(activeProgram)
    window.dispatchEvent(new Event("programChanged"))
  }

  private static saveActiveProgram(program: ActiveProgram): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.ACTIVE_PROGRAM_KEY, JSON.stringify(program))
  }

  static getProgramProgress(): ProgramProgress[] {
    if (typeof window === "undefined") return []

    try {
      const stored = localStorage.getItem(this.PROGRAM_PROGRESS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  static addWorkoutProgress(progress: ProgramProgress): void {
    if (typeof window === "undefined") return

    const existing = this.getProgramProgress()
    existing.push(progress)
    localStorage.setItem(this.PROGRAM_PROGRESS_KEY, JSON.stringify(existing))
  }

  private static getProgramHistory(): ProgramHistoryEntry[] {
    if (typeof window === "undefined") return []
    try {
      const history = localStorage.getItem(this.PROGRAM_HISTORY_KEY)
      return history ? JSON.parse(history) : []
    } catch {
      return []
    }
  }
}
