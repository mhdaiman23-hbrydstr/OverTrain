import { GYM_TEMPLATES, type GymTemplate, processTemplateWithDeload } from "./gym-templates"
import { WorkoutLogger } from "./workout-logger"
import { supabase } from "./supabase"
import { programTemplateService } from "./services/program-template-service"
import { ExerciseLibraryService } from "./services/exercise-library-service"

function logSupabaseError(label: string, error: unknown) {
  if (!error) return

  if (typeof error === "object" && error !== null) {
    const knownError = error as Record<string, unknown>
    const message = typeof knownError.message === "string" ? knownError.message : undefined
    const code = typeof knownError.code === "string" ? knownError.code : undefined

    if (message || code) {
      console.error(`${label} code=${code ?? "unknown"} message=${message ?? "n/a"}`, knownError)
      return
    }
  }

  console.warn(`${label} (no structured details)`, error)
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
  instanceId: string
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
  instanceId?: string
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
  private static readonly DATABASE_LOAD_KEY = "liftlog_program_db_loaded_at"
  private static readonly DATABASE_STALE_MS = 5_000
  private static databaseLoadPromise: Promise<void> | null = null

  // Migration mapping from old hardcoded IDs to new database IDs
  private static readonly TEMPLATE_ID_MIGRATIONS: Record<string, string> = {
    "fullbody-3day-beginner-male": "template2",
    "fullbody-3day-beginner-female": "template2",
  }

  private static readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  private static generateInstanceId(): string {
    const cryptoRef = typeof globalThis !== "undefined" ? (globalThis as any).crypto : undefined
    if (cryptoRef && typeof cryptoRef.randomUUID === "function") {
      return cryptoRef.randomUUID()
    }
    // Fallback: manually generate RFC4122 version 4 compliant UUID
    const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
    return template.replace(/[xy]/g, (char) => {
      const rand = Math.floor(Math.random() * 16)
      const value = char === "x" ? rand : (rand & 0x3) | 0x8
      return value.toString(16)
    })
  }

  private static normalizeInstanceId(candidate?: string): string {
    if (candidate && this.UUID_REGEX.test(candidate)) {
      return candidate
    }

    if (candidate?.startsWith("program-")) {
      const trimmed = candidate.slice("program-".length)
      if (this.UUID_REGEX.test(trimmed)) {
        return trimmed
      }
    }

    return this.generateInstanceId()
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

  private static saveProgramHistory(history: ProgramHistoryEntry[]): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.PROGRAM_HISTORY_KEY, JSON.stringify(history))
  }

  private static ensureActiveProgramInstance(program: ActiveProgram): ActiveProgram {
    if (program.instanceId) {
      return program
    }

    const history = this.getProgramHistory()
    const activeHistory = history.find(
      (entry) => entry.isActive && entry.templateId === program.templateId
    )

    const rawInstanceId = activeHistory?.instanceId || activeHistory?.id || this.generateInstanceId()
    const instanceId = this.normalizeInstanceId(rawInstanceId)
    program.instanceId = instanceId

    if (activeHistory) {
      if (activeHistory.instanceId !== instanceId) {
        activeHistory.instanceId = instanceId
        this.saveProgramHistory(history)
      }
    }

    this.saveActiveProgram(program)
    WorkoutLogger.tagWorkoutsWithInstance(instanceId, program.templateId)

    return program
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

  private static async ensureDatabaseLoaded(userId?: string, options?: { force?: boolean }): Promise<void> {
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

    this.databaseLoadPromise = this.loadFromDatabase(resolvedUserId)
      .catch((error) => {
        logSupabaseError("[ProgramState] Database preload failed", error)
      })
      .finally(() => {
        this.markDatabaseLoaded()
        this.databaseLoadPromise = null
      })

    await this.databaseLoadPromise
  }

  // Migrate old template ID to new database ID if needed
  private static migrateTemplateId(oldId: string): string {
    const newId = this.TEMPLATE_ID_MIGRATIONS[oldId]
    if (newId) {
      console.log(`[ProgramState] Migrating template ID: ${oldId} -> ${newId}`)
      return newId
    }
    return oldId
  }

  /**
   * Load template from database first, fallback to hardcoded templates
   * This enables seamless migration from hardcoded to database templates
   */
  static async loadTemplate(templateId: string): Promise<GymTemplate | null> {
    // Auto-migrate old template IDs
    const migratedId = this.migrateTemplateId(templateId)

    try {
      const dbTemplate = await programTemplateService.getTemplate(migratedId)
      if (dbTemplate) {
        console.log('[ProgramState] Loaded template from database:', migratedId)
        return dbTemplate
      }
    } catch (error) {
      console.error('[ProgramState] Failed to load template from database:', error)
      return null
    }

    console.error('[ProgramState] Template not found in database:', templateId)
    return null
  }

  /**
   * Get all available templates from database only
   * NOTE: Does NOT return hardcoded templates - those are only for backward compatibility
   * Falls back to hardcoded templates only if database is completely unavailable
   */
  static async getAllTemplates(): Promise<GymTemplate[]> {
    try {
      const dbTemplates = await programTemplateService.getAllGymTemplates()

      if (dbTemplates.length > 0) {
        console.log(`[ProgramState] Loaded ${dbTemplates.length} templates from database`)
        return dbTemplates
      }

      console.warn('[ProgramState] No templates found in database')
      return []
    } catch (error) {
      console.error('[ProgramState] Failed to load templates from database:', error)
      return []
    }
  }

  static async getActiveProgram(options?: { refreshTemplate?: boolean; skipDatabaseLoad?: boolean }): Promise<ActiveProgram | null> {
    if (typeof window === "undefined") return null

    try {
      const currentUserId = this.getCurrentUserId()

      if (!options?.skipDatabaseLoad) {
        await this.ensureDatabaseLoaded(currentUserId, { force: options?.refreshTemplate })
        await WorkoutLogger.ensureDatabaseLoaded(currentUserId, { force: options?.refreshTemplate })
      }

      const stored = localStorage.getItem(this.ACTIVE_PROGRAM_KEY)
      if (!stored) return null

      let program = JSON.parse(stored) as ActiveProgram

      // Validate essential program fields
      if (!program.templateId || !program.instanceId) {
        console.error('[ProgramState] Active program missing essential fields, clearing corrupted data')
        this.clearActiveProgram()
        return null
      }

      program = this.ensureActiveProgramInstance(program)

      // If template is missing or corrupted, reload it from database
      if (!program.template || !program.template.schedule) {
        console.warn('[ProgramState] Active program missing template data, reloading from database...')

        // Load template from database (or fallback to hardcoded)
        const template = await this.loadTemplate(program.templateId)
        if (!template) {
          console.error("[ProgramState] Template not found for active program:", program.templateId)
          this.clearActiveProgram()
          return null
        }
        program.template = template
        // Save the corrected program back to localStorage
        this.saveActiveProgram(program)
        console.log('[ProgramState] Template reloaded successfully from database')
      }

      // Option to force refresh template from database (for template updates)
      if (options?.refreshTemplate) {
        console.log('[ProgramState] Refreshing template from database...')
        const freshTemplate = await this.loadTemplate(program.templateId)
        if (freshTemplate) {
          // Preserve program progress, only update template
          program.template = freshTemplate
          this.saveActiveProgram(program)
          console.log('[ProgramState] Template refreshed with latest database version')
        }
      }

      return program
    } catch (error) {
      console.error("[v0] Error loading active program:", error)
      // Clear corrupted data on error
      this.clearActiveProgram()
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

    const instanceId = this.generateInstanceId()

    const activeProgram: ActiveProgram = {
      templateId,
      template,
      instanceId,
      startDate: Date.now(),
      currentWeek: 1,
      currentDay: 1,
      completedWorkouts: 0,
      totalWorkouts,
      progress: 0,
      progressionOverride,
    }

    this.saveActiveProgram(activeProgram)
    console.log("[v0] Set active program:", activeProgram)

    window.dispatchEvent(new Event("programChanged"))

    const history = this.getProgramHistory()
    const newHistoryEntry: ProgramHistoryEntry = {
      id: instanceId,
      templateId,
      instanceId,
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
        if (!p.instanceId) {
          p.instanceId = p.id
        }
      }
    })

    history.push(newHistoryEntry)
    this.saveProgramHistory(history)

    // Sync to database
    const resolvedUserId = userId ?? this.getCurrentUserId()
    if (resolvedUserId) {
      await this.syncToDatabase(resolvedUserId)
    }

    // Brand-new instance starts fresh: clear any lingering in-progress workouts
    // from previous runs so the logger mounts empty at Week 1 Day 1.
    try {
      WorkoutLogger.clearInProgress(resolvedUserId)
    } catch {
      // non-fatal
    }

    return activeProgram
  }

  static clearActiveProgram(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(this.ACTIVE_PROGRAM_KEY)
    localStorage.removeItem(this.PROGRAM_PROGRESS_KEY)
    // NOTE: Do NOT clear program history here - that should persist
    console.log("[ProgramState] Cleared active program from localStorage")
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
    localStorage.removeItem(this.DATABASE_LOAD_KEY)
    
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

    // Import ProgressionRouter dynamically to avoid circular dependencies
    const { ProgressionRouter } = await import("./progression-router")

    // Get current user profile for progression calculation
    let userProfile = { experience: "beginner" as const, gender: "male" as const }
    try {
      if (typeof window !== "undefined") {
        const storedUser = localStorage.getItem("liftlog_user")
        if (storedUser) {
          const currentUser = JSON.parse(storedUser)
          userProfile = {
            experience: (currentUser.experience as "beginner" | "intermediate" | "advanced") || "beginner",
            gender: (currentUser.gender as "male" | "female") || "male"
          }
        }
      }
    } catch (error) {
      console.warn("[ProgramState] Could not load user profile:", error)
    }

    // Convert gym template format to workout logger format
    // Fetch exercise metadata from database to get correct muscle group and equipment type
    const exerciseService = ExerciseLibraryService.getInstance()
    const exercises = await Promise.all(workout.exercises.map(async (exercise) => {
      let muscleGroup: string = exercise.category  // Fallback to category ("compound"/"isolation")
      let equipmentType: string | undefined = exercise.equipmentType  // Use template equipment if available

      // Try to fetch from exercise library for accurate data
      try {
        const dbExercise = await exerciseService.getExerciseByName(exercise.exerciseName)
        if (dbExercise) {
          muscleGroup = dbExercise.muscleGroup  // Use database muscle group (e.g., "Back", "Chest", "Legs")
          equipmentType = dbExercise.equipmentType  // e.g., "Barbell", "Cable", "Bodyweight Only"
        }
      } catch (error) {
        console.warn(`[ProgramState] Could not fetch exercise metadata for "${exercise.exerciseName}":`, error)
        // Continue with fallback values
      }

      // Get target sets for the CURRENT week (not hardcoded to week1)
      const weekKey = `week${activeProgram.currentWeek}` as keyof typeof exercise.progressionTemplate
      const weekData = exercise.progressionTemplate[weekKey]
      const targetSets = typeof weekData === 'object' && weekData && 'sets' in weekData
        ? (weekData as { sets: number }).sets
        : exercise.progressionTemplate.week1?.sets || 3

      // CRITICAL FIX: Calculate progression using ProgressionRouter to get perSetSuggestions
      let suggestedWeight: number | undefined
      let progressionNote: string | undefined
      let perSetSuggestions: any[] | undefined
      let performedReps = ""

      try {
        // Get previous performance if not Week 1
        const previousPerformance = activeProgram.currentWeek > 1
          ? ProgressionRouter.getPreviousPerformance(
              exercise.id,
              exercise.exerciseName,
              activeProgram.currentWeek,
              activeProgram.currentDay
            )
          : null

        // Calculate progression
        const progressionResult = await ProgressionRouter.calculateProgression({
          exercise,
          activeProgram,
          currentWeek: activeProgram.currentWeek,
          userProfile,
          previousPerformance: previousPerformance || undefined,
          oneRepMaxes: [] // Empty array for now
        })

        suggestedWeight = progressionResult.targetWeight
        progressionNote = progressionResult.progressionNote
        perSetSuggestions = progressionResult.perSetSuggestions

        // Set performedReps from progression result
        if (typeof progressionResult.performedReps === 'number') {
          performedReps = progressionResult.performedReps.toString()
        } else if (previousPerformance?.actualReps) {
          performedReps = previousPerformance.actualReps.toString()
        }

        console.log(`[ProgramState.getCurrentWorkout] Progression for ${exercise.exerciseName}:`, {
          week: activeProgram.currentWeek,
          suggestedWeight,
          performedReps,
          hasPerSetSuggestions: !!perSetSuggestions,
          perSetSuggestionsCount: perSetSuggestions?.length || 0
        })
      } catch (error) {
        console.error(`[ProgramState] Failed to calculate progression for "${exercise.exerciseName}":`, error)
        // Continue with empty values
      }

      return {
        exerciseId: exercise.exerciseName.toLowerCase().replace(/\s+/g, "-"),
        exerciseName: exercise.exerciseName,
        targetSets,
        performedReps,  // Now filled from progression engine for Week 2+
        targetRest: exercise.restTime,
        muscleGroup,
        equipmentType,
        suggestedWeight,  // NEW: Include suggested weight
        progressionNote,  // NEW: Include progression note
        perSetSuggestions,  // NEW: Include per-set suggestions for reps pre-filling
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
    const resolvedUserId = userId ?? this.getCurrentUserId()

    await WorkoutLogger.ensureDatabaseLoaded(resolvedUserId)

    activeProgram.completedWorkouts += 1
    activeProgram.progress = (activeProgram.completedWorkouts / activeProgram.totalWorkouts) * 100

    const scheduleKeys = Object.keys(activeProgram.template.schedule)
    const daysPerWeek = scheduleKeys.length

    // Check if all days in the current week are now completed
    const isCurrentWeekComplete = WorkoutLogger.isWeekCompleted(
      activeProgram.currentWeek,
      daysPerWeek,
      resolvedUserId,
      activeProgram.instanceId
    )

    if (isCurrentWeekComplete) {
      // Check if we've reached the program's final week
      const programWeeks = activeProgram.template.weeks || 6 // Default to 6 weeks if not set
      if (activeProgram.currentWeek >= programWeeks) {
        // Program is complete - finalize it instead of advancing to next week
        console.log("[v0] Program completed! Finalizing program after week", activeProgram.currentWeek)
        await this.finalizeActiveProgram(resolvedUserId, { endedEarly: false })
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
        if (!WorkoutLogger.hasCompletedWorkout(activeProgram.currentWeek, day, resolvedUserId, activeProgram.instanceId)) {
          nextDay = day
          break
        }
      }
      activeProgram.currentDay = nextDay
      console.log("[v0] Advanced to next incomplete day:", nextDay)
    }

    this.saveActiveProgram(activeProgram)

    window.dispatchEvent(new Event("programChanged"))

    const history = this.getProgramHistory()
    const historyEntry = history.find((p) => p.isActive)
    if (historyEntry) {
      historyEntry.completedWorkouts = activeProgram.completedWorkouts
      historyEntry.completionRate = activeProgram.progress
      historyEntry.instanceId = historyEntry.instanceId ?? historyEntry.id
      this.saveProgramHistory(history)
    }

    console.log("[v0] Completed workout, updated progress:", activeProgram)

    // Sync to database
    if (resolvedUserId) {
      await this.syncToDatabase(resolvedUserId)
    }
  }


  static async finalizeActiveProgram(userId?: string, options?: { endedEarly?: boolean }): Promise<void> {
    const activeProgram = await this.getActiveProgram()
    if (!activeProgram) return

    const resolvedUserId = userId ?? this.getCurrentUserId()

    activeProgram.completedWorkouts = activeProgram.totalWorkouts
    activeProgram.progress = 100

    WorkoutLogger.tagWorkoutsWithInstance(activeProgram.instanceId, activeProgram.templateId, resolvedUserId)
    WorkoutLogger.clearInProgress(resolvedUserId)

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
        entry.instanceId = this.normalizeInstanceId(entry.instanceId ?? activeProgram.instanceId ?? entry.id)
        historyUpdated = true
      }
    })

    if (historyUpdated) {
      this.saveProgramHistory(history)
    }

    // Clear localStorage
    localStorage.removeItem(this.ACTIVE_PROGRAM_KEY)
    localStorage.removeItem(this.PROGRAM_PROGRESS_KEY)

    // Delete from database FIRST before dispatching events
    if (resolvedUserId && supabase) {
      try {
        await supabase.from("active_programs").delete().eq("user_id", resolvedUserId)
        console.log("[ProgramState] Removed active program from database")
      } catch (error) {
        logSupabaseError("[ProgramState] Failed to remove active program from database:", error)
      }
    }

    // Sync program history to database
    if (resolvedUserId && supabase && history.length > 0) {
      try {
        await supabase
          .from("program_history")
          .upsert(
            history.map((h) => ({
              id: h.id,
              user_id: resolvedUserId,
              template_id: h.templateId,
              instance_id: this.normalizeInstanceId(h.instanceId ?? h.id),
              name: h.name,
              start_date: h.startDate,
              end_date: h.endDate || null,
              completion_rate: h.completionRate,
              total_workouts: h.totalWorkouts,
              completed_workouts: h.completedWorkouts,
              is_active: h.isActive,
            }))
          )
        console.log("[ProgramState] Synced program history to database")
      } catch (error) {
        logSupabaseError("[ProgramState] Failed to sync program history:", error)
      }
    }

    // Dispatch programEnded event (NOT programChanged) to trigger immediate UI updates
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("programEnded"))
      console.log("[ProgramState] Dispatched programEnded event")
    }
  }
  static async recalculateProgress(options?: { silent?: boolean }): Promise<void> {
    const activeProgram = await this.getActiveProgram()
    if (!activeProgram) return

    // Get current user ID
    const userId = this.getCurrentUserId()

    await this.ensureDatabaseLoaded(userId, { force: true })
    await WorkoutLogger.ensureDatabaseLoaded(userId, { force: true })

    const scheduleKeys = Object.keys(activeProgram.template.schedule)
    const daysPerWeek = scheduleKeys.length

    console.log("[ProgramState] Recalculating progress for user:", userId)
    console.log("[ProgramState] Days per week:", daysPerWeek)

    // Debug: Check what workouts are completed
    const completedWorkouts: { week: number; day: number }[] = []
    const debugWeeks = activeProgram.template.weeks || 6 // Use template weeks or fallback
    for (let week = 1; week <= debugWeeks; week++) {
      for (let day = 1; day <= daysPerWeek; day++) {
        if (WorkoutLogger.hasCompletedWorkout(week, day, userId, activeProgram.instanceId)) {
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
        const isCompleted = WorkoutLogger.hasCompletedWorkout(week, day, userId, activeProgram.instanceId)
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
    if (!options?.silent) {
      window.dispatchEvent(new Event("programChanged"))
    }
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
      if (!history) return []

      const parsed = JSON.parse(history) as ProgramHistoryEntry[]
      let needsSave = false

      parsed.forEach((entry) => {
        if (!entry.instanceId) {
          entry.instanceId = entry.id
          needsSave = true
        }
      })

      if (needsSave) {
        this.saveProgramHistory(parsed)
      }

      return parsed
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
      const activeProgram = await this.getActiveProgram({ skipDatabaseLoad: true })

      if (activeProgram) {
        // Upsert active program with NEW schema
        const { error } = await supabase
          .from("active_programs")
          .upsert({
            user_id: userId,
            program_id: activeProgram.templateId,
            instance_id: activeProgram.instanceId,
            program_name: activeProgram.template.name,
            days_per_week: Object.keys(activeProgram.template.schedule).length,
            total_weeks: activeProgram.template.weeks || 6,
            start_date: new Date(activeProgram.startDate).toISOString(),
            current_week: activeProgram.currentWeek,
            current_day: activeProgram.currentDay,
          }, { onConflict: "user_id" })

        if (error) {
          logSupabaseError("[ProgramState] Failed to sync active program:", error)
        } else {
          console.log("[ProgramState] Synced active program to database")
        }
      }

      // Sync program history
      const history = this.getProgramHistory()
      if (history.length > 0) {
        let historyChanged = false
        const historyPayload = history.map((h) => {
          const normalizedInstanceId = this.normalizeInstanceId(h.instanceId ?? h.id)
          if (h.instanceId !== normalizedInstanceId) {
            h.instanceId = normalizedInstanceId
            historyChanged = true
          }

          return {
            id: h.id,
            user_id: userId,
            template_id: h.templateId,
            instance_id: normalizedInstanceId,
            name: h.name,
            start_date: h.startDate,
            end_date: h.endDate || null,
            completion_rate: h.completionRate,
            total_workouts: h.totalWorkouts,
            completed_workouts: h.completedWorkouts,
            is_active: h.isActive,
          }
        })

        if (historyChanged) {
          this.saveProgramHistory(history)
        }

        const { error } = await supabase
          .from("program_history")
          .upsert(historyPayload)

        if (error) {
          logSupabaseError("[ProgramState] Failed to sync program history:", error)
        } else {
          console.log("[ProgramState] Synced program history to database")
        }
      }

      this.markDatabaseLoaded()
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
      await WorkoutLogger.ensureDatabaseLoaded(userId, { force: true })

      // Load active program from database
      const { data: activeProgramData, error: activeProgramError } = await supabase
        .from("active_programs")
        .select("id, user_id, program_id, program_name, instance_id, current_week, current_day, days_per_week, total_weeks, start_date, created_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle()

      if (activeProgramError && activeProgramError.code !== "PGRST116") {
        // PGRST116 = no rows returned
        logSupabaseError("[ProgramState] Failed to load active program:", activeProgramError)
      } else if (activeProgramData) {
        console.log("[ProgramState] Found active program in database:", activeProgramData.program_id)
        // Load template from database ONLY (no hardcoded fallback)
        const template = await this.loadTemplate(activeProgramData.program_id)
        if (!template) {
          console.error("[ProgramState] Template not found in database:", activeProgramData.program_id)
          return
        }

        const instanceId = activeProgramData.instance_id ?? activeProgramData.id

        // Recalculate completedWorkouts from actual workout history
        const totalWorkouts = activeProgramData.days_per_week * activeProgramData.total_weeks
        let completedWorkouts = 0

        for (let week = 1; week <= activeProgramData.current_week; week++) {
          for (let day = 1; day <= activeProgramData.days_per_week; day++) {
            if (week === activeProgramData.current_week && day >= activeProgramData.current_day) break
            if (WorkoutLogger.hasCompletedWorkout(week, day, userId, instanceId)) {
              completedWorkouts++
            }
          }
        }

        const activeProgram: ActiveProgram = {
          templateId: activeProgramData.program_id,
          template,
          instanceId,
          startDate: new Date(activeProgramData.start_date).getTime(),
          currentWeek: activeProgramData.current_week,
          currentDay: activeProgramData.current_day,
          completedWorkouts,
          totalWorkouts,
          progress: (completedWorkouts / totalWorkouts) * 100,
        }

        this.saveActiveProgram(activeProgram)
        WorkoutLogger.tagWorkoutsWithInstance(instanceId, activeProgram.templateId, userId)

        console.log("[ProgramState] Loaded active program from database")
      } else {
        localStorage.removeItem(this.ACTIVE_PROGRAM_KEY)
        localStorage.removeItem(this.PROGRAM_PROGRESS_KEY)
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
          instanceId: h.instance_id ?? h.id,
          name: h.name,
          startDate: h.start_date,
          endDate: h.end_date || undefined,
          completionRate: h.completion_rate,
          totalWorkouts: h.total_workouts,
          completedWorkouts: h.completed_workouts,
          isActive: h.is_active,
          endedEarly: (h as any).ended_early ?? (h as any).endedEarly ?? false,
        }))

        this.saveProgramHistory(history)
        console.log("[ProgramState] Loaded program history from database")
      } else if (!historyError) {
        this.saveProgramHistory([])
      }

      this.markDatabaseLoaded()
    } catch (error) {
      logSupabaseError("[ProgramState] Load from database failed:", error)
    }
  }
}
