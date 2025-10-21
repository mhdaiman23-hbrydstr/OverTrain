import { GYM_TEMPLATES, type GymTemplate, processTemplateWithDeload } from "./gym-templates"
import { WorkoutLogger } from "./workout-logger"
import { supabase } from "./supabase"
import { programTemplateService } from "./services/program-template-service"
import { programForkService } from "./services/program-fork-service"
import { ExerciseLibraryService } from "./services/exercise-library-service"
import { ProgressionRouter } from "./progression-router"

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
  isCustom?: boolean
  originTemplateId?: string
}

interface ReplacementExercisePayload {
  id: string
  name: string
  muscleGroup?: string
  equipmentType?: string
}

export interface MyProgramInfo {
  id: string
  name: string
  days: number
  weeks: number
  forkedAt?: string | null
  originTemplateName?: string | null
  originTemplateId?: string | null
  createdFrom?: string | null
  isActive: boolean
  isPublic?: boolean
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
  private static ensureCustomTemplatePromise: Promise<void> | null = null

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

  private static async ensureActiveProgramInstance(program: ActiveProgram): Promise<ActiveProgram> {
    if (program.instanceId) {
      if (!program.isCustom && (program as any)?.template?.ownerUserId) {
        program.isCustom = true
        if (!program.originTemplateId) {
          program.originTemplateId = (program as any)?.template?.originTemplateId ?? program.templateId
        }
        await this.saveActiveProgram(program)
      } else if (!program.originTemplateId) {
        program.originTemplateId = (program as any)?.template?.originTemplateId ?? program.templateId
        await this.saveActiveProgram(program)
      }

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

    await this.saveActiveProgram(program)
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
   * Get all available templates from database only (LIGHTWEIGHT - metadata only)
   * Returns templates without exercise data for faster loading in list views
   * Use loadTemplate() to get full template with exercises when needed
   */
  static async getAllTemplates(): Promise<GymTemplate[]> {
    try {
      // OPTIMIZATION: Load lightweight metadata only (no exercises)
      const dbTemplates = await programTemplateService.getAllTemplates()

      if (dbTemplates.length > 0) {
        // Convert DbProgramTemplate to GymTemplate format (without exercises)
        const gymTemplates: GymTemplate[] = dbTemplates.map(t => ({
          id: t.id,
          name: t.name,
          days: t.days_per_week,
          weeks: t.total_weeks,
          gender: t.gender as ('male' | 'female')[],
          experience: t.experience_level as ('beginner' | 'intermediate' | 'advanced')[],
          ownerUserId: t.owner_user_id ?? null,
          originTemplateId: t.origin_template_id ?? null,
          forkedAt: t.forked_at ?? null,
          createdFrom: t.created_from ?? null,
          isPublic: t.is_public ?? false,
          progressionScheme: {
            type: 'linear',
            deloadWeek: t.deload_week || t.total_weeks,
            progressionRules: {
              compound: {
                successThreshold: 'all_sets_completed',
                weightIncrease: 5,
                failureResponse: 'repeat_week'
              },
              isolation: {
                successThreshold: 'all_sets_completed',
                weightIncrease: 2.5,
                failureResponse: 'repeat_week'
              }
            }
          },
          schedule: {} // Empty schedule - exercises loaded on-demand
        }))

        console.log(`[ProgramState] Loaded ${gymTemplates.length} lightweight templates (metadata only)`)
        return gymTemplates
      }

      console.warn('[ProgramState] No templates found in database')
      return []
    } catch (error) {
      console.error('[ProgramState] Failed to load templates from database:', error)
      return []
    }
  }

  private static recalculateActiveProgramStats(program: ActiveProgram): void {
    const daysPerWeek = Object.keys(program.template.schedule ?? {}).length
    const totalWeeks = program.template.weeks || 0
    const totalWorkouts = daysPerWeek * totalWeeks
    program.totalWorkouts = totalWorkouts
    program.progress = totalWorkouts > 0 ? (program.completedWorkouts / totalWorkouts) * 100 : 0
  }

  /**
   * Get user-owned programs (My Programs) as lightweight GymTemplate metadata
   */
  static async getMyPrograms(): Promise<MyProgramInfo[]> {
    try {
      const userId = this.getCurrentUserId()
      if (!userId) return []

      const [dbTemplates, activeProgram] = await Promise.all([
        programTemplateService.getMyPrograms(userId),
        this.getActiveProgram({ skipDatabaseLoad: true }),
      ])

      return dbTemplates.map(t => ({
        id: t.id,
        name: t.name,
        days: t.days_per_week,
        weeks: t.total_weeks,
        forkedAt: t.forked_at ?? null,
        originTemplateName: t.origin_name_snapshot ?? null,
        originTemplateId: t.origin_template_id ?? null,
        createdFrom: t.created_from ?? null,
        isActive: activeProgram?.templateId === t.id,
        isPublic: t.is_public ?? false,
      }))
    } catch (error) {
      console.error('[ProgramState] Failed to load My Programs:', error)
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

      program = await this.ensureActiveProgramInstance(program)

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
        await this.saveActiveProgram(program)
        console.log('[ProgramState] Template reloaded successfully from database')
      }

      // Option to force refresh template from database (for template updates)
      if (options?.refreshTemplate) {
        console.log('[ProgramState] Refreshing template from database...')
        const freshTemplate = await this.loadTemplate(program.templateId)
        if (freshTemplate) {
          // Preserve program progress, only update template
          program.template = freshTemplate
          await this.saveActiveProgram(program)
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

    const isUserOwnedTemplate = !!template.ownerUserId
    const resolvedOriginTemplateId = template.originTemplateId ?? templateId

    // Process template to add automatic deload weeks
    template = processTemplateWithDeload(template)
    console.log("[ProgramState] Processed template with automatic deload weeks")

    // Calculate total workouts in the program
    const daysInSchedule = Object.keys(template.schedule).length
    const totalWorkouts = daysInSchedule * template.weeks

    const instanceId = this.generateInstanceId()

    // CRITICAL FIX: Clear in-progress workouts FIRST, before creating new program
    // This ensures the workout logger doesn't load stale data from previous program
    const resolvedUserId = userId ?? this.getCurrentUserId()
    try {
      await WorkoutLogger.clearInProgress(resolvedUserId)
      console.log("[ProgramState] Cleared in-progress workouts before starting new program")
    } catch (error) {
      console.warn("[ProgramState] Failed to clear in-progress workouts:", error)
    }

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
      isCustom: isUserOwnedTemplate,
      originTemplateId: resolvedOriginTemplateId,
    }

    await this.saveActiveProgram(activeProgram)
    console.log("[v0] Set active program:", activeProgram)

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
    if (resolvedUserId) {
      await this.syncToDatabase(resolvedUserId)
    }

    // Dispatch programChanged event AFTER all state is set up
    window.dispatchEvent(new Event("programChanged"))

    return activeProgram
  }

  private static async ensureCustomTemplateForActiveProgram(): Promise<void> {
    if (typeof window === "undefined") return

    if (this.ensureCustomTemplatePromise) {
      await this.ensureCustomTemplatePromise
      return
    }

    this.ensureCustomTemplatePromise = (async () => {
      const activeProgram = await this.getActiveProgram({ skipDatabaseLoad: true })
      if (!activeProgram) return

      const templateOwnerId = (activeProgram as any)?.template?.ownerUserId
      if (activeProgram.isCustom || templateOwnerId) {
        if (!activeProgram.isCustom) {
          activeProgram.isCustom = true
          await this.saveActiveProgram(activeProgram)
        }
        return
      }

      const userId = this.getCurrentUserId()
      if (!userId) {
        console.warn("[ProgramState] Cannot fork template without authenticated user")
        return
      }

      const sourceTemplateId = activeProgram.templateId
      try {
        const hasCustomSuffix = activeProgram.template.name.trim().toLowerCase().endsWith('(custom)')
        const customName = hasCustomSuffix
          ? activeProgram.template.name
          : `${activeProgram.template.name} (Custom)`
        const newTemplateId = await programForkService.forkTemplateToMyProgram(sourceTemplateId, userId, {
          nameOverride: customName,
        })

        await this.repointActiveProgramToTemplate(newTemplateId, {
          markCustom: true,
          originTemplateId: activeProgram.originTemplateId ?? sourceTemplateId,
        })
      } catch (error) {
        console.error("[ProgramState] Failed to fork template for customization:", error)
      }
    })()

    try {
      await this.ensureCustomTemplatePromise
    } finally {
      this.ensureCustomTemplatePromise = null
    }
  }

  static async repointActiveProgramToTemplate(
    newTemplateId: string,
    options?: { markCustom?: boolean; originTemplateId?: string }
  ): Promise<void> {
    if (typeof window === "undefined") return

    const activeProgram = await this.getActiveProgram({ skipDatabaseLoad: true })
    if (!activeProgram) {
      console.error("[ProgramState] Cannot repoint active program - no active program found")
      return
    }

    const freshTemplate = await this.loadTemplate(newTemplateId)
    if (!freshTemplate) {
      console.error("[ProgramState] Cannot repoint active program - template not found", newTemplateId)
      return
    }

    const processedTemplate = processTemplateWithDeload(freshTemplate)

    activeProgram.templateId = newTemplateId
    activeProgram.template = processedTemplate
    if (options?.originTemplateId && !activeProgram.originTemplateId) {
      activeProgram.originTemplateId = options.originTemplateId
    }
    if (options?.markCustom) {
      activeProgram.isCustom = true
    }

    this.recalculateActiveProgramStats(activeProgram)

    await this.saveActiveProgram(activeProgram)

    const history = this.getProgramHistory()
    const activeHistory = history.find(entry => entry.isActive)
    if (activeHistory) {
      activeHistory.templateId = newTemplateId
      activeHistory.name = processedTemplate.name
      activeHistory.totalWorkouts = activeProgram.totalWorkouts
      activeHistory.completedWorkouts = activeProgram.completedWorkouts
      activeHistory.completionRate = activeProgram.progress
      this.saveProgramHistory(history)
    }

    programTemplateService.clearCache()

    window.dispatchEvent(new Event("programChanged"))
  }

  static async applyFutureExerciseReplacement(params: {
    dayNumber: number
    fromExerciseId?: string
    fromExerciseName?: string
    templateExerciseIds?: string[]
    toExercise: ReplacementExercisePayload
  }): Promise<void> {
    if (typeof window === "undefined") return

    const { dayNumber, fromExerciseId, fromExerciseName, templateExerciseIds, toExercise } = params

    let activeProgram = await this.getActiveProgram({ skipDatabaseLoad: true })
    if (!activeProgram) {
      console.warn("[ProgramState] Cannot apply exercise replacement - no active program")
      return
    }

    await this.ensureCustomTemplateForActiveProgram()

    activeProgram = await this.getActiveProgram({ skipDatabaseLoad: true })
    if (!activeProgram) return

    if (!activeProgram.isCustom) {
      console.warn("[ProgramState] Active program is not marked as custom; skipping template mutation")
      return
    }

    const targetTemplateId = activeProgram.templateId
    try {
      await programForkService.replaceExerciseInstances({
        templateId: targetTemplateId,
        toExerciseId: toExercise.id,
        templateExerciseIds: templateExerciseIds && templateExerciseIds.length > 0 ? templateExerciseIds : undefined,
        dayNumber: templateExerciseIds && templateExerciseIds.length > 0 ? undefined : dayNumber,
        fromExerciseId: templateExerciseIds && templateExerciseIds.length > 0 ? undefined : fromExerciseId,
      })
      programTemplateService.clearCache()
    } catch (error) {
      const err = error as any
      console.error("[ProgramState] Failed to update template exercise:", {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
      })
    }

    const dayKey = `day${dayNumber}`
    const replacementNameNormalized = fromExerciseName?.toLowerCase().trim()
    const dayEntry = activeProgram.template.schedule?.[dayKey]
    if (dayEntry) {
      let changed = false
      dayEntry.exercises = dayEntry.exercises.map(exercise => {
        const matchesById = fromExerciseId && exercise.exerciseLibraryId === fromExerciseId
        const matchesByTemplateId = templateExerciseIds?.includes(exercise.id)
        const matchesByName = replacementNameNormalized
          ? exercise.exerciseName?.toLowerCase().trim() === replacementNameNormalized
          : false

        if (matchesById || matchesByTemplateId || matchesByName) {
          changed = true
          return {
            ...exercise,
            exerciseLibraryId: toExercise.id,
            exerciseName: toExercise.name,
            equipmentType: toExercise.equipmentType,
          }
        }
        return exercise
      })

      if (changed) {
        await this.saveActiveProgram(activeProgram)
        window.dispatchEvent(new Event("programChanged"))
      }
    }

    const userId = this.getCurrentUserId()
    if (userId && typeof dayNumber === "number" && dayNumber > 0) {
      const totalWeeks = activeProgram.template.weeks || 0
      for (let week = activeProgram.currentWeek + 1; week <= totalWeeks; week++) {
        try {
          await WorkoutLogger.clearCurrentWorkout(week, dayNumber, userId)
        } catch (error) {
          console.warn("[ProgramState] Failed to clear future in-progress workout", { week, dayNumber, error })
        }
      }
    }
  }

  static async renameCustomProgram(templateId: string, newName: string): Promise<void> {
    const trimmedName = newName.trim()
    if (!trimmedName) {
      throw new Error('Program name cannot be empty')
    }

    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    const ownedTemplates = await programTemplateService.getMyPrograms(userId)
    const targetTemplate = ownedTemplates.find(t => t.id === templateId)
    if (!targetTemplate) {
      throw new Error('Custom program not found or not owned by user')
    }

    await programTemplateService.renameUserProgram(templateId, userId, trimmedName)
    programTemplateService.clearCache()

    const activeProgram = await this.getActiveProgram({ skipDatabaseLoad: true })
    if (activeProgram && activeProgram.templateId === templateId) {
      activeProgram.template.name = trimmedName
      await this.saveActiveProgram(activeProgram)
    }

    const history = this.getProgramHistory()
    let historyChanged = false
    history.forEach(entry => {
      if (entry.templateId === templateId) {
        entry.name = trimmedName
        historyChanged = true
      }
    })
    if (historyChanged) {
      this.saveProgramHistory(history)
    }

    window.dispatchEvent(new Event('programChanged'))
  }

  static async deleteCustomProgram(templateId: string): Promise<void> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    // Check if user owns this program
    const ownedTemplates = await programTemplateService.getMyPrograms(userId)
    const targetTemplate = ownedTemplates.find(t => t.id === templateId)
    if (!targetTemplate) {
      throw new Error('Custom program not found or not owned by user')
    }

    // Check if program is currently active
    const activeProgram = await this.getActiveProgram({ skipDatabaseLoad: true })
    if (activeProgram && activeProgram.templateId === templateId) {
      throw new Error('Cannot delete a program that is currently active. Please end the program first.')
    }

    // Remove owner_user_id to "delete" from user's profile (keeps in database)
    if (supabase) {
      const { error } = await supabase
        .from('program_templates')
        .update({ owner_user_id: null })
        .eq('id', templateId)
        .eq('owner_user_id', userId)

      if (error) {
        throw new Error(`Failed to delete program: ${error.message}`)
      }
    }

    // Clear cache and refresh
    programTemplateService.clearCache()

    // Remove from program history
    const history = this.getProgramHistory()
    let historyChanged = false
    const filteredHistory = history.filter(entry => {
      if (entry.templateId === templateId) {
        historyChanged = true
        return false
      }
      return true
    })
    
    if (historyChanged) {
      this.saveProgramHistory(filteredHistory)
    }

    // Dispatch events to update UI
    window.dispatchEvent(new Event('programChanged'))
    
    console.log(`[ProgramState] Successfully deleted program ${templateId} from user ${userId}'s profile`)
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
      await this.saveActiveProgram(activeProgram)
    }

    const dayKey = scheduleKeys[activeProgram.currentDay - 1]

    const workout = template.schedule[dayKey]

    if (!workout) {
      return null
    }

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
        let dbExercise = null as Awaited<ReturnType<typeof exerciseService.getExerciseById>> | null
        // Prefer UUID lookup when provided by template
        if (exercise.exerciseLibraryId) {
          dbExercise = await exerciseService.getExerciseById(exercise.exerciseLibraryId)
        }
        // Fallback to exact name match
        if (!dbExercise) {
          dbExercise = await exerciseService.getExerciseByName(exercise.exerciseName)
        }
        // Last resort: case-insensitive search and pick best exact name match
        if (!dbExercise) {
          const candidates = await exerciseService.searchExercises(exercise.exerciseName)
          dbExercise = candidates.find(c => c.name.toLowerCase() === exercise.exerciseName.toLowerCase()) || candidates[0] || null
        }
        if (dbExercise) {
          muscleGroup = dbExercise.muscleGroup  // Use database muscle group
          equipmentType = dbExercise.equipmentType
        }
      } catch (error) {
        console.warn(`[ProgramState] Could not fetch exercise metadata for "${exercise.exerciseName}":`, error)
        // Continue with fallback values
      }// Get target sets for the CURRENT week (not hardcoded to week1)
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

        // Set templateRecommendedReps from progression result (for display only)
        if (typeof progressionResult.templateRecommendedReps === 'number') {
          performedReps = progressionResult.templateRecommendedReps.toString()
        } else if (previousPerformance?.actualReps) {
          performedReps = previousPerformance.actualReps.toString()
        }

        // NOTE: templateRecommendedReps is for display only (template preview)
        // It is NOT logged or used in actual workout sessions
      } catch (error) {
        console.error(`[ProgramState] Failed to calculate progression for "${exercise.exerciseName}":`, error)
        // Continue with empty values
      }

      return {
        exerciseId: exercise.exerciseName.toLowerCase().replace(/\s+/g, "-"),
        exerciseLibraryId: exercise.exerciseLibraryId,
        exerciseName: exercise.exerciseName,
        targetSets,
        templateRecommendedReps: performedReps,  // RENAMED: Display only, not used for calculations
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

    await this.saveActiveProgram(activeProgram)

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
    await WorkoutLogger.clearInProgress(resolvedUserId)

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

    // If all workouts are completed, finalize the program
    if (!foundIncomplete) {
      console.log("[ProgramState] All workouts completed! Finalizing program...")
      await this.finalizeActiveProgram(userId, { endedEarly: false })
      return // Exit early - program is now finalized
    }

    await this.saveActiveProgram(activeProgram)
    if (!options?.silent) {
      window.dispatchEvent(new Event("programChanged"))
    }
  }

  private static async saveActiveProgram(program: ActiveProgram): Promise<void> {
    if (typeof window === "undefined") return

    // Save to localStorage first (fast, synchronous)
    localStorage.setItem(this.ACTIVE_PROGRAM_KEY, JSON.stringify(program))

    // Sync to database (critical for multi-device + page refresh)
    const userId = this.getCurrentUserId()
    if (userId && supabase) {
      try {
        await supabase
          .from("active_programs")
          .upsert({
            user_id: userId,
            program_id: program.templateId,
            instance_id: program.instanceId,
            program_name: program.template.name,
            days_per_week: Object.keys(program.template.schedule).length,
            total_weeks: program.template.weeks || 6,
            start_date: new Date(program.startDate).toISOString(),
            current_week: program.currentWeek,
            current_day: program.currentDay,
          }, { onConflict: 'user_id' })  // One active program per user
        console.log("[ProgramState] Synced active program to database:", {
          week: program.currentWeek,
          day: program.currentDay
        })
      } catch (error) {
        logSupabaseError("[ProgramState] Failed to sync program state to database:", error)
        // Don't throw - localStorage is already updated
      }
    }
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

  /**
   * Get all workouts for a specific historical program instance
   * Filters workout history by programInstanceId
   */
  static getHistoricalProgramWorkouts(instanceId: string, userId?: string): any[] {
    if (!instanceId) return []

    const allWorkouts = WorkoutLogger.getWorkoutHistory(userId)

    // Filter workouts that belong to this program instance
    const programWorkouts = allWorkouts.filter(
      (workout) => workout.programInstanceId === instanceId && workout.completed
    )

    // Sort by week and day for easier display
    return programWorkouts.sort((a, b) => {
      if (a.week !== b.week) {
        return (a.week || 0) - (b.week || 0)
      }
      return (a.day || 0) - (b.day || 0)
    })
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
        // Refresh session first to ensure we have a valid auth token
        const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()

        if (sessionError || !session) {
          console.error("[ProgramState] Session expired or invalid - user needs to re-login:", sessionError?.message)
          console.error("[ProgramState] Skipping database sync until user re-authenticates")
          return
        }

        console.log("[ProgramState] Session refreshed successfully")

        // Check if user is authenticated
        const { data: { user: authUser } } = await supabase.auth.getUser()
        console.log("[ProgramState] Current authenticated user:", authUser?.id)
        console.log("[ProgramState] Trying to sync with user_id:", userId)

        if (!authUser) {
          console.error("[ProgramState] No authenticated user found - cannot sync to database")
          return
        }

        if (authUser.id !== userId) {
          console.error("[ProgramState] Auth user ID mismatch!", {
            authUserId: authUser.id,
            providedUserId: userId
          })
          return
        }

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
        // Also fetch full DB template to determine ownership (custom vs canonical)
        const template = await this.loadTemplate(activeProgramData.program_id)
        const fullDbTemplate: any = await programTemplateService.getFullTemplate(activeProgramData.program_id)
        const isCustomTemplate = !!(fullDbTemplate && fullDbTemplate.owner_user_id)
        const originTemplateIdFromDb: string | undefined = fullDbTemplate?.origin_template_id || undefined
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
          isCustom: isCustomTemplate,
          originTemplateId: originTemplateIdFromDb,
        }
        await this.saveActiveProgram(activeProgram)
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
