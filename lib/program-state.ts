import { GYM_TEMPLATES, type GymTemplate, processTemplateWithDeload } from "./gym-templates"
import { WorkoutLogger } from "./workout-logger"
import { supabase } from "./supabase"
import { programTemplateService } from "./services/program-template-service"
import { ExerciseLibraryService } from "./services/exercise-library-service"

function logSupabaseError(label: string, error: unknown) {
  if (!error) return
  if (typeof error === "object" && error !== null && "message" in (error as Record<string, unknown>) && (error as { message?: unknown }).message) {
    console.error(label, error)
  } else {
    console.warn(`${label} (no details; likely offline)`, error)
  }
}


export interface ProgressionOverride {
  enabled: boolean
  overrideType: "linear" | "percentage" | "hybrid"
  customRules?: {
    linear?: {
      weeklyIncrease: number
      minIncrement: number
    }
    percentage?: {
      requiresOneRM: boolean
      percentageProgression: Record<string, { working: number[]; deload?: number[] }>
    }
    hybrid?: {
      compoundProgression: "linear" | "percentage"
      accessoryProgression: "linear" | "percentage"
      compoundExercises: string[]
    }
  }
}

export interface ActiveProgram {
  templateId: string
  template: GymTemplate
  startDate: number
  currentWeek: number
  currentDay: number
  completedWorkouts: number
  totalWorkouts: number
  progress: number
  progressionOverride?: ProgressionOverride
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
  endedEarly?: boolean
}

export class ProgramStateManager {
  private static readonly ACTIVE_PROGRAM_KEY = "liftlog_active_program"
  private static readonly PROGRAM_PROGRESS_KEY = "liftlog_program_progress"
  private static readonly PROGRAM_HISTORY_KEY = "liftlog_program_history"

  /**
   * Load template from database first, fallback to hardcoded templates
   * This enables seamless migration from hardcoded to database templates
   */
  static async loadTemplate(templateId: string): Promise<GymTemplate | null> {
    try {
      // Try database first (new system)
      const dbTemplate = await programTemplateService.getTemplate(templateId)
      if (dbTemplate) {
        console.log('[ProgramState] Loaded template from database:', templateId)
        return dbTemplate
      }
    } catch (error) {
      console.warn('[ProgramState] Failed to load from database, using fallback:', error)
    }

    // Fallback to hardcoded templates (backwards compatibility)
    const hardcodedTemplate = GYM_TEMPLATES.find((t) => t.id === templateId)
    if (hardcodedTemplate) {
      console.log('[ProgramState] Loaded template from hardcoded GYM_TEMPLATES:', templateId)
      return hardcodedTemplate
    }

    console.error('[ProgramState] Template not found in database or GYM_TEMPLATES:', templateId)
    return null
  }

  /**
   * Get all available templates from database only
   * NOTE: Does NOT return hardcoded templates - those are only for backward compatibility
   * Falls back to hardcoded templates only if database is completely unavailable
   */
  static async getAllTemplates(): Promise<GymTemplate[]> {
    try {
      // Load templates from database
      const dbTemplates = await programTemplateService.getAllGymTemplates()
      
      if (dbTemplates.length > 0) {
        console.log(`[ProgramState] Loaded ${dbTemplates.length} templates from database`)
        return dbTemplates
      }
      
      // Only show hardcoded templates if database returns nothing (emergency fallback)
      console.warn('[ProgramState] No database templates found, using hardcoded fallback')
      return GYM_TEMPLATES
    } catch (error) {
      console.error('[ProgramState] Failed to load database templates, using hardcoded fallback:', error)
      return GYM_TEMPLATES
    }
  }

  static async getActiveProgram(options?: { refreshTemplate?: boolean }): Promise<ActiveProgram | null> {
    if (typeof window === "undefined") return null

    try {
      const stored = localStorage.getItem(this.ACTIVE_PROGRAM_KEY)
      if (!stored) return null

      const program = JSON.parse(stored) as ActiveProgram

      // If template is missing or corrupted, reload it from database
      if (!program.template || !program.template.schedule) {
        console.warn('[ProgramState] Active program missing template data, reloading from database...')
        
        // Load template from database (or fallback to hardcoded)
        const template = await this.loadTemplate(program.templateId)
        if (!template) {
          console.error("[ProgramState] Template not found for active program:", program.templateId)
          return null
        }
        program.template = template
        // Save the corrected program back to localStorage
        localStorage.setItem(this.ACTIVE_PROGRAM_KEY, JSON.stringify(program))
        console.log('[ProgramState] Template reloaded successfully from database')
      }

      // Option to force refresh template from database (for template updates)
      if (options?.refreshTemplate) {
        console.log('[ProgramState] Refreshing template from database...')
        const freshTemplate = await this.loadTemplate(program.templateId)
        if (freshTemplate) {
          // Preserve program progress, only update template
          program.template = freshTemplate
          localStorage.setItem(this.ACTIVE_PROGRAM_KEY, JSON.stringify(program))
          console.log('[ProgramState] Template refreshed with latest database version')
        }
      }

      return program
    } catch (error) {
      console.error("[v0] Error loading active program:", error)
      return null
    }
  }

  static async setActiveProgram(templateId: string, progressionOverride?: ProgressionOverride, userId?: string): Promise<ActiveProgram | null> {
    if (typeof window === "undefined") return null

    // Load template from database or fallback to hardcoded
    let template = await this.loadTemplate(templateId)
    if (!template) {
      console.error('[ProgramState] Template not found:', templateId)
      return null
    }

    // Process template to add automatic deload weeks
    template = processTemplateWithDeload(template)
    console.log("[ProgramState] Processed template with automatic deload weeks")

    // Calculate total workouts in the program
    const daysInSchedule = Object.keys(template.schedule).length
    const totalWorkouts = daysInSchedule * template.weeks

    const activeProgram: ActiveProgram = {
      templateId,
      template,
      startDate: Date.now(),
      currentWeek: 1,
      currentDay: 1,
      completedWorkouts: 0,
      totalWorkouts,
      progress: 0,
      progressionOverride,
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
      endedEarly: false,
    }

    // End any currently active program in history
    history.forEach((p) => {
      if (p.isActive) {
        const wasCompleted = Number(p.completionRate ?? 0) >= 100
        p.isActive = false
        p.endDate = new Date().toISOString()
        p.endedEarly = !wasCompleted
      }
    })

    history.push(newHistoryEntry)
    localStorage.setItem(this.PROGRAM_HISTORY_KEY, JSON.stringify(history))

    // Sync to database
    if (userId) {
      await this.syncToDatabase(userId)
    }

    return activeProgram
  }

  static clearActiveProgram(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(this.ACTIVE_PROGRAM_KEY)
    localStorage.removeItem(this.PROGRAM_PROGRESS_KEY)
    localStorage.removeItem(this.PROGRAM_HISTORY_KEY)
  }

  /**
   * Clear all program history
   * Useful for testing and starting fresh
   */
  static clearProgramHistory(): void {
    if (typeof window === "undefined") return
    
    console.log("[ProgramState] Clearing all program history")
    localStorage.removeItem(this.PROGRAM_HISTORY_KEY)
    
    // Also clear the active program
    localStorage.removeItem(this.ACTIVE_PROGRAM_KEY)
    
    window.dispatchEvent(new Event("programChanged"))
    
    console.log("[ProgramState] Program history cleared successfully")
  }

  static async getCurrentWorkout(): Promise<{ name: string; exercises: any[] } | null> {
    const activeProgram = await this.getActiveProgram()

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
    // Fetch exercise metadata from database to get correct muscle group and equipment type
    const exerciseService = ExerciseLibraryService.getInstance()
    const exercises = await Promise.all(workout.exercises.map(async (exercise) => {
      let muscleGroup = exercise.category  // Fallback to category ("compound"/"isolation")
      let equipmentType = exercise.equipmentType  // Use template equipment if available

      // Try to fetch from exercise library for accurate data
      try {
        const dbExercise = await exerciseService.getExerciseByName(exercise.exerciseName)
        if (dbExercise) {
          muscleGroup = dbExercise.muscleGroup  // e.g., "Back", "Chest"
          equipmentType = dbExercise.equipmentType  // e.g., "Barbell", "Cable", "Bodyweight Only"
        }
      } catch (error) {
        console.warn(`[ProgramState] Could not fetch exercise metadata for "${exercise.exerciseName}":`, error)
        // Continue with fallback values
      }

      return {
        exerciseId: exercise.exerciseName.toLowerCase().replace(/\s+/g, "-"),
        exerciseName: exercise.exerciseName,
        targetSets: exercise.progressionTemplate.week1?.sets || 3,
        targetReps: exercise.progressionTemplate.week1?.repRange || "8-10",
        targetRest: exercise.restTime,
        muscleGroup,
        equipmentType,
      }
    }))

    return {
      name: workout.name,
      exercises,
    }
  }

  static async completeWorkout(userId?: string): Promise<void> {
    const activeProgram = await this.getActiveProgram()
    if (!activeProgram) return

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

    activeProgram.completedWorkouts += 1
    activeProgram.progress = (activeProgram.completedWorkouts / activeProgram.totalWorkouts) * 100

    const scheduleKeys = Object.keys(activeProgram.template.schedule)
    const daysPerWeek = scheduleKeys.length

    // Check if all days in the current week are now completed
    const isCurrentWeekComplete = WorkoutLogger.isWeekCompleted(activeProgram.currentWeek, daysPerWeek, userId)

    if (isCurrentWeekComplete) {
      // Check if we've reached the program's final week
      const programWeeks = activeProgram.template.weeks || 6 // Default to 6 weeks if not set
      if (activeProgram.currentWeek >= programWeeks) {
        // Program is complete - finalize it instead of advancing to next week
        console.log("[v0] Program completed! Finalizing program after week", activeProgram.currentWeek)
        await this.finalizeActiveProgram(userId, { endedEarly: false })
        return
      }
      
      // All days in current week are done, advance to next week
      activeProgram.currentWeek += 1
      activeProgram.currentDay = 1
      console.log("[v0] Week completed! Advanced to week", activeProgram.currentWeek)
    } else {
      // Find the next incomplete day in the current week
      let nextDay = activeProgram.currentDay
      for (let day = 1; day <= daysPerWeek; day++) {
        if (!WorkoutLogger.hasCompletedWorkout(activeProgram.currentWeek, day, userId)) {
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

    // Sync to database
    if (userId) {
      await this.syncToDatabase(userId)
    }
  }


  static async finalizeActiveProgram(userId?: string, options?: { endedEarly?: boolean }): Promise<void> {
    const activeProgram = await this.getActiveProgram()
    if (!activeProgram) return

    activeProgram.completedWorkouts = activeProgram.totalWorkouts
    activeProgram.progress = 100

    const history = this.getProgramHistory()
    let historyUpdated = false

    history.forEach((entry) => {
      if (entry.isActive) {
        entry.completedWorkouts = activeProgram.totalWorkouts
        entry.totalWorkouts = activeProgram.totalWorkouts
        entry.completionRate = 100
        entry.isActive = false
        entry.endDate = new Date().toISOString()
        entry.endedEarly = options?.endedEarly ?? false
        historyUpdated = true
      }
    })

    if (historyUpdated) {
      localStorage.setItem(this.PROGRAM_HISTORY_KEY, JSON.stringify(history))
    }

    localStorage.removeItem(this.ACTIVE_PROGRAM_KEY)
    localStorage.removeItem(this.PROGRAM_PROGRESS_KEY)

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("programChanged"))
    }

    if (userId && supabase) {
      try {
        await supabase.from("active_programs").delete().eq("user_id", userId)
      } catch (error) {
        logSupabaseError("[ProgramState] Failed to remove active program from database:", error)
      }

      if (history.length > 0) {
        try {
          await supabase
            .from("program_history")
            .upsert(
              history.map((h) => ({
                id: h.id,
                user_id: userId,
                template_id: h.templateId,
                name: h.name,
                start_date: h.startDate,
                end_date: h.endDate || null,
                completion_rate: h.completionRate,
                total_workouts: h.totalWorkouts,
                completed_workouts: h.completedWorkouts,
                is_active: h.isActive,
              }))
            )
        } catch (error) {
          logSupabaseError("[ProgramState] Failed to sync program history:", error)
        }
      }
    }
  }
  static async recalculateProgress(): Promise<void> {
    const activeProgram = await this.getActiveProgram()
    if (!activeProgram) return

    // Get current user ID
    let userId: string | undefined
    try {
      const storedUser = localStorage.getItem("liftlog_user")
      const currentUser = storedUser ? JSON.parse(storedUser) : null
      userId = currentUser?.id
    } catch {
      // Fallback to anonymous if localStorage is not available
    }

    const scheduleKeys = Object.keys(activeProgram.template.schedule)
    const daysPerWeek = scheduleKeys.length

    console.log("[ProgramState] Recalculating progress for user:", userId)
    console.log("[ProgramState] Days per week:", daysPerWeek)

    // Debug: Check what workouts are completed
    const completedWorkouts: { week: number; day: number }[] = []
    const debugWeeks = activeProgram.template.weeks || 6 // Use template weeks or fallback
    for (let week = 1; week <= debugWeeks; week++) {
      for (let day = 1; day <= daysPerWeek; day++) {
        if (WorkoutLogger.hasCompletedWorkout(week, day, userId)) {
          completedWorkouts.push({ week, day })
        }
      }
    }
    console.log("[ProgramState] Completed workouts found:", completedWorkouts)

    // Find the first incomplete workout (start from week 1)
    let foundIncomplete = false
    const maxWeeks = activeProgram.template.weeks || 6 // Fallback to 6 weeks if not set
    for (let week = 1; week <= maxWeeks; week++) {
      for (let day = 1; day <= daysPerWeek; day++) {
        const isCompleted = WorkoutLogger.hasCompletedWorkout(week, day, userId)
        console.log(`[ProgramState] Week ${week}, Day ${day}: ${isCompleted ? 'COMPLETED' : 'INCOMPLETE'}`)

        if (!isCompleted) {
          activeProgram.currentWeek = week
          activeProgram.currentDay = day
          foundIncomplete = true
          console.log("[ProgramState] Recalculated progress to week", week, "day", day)
          break
        }
      }
      if (foundIncomplete) break
    }

    // If all workouts are completed (unlikely in practice), stay at current position
    if (!foundIncomplete) {
      console.log("[ProgramState] All workouts appear to be completed, staying at current position")
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

  // ============================================================================
  // SUPABASE SYNC METHODS
  // ============================================================================

  static async syncToDatabase(userId: string): Promise<void> {
    if (!supabase) {
      console.log("[ProgramState] Supabase not configured, skipping sync")
      return
    }

    try {
      const activeProgram = await this.getActiveProgram()

      if (activeProgram) {
        // Upsert active program
        const { error } = await supabase
          .from("active_programs")
          .upsert({
            user_id: userId,
            template_id: activeProgram.templateId,
            template_data: activeProgram.template,
            start_date: activeProgram.startDate,
            current_week: activeProgram.currentWeek,
            current_day: activeProgram.currentDay,
            completed_workouts: activeProgram.completedWorkouts,
            total_workouts: activeProgram.totalWorkouts,
            progress: activeProgram.progress,
          })

        if (error) {
          logSupabaseError("[ProgramState] Failed to sync active program:", error)
        } else {
          console.log("[ProgramState] Synced active program to database")
        }
      }

      // Sync program history
      const history = this.getProgramHistory()
      if (history.length > 0) {
        const { error } = await supabase
          .from("program_history")
          .upsert(
            history.map((h) => ({
              id: h.id,
              user_id: userId,
              template_id: h.templateId,
              name: h.name,
              start_date: h.startDate,
              end_date: h.endDate || null,
              completion_rate: h.completionRate,
              total_workouts: h.totalWorkouts,
              completed_workouts: h.completedWorkouts,
              is_active: h.isActive,
            }))
          )

        if (error) {
          logSupabaseError("[ProgramState] Failed to sync program history:", error)
        } else {
          console.log("[ProgramState] Synced program history to database")
        }
      }
    } catch (error) {
      logSupabaseError("[ProgramState] Sync to database failed:", error)
    }
  }

  static async loadFromDatabase(userId: string): Promise<void> {
    if (!supabase) {
      console.log("[ProgramState] Supabase not configured, skipping load")
      return
    }

    try {
      // Load active program
      const { data: activeProgramData, error: activeProgramError } = await supabase
        .from("active_programs")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (activeProgramError && activeProgramError.code !== "PGRST116") {
        // PGRST116 = no rows returned
        logSupabaseError("[ProgramState] Failed to load active program:", activeProgramError)
      } else if (activeProgramData) {
        const activeProgram: ActiveProgram = {
          templateId: activeProgramData.template_id,
          template: activeProgramData.template_data || GYM_TEMPLATES.find((t) => t.id === activeProgramData.template_id)!,
          startDate: activeProgramData.start_date,
          currentWeek: activeProgramData.current_week,
          currentDay: activeProgramData.current_day,
          completedWorkouts: activeProgramData.completed_workouts,
          totalWorkouts: activeProgramData.total_workouts,
          progress: activeProgramData.progress,
        }

        localStorage.setItem(this.ACTIVE_PROGRAM_KEY, JSON.stringify(activeProgram))
        console.log("[ProgramState] Loaded active program from database")
      }

      // Load program history
      const { data: historyData, error: historyError } = await supabase
        .from("program_history")
        .select("*")
        .eq("user_id", userId)
        .order("start_date", { ascending: false })

      if (historyError) {
        logSupabaseError("[ProgramState] Failed to load program history:", historyError)
      } else if (historyData && historyData.length > 0) {
        const history: ProgramHistoryEntry[] = historyData.map((h) => ({
          id: h.id,
          templateId: h.template_id,
          name: h.name,
          startDate: h.start_date,
          endDate: h.end_date || undefined,
          completionRate: h.completion_rate,
          totalWorkouts: h.total_workouts,
          completedWorkouts: h.completed_workouts,
          isActive: h.is_active,
          endedEarly: (h as any).ended_early ?? (h as any).endedEarly ?? false,
        }))

        localStorage.setItem(this.PROGRAM_HISTORY_KEY, JSON.stringify(history))
        console.log("[ProgramState] Loaded program history from database")
      }
    } catch (error) {
      logSupabaseError("[ProgramState] Load from database failed:", error)
    }
  }
}
