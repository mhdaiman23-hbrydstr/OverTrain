import { type GymTemplate, processTemplateWithDeload } from "./gym-templates"
import { WorkoutLogger } from "./workout-logger"
import { supabase } from "./supabase"
import { programTemplateService } from "./services/program-template-service"
import { programForkService } from "./services/program-fork-service"
import { ExerciseLibraryService } from "./services/exercise-library-service"
import { ProgressionRouter } from "./progression-router"
import { getExerciseMuscleGroup } from "./exercise-muscle-groups"
import { ConnectionMonitor } from "./connection-monitor"
import { StorageTelemetry } from "./storage-telemetry"
// Native platform support for SQLite-first storage
import { isNative } from "./native/platform"
import { unifiedStorage } from "./native/storage-service"

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

interface TemplateMetadata {
  id: string
  name: string
  days: number
  weeks: number
  gender?: ("male" | "female")[]
  experience?: ("beginner" | "intermediate" | "advanced")[]
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
  templateMetadata?: TemplateMetadata
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
  skippedWorkouts?: number
  isActive: boolean
  endDate?: string
  endedEarly?: boolean
}

export class ProgramStateManager {
  private static readonly ACTIVE_PROGRAM_KEY = "liftlog_active_program"
  private static readonly PROGRAM_PROGRESS_KEY = "liftlog_program_progress"
  private static readonly PROGRAM_HISTORY_KEY = "liftlog_program_history"
  private static readonly DATABASE_LOAD_KEY = "liftlog_program_db_loaded_at"
  private static readonly LOCAL_SAVE_KEY = "liftlog_program_local_saved_at"
  private static readonly DATABASE_STALE_MS = 5_000
  // RACE CONDITION FIX: Time window to protect fresh local saves from being overwritten by database
  private static readonly LOCAL_SAVE_PROTECTION_MS = 3_000
  private static databaseLoadPromise: Promise<void> | null = null
  private static ensureCustomTemplatePromise: Promise<void> | null = null

  // RACE CONDITION FIX: Program state locking to prevent concurrent modifications
  private static programStateLock = false
  private static lockQueue: Array<() => void> = []

  private static templateCache = new Map<string, GymTemplate>()

  // Migration mapping from old hardcoded IDs to new database IDs
  private static readonly TEMPLATE_ID_MIGRATIONS: Record<string, string> = {
    "fullbody-3day-beginner-male": "template2",
    "fullbody-3day-beginner-female": "template2",
  }

  private static readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  /**
   * RACE CONDITION FIX: Acquire lock for program state modifications
   * If lock is already held, queues the resolver for when lock is released
   */
  private static async acquireLock(): Promise<void> {
    if (this.programStateLock) {
      return new Promise(resolve => this.lockQueue.push(resolve))
    }
    this.programStateLock = true
  }

  /**
   * Release the lock and process next waiter in queue
   * Always called in finally block to prevent deadlocks
   */
  private static releaseLock(): void {
    if (this.lockQueue.length > 0) {
      const nextWaiter = this.lockQueue.shift()
      nextWaiter?.() // Wake up next waiter, lock stays true
    } else {
      this.programStateLock = false // Fully unlock
    }
  }

  /**
   * Wrap async operations with automatic locking
   * Prevents deadlock even if operation fails (uses try-finally)
   */
  private static async withLock<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquireLock()
    try {
      return await fn()
    } finally {
      this.releaseLock()
    }
  }

  // ============================================================================
  // NATIVE STORAGE ABSTRACTION
  // Uses SQLite on native (instant, offline-first) and localStorage on web
  // ============================================================================

  /**
   * Check if we should use native SQLite storage
   */
  private static shouldUseNativeStorage(): boolean {
    try {
      return isNative()
    } catch {
      return false
    }
  }

  /**
   * Get value from storage (SQLite on native, localStorage on web)
   */
  private static async getStorageValue(key: string): Promise<string | null> {
    if (this.shouldUseNativeStorage()) {
      try {
        const value = await unifiedStorage.get(key)
        // UnifiedStorage returns parsed object, we need to stringify for compatibility
        return value ? JSON.stringify(value) : null
      } catch (error) {
        console.warn(`[ProgramState] Native storage get failed for ${key}, falling back to localStorage:`, error)
      }
    }
    return localStorage.getItem(key)
  }

  /**
   * Set value in storage (SQLite on native, localStorage on web)
   */
  private static async setStorageValue(key: string, value: string): Promise<void> {
    if (this.shouldUseNativeStorage()) {
      try {
        // UnifiedStorage expects parsed object, not string
        const parsed = JSON.parse(value)
        await unifiedStorage.set(key, parsed)
        console.log(`[ProgramState] Saved to native storage: ${key}`)
        // Also mirror to localStorage so legacy consumers (WorkoutLogger/calendar) see the active program
        try {
          localStorage.setItem(key, value)
        } catch (mirrorError) {
          console.warn(`[ProgramState] Failed to mirror ${key} to localStorage:`, mirrorError)
        }
        return
      } catch (error) {
        console.warn(`[ProgramState] Native storage set failed for ${key}, falling back to localStorage:`, error)
      }
    }
    localStorage.setItem(key, value)
    // RACE CONDITION FIX: Mark local save to protect from database overwrite (web only)
    this.markLocalSave()
  }

  /**
   * Remove value from storage
   */
  private static async removeStorageValue(key: string): Promise<void> {
    if (this.shouldUseNativeStorage()) {
      try {
        await unifiedStorage.remove(key)
        try {
          localStorage.removeItem(key)
        } catch (mirrorError) {
          console.warn(`[ProgramState] Failed to remove ${key} from localStorage:`, mirrorError)
        }
        return
      } catch (error) {
        console.warn(`[ProgramState] Native storage remove failed for ${key}, falling back to localStorage:`, error)
      }
    }
    localStorage.removeItem(key)
  }

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

  private static extractTemplateMetadata(template: GymTemplate): TemplateMetadata {
    return {
      id: template.id,
      name: template.name,
      days: Object.keys(template.schedule ?? {}).length || template.days || 0,
      weeks: template.weeks || 0,
      gender: Array.isArray(template.gender) ? template.gender : undefined,
      experience: Array.isArray(template.experience) ? template.experience : undefined,
    }
  }

  private static serializeProgramForStorage(program: ActiveProgram): string {
    const { template: _template, ...rest } = program
    return JSON.stringify(rest)
  }

  private static serializeProgramMinimal(program: ActiveProgram): string {
    const minimalPayload = {
      templateId: program.templateId,
      instanceId: program.instanceId,
      startDate: program.startDate,
      currentWeek: program.currentWeek,
      currentDay: program.currentDay,
      completedWorkouts: program.completedWorkouts,
      totalWorkouts: program.totalWorkouts,
      progress: program.progress,
      progressionOverride: program.progressionOverride,
      isCustom: program.isCustom,
      originTemplateId: program.originTemplateId,
      templateMetadata: program.templateMetadata,
    }

    return JSON.stringify(minimalPayload)
  }

  private static isQuotaExceeded(error: unknown): boolean {
    return error instanceof DOMException && error.name === "QuotaExceededError"
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
    
    // Use platform-aware storage
    if (this.shouldUseNativeStorage()) {
      this.setStorageValue(this.PROGRAM_HISTORY_KEY, JSON.stringify(history)).catch(error => {
        console.error("[ProgramState] Failed to save program history to native storage:", error)
        // Fallback to localStorage
        localStorage.setItem(this.PROGRAM_HISTORY_KEY, JSON.stringify(history))
      })
    } else {
      localStorage.setItem(this.PROGRAM_HISTORY_KEY, JSON.stringify(history))
    }
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

  /**
   * RACE CONDITION FIX: Mark when a local save happens
   * This protects fresh local data from being overwritten by stale database data
   */
  private static markLocalSave(): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.LOCAL_SAVE_KEY, Date.now().toString())
  }

  /**
   * RACE CONDITION FIX: Check if a recent local save happened
   * Returns true if we should protect the local data from database overwrites
   */
  private static hasRecentLocalSave(): boolean {
    if (typeof window === "undefined") return false
    const stored = localStorage.getItem(this.LOCAL_SAVE_KEY)
    if (!stored) return false
    const savedAt = Number.parseInt(stored, 10)
    if (Number.isNaN(savedAt)) return false
    return Date.now() - savedAt < this.LOCAL_SAVE_PROTECTION_MS
  }

  private static async ensureDatabaseLoaded(userId?: string, options?: { force?: boolean }): Promise<void> {
    if (!supabase || typeof window === "undefined") return

    const resolvedUserId = userId ?? this.getCurrentUserId()
    if (!resolvedUserId) return

    // RACE CONDITION FIX: Skip database load if a recent local save just happened
    // This prevents stale database data from overwriting fresh local changes
    if (!options?.force && this.hasRecentLocalSave()) {
      console.log("[ProgramState] Skipping database load - recent local save detected")
      return
    }

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

    const cachedTemplate = this.templateCache.get(migratedId)
    if (cachedTemplate) {
      return cachedTemplate
    }

    try {
      const dbTemplate = await programTemplateService.getTemplate(migratedId)
      if (dbTemplate) {
        console.log('[ProgramState] Loaded template from database:', migratedId)
        const processedTemplate = processTemplateWithDeload(dbTemplate)
        this.templateCache.set(migratedId, processedTemplate)
        return processedTemplate
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
    program.templateMetadata = this.extractTemplateMetadata(program.template)
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

      // NATIVE OPTIMIZATION: Skip database sync on native - SQLite is the cache
      // Background sync handles Supabase synchronization separately
      if (!options?.skipDatabaseLoad && !this.shouldUseNativeStorage()) {
        await this.ensureDatabaseLoaded(currentUserId, { force: options?.refreshTemplate })
        await WorkoutLogger.ensureDatabaseLoaded(currentUserId, { force: options?.refreshTemplate })
      }

      let stored = await this.getStorageValue(this.ACTIVE_PROGRAM_KEY)

      // NATIVE COLD START FIX: If SQLite/localStorage is empty but user is logged in,
      // check Supabase directly to restore program state. This handles:
      // - App reinstall (SQLite cleared)
      // - Development testing (data cleared)
      // - First launch after login on a new device
      if (!stored && currentUserId && this.shouldUseNativeStorage() && !options?.skipDatabaseLoad && supabase) {
        // Check connectivity before attempting Supabase sync
        if (!ConnectionMonitor.isOnline()) {
          console.log("[ProgramState] Native cold start detected but offline - skipping Supabase sync")
        } else {
          console.log("[ProgramState] Native cold start detected - checking Supabase for active program...")
          try {
            // Verify authentication before syncing
            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
            if (authError || !authUser) {
              console.warn("[ProgramState] Not authenticated - skipping Supabase sync:", authError?.message)
            } else if (authUser.id !== currentUserId) {
              console.warn("[ProgramState] User ID mismatch - skipping Supabase sync")
            } else {
              // Load both program state AND workout history from Supabase
              // WorkoutLogger is needed to determine which workouts are completed
              await Promise.all([
                this.loadFromDatabase(currentUserId),
                WorkoutLogger.ensureDatabaseLoaded(currentUserId, { force: true })
              ])
              // After loading from database, try reading again
              stored = await this.getStorageValue(this.ACTIVE_PROGRAM_KEY)
              if (stored) {
                console.log("[ProgramState] Successfully restored program from Supabase on cold start")
              } else {
                console.log("[ProgramState] No active program found in Supabase")
              }
            }
          } catch (error) {
            console.warn("[ProgramState] Failed to restore from Supabase on cold start:", error)
          }
        }
      }

      if (!stored) return null

      let program = JSON.parse(stored) as ActiveProgram

      if (!program.template || !program.template.schedule) {
        const loadedTemplate = await this.loadTemplate(program.templateId)
        if (!loadedTemplate) {
          console.error("[ProgramState] Unable to load template for active program:", program.templateId)
          this.clearActiveProgram()
          return null
        }
        program.template = loadedTemplate
        this.templateCache.set(program.templateId, loadedTemplate)
      }

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

      if (!program.templateMetadata) {
        program.templateMetadata = this.extractTemplateMetadata(program.template)
        await this.saveActiveProgram(program)
      } else {
        const metadata = program.templateMetadata
        const templateMeta = this.extractTemplateMetadata(program.template)
        if (
          metadata.days !== templateMeta.days ||
          metadata.weeks !== templateMeta.weeks ||
          metadata.name !== templateMeta.name
        ) {
          program.templateMetadata = templateMeta
          await this.saveActiveProgram(program)
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

    return this.withLock(async () => {
      // Load template from database or fallback to hardcoded
      let template = await this.loadTemplate(templateId)
      if (!template) {
        console.error('[ProgramState] Template not found:', templateId)
        return null
      }

      const isUserOwnedTemplate = !!template.ownerUserId
      const resolvedOriginTemplateId = template.originTemplateId ?? templateId

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
        templateMetadata: this.extractTemplateMetadata(template),
      }

      // SYNC PROTECTION FIX: Use isCritical=true for new program creation
      // This ensures the new instanceId is in Supabase immediately, preventing
      // stale data from overwriting the fresh local state on app restart
      await this.saveActiveProgram(activeProgram, { isCritical: true })
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
        skippedWorkouts: 0,
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

      // Log audit event for program creation
      if (resolvedUserId) {
        try {
          const { logAuditEvent } = await import('./audit-logger')
          await logAuditEvent({
            action: 'PROGRAM_CREATED',
            userId: resolvedUserId,
            resourceType: 'PROGRAM',
            resourceId: templateId,
            details: {
              programName: template.name,
              daysPerWeek: Object.keys(template.schedule).length,
              totalWeeks: template.weeks,
            },
            ipAddress: null,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          })
        } catch (auditError) {
          console.error('[ProgramState] Failed to log program creation audit event:', auditError)
          // Don't throw - audit logging shouldn't break program creation
        }
      }

      // Dispatch programChanged event AFTER all state is set up
      window.dispatchEvent(new Event("programChanged"))

      return activeProgram
    })
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

      // CRITICAL FIX: Only fork ONCE per active program instance
      // Check if already marked as custom OR if template has owner (already forked in database)
      if (activeProgram.isCustom || templateOwnerId) {
        console.log("[ProgramState] Program already custom, skipping fork:", {
          isCustom: activeProgram.isCustom,
          hasOwner: !!templateOwnerId,
          templateId: activeProgram.templateId,
        })
        if (!activeProgram.isCustom) {
          activeProgram.isCustom = true
          // CRITICAL: Recalculate stats whenever marking as custom to ensure progress is accurate
          this.recalculateActiveProgramStats(activeProgram)
          await this.saveActiveProgram(activeProgram)
        }
        return
      }

      // Check if originTemplateId is set - this means we ALREADY forked once
      // If originTemplateId exists, we should NOT fork again
      if (activeProgram.originTemplateId && activeProgram.originTemplateId !== activeProgram.templateId) {
        console.log("[ProgramState] Program has originTemplateId, marking as custom without re-forking:", {
          originTemplateId: activeProgram.originTemplateId,
          currentTemplateId: activeProgram.templateId,
        })
        activeProgram.isCustom = true
        // CRITICAL: Recalculate stats whenever marking as custom to ensure progress is accurate
        // This is especially important when forking happens mid-program
        this.recalculateActiveProgramStats(activeProgram)
        await this.saveActiveProgram(activeProgram)
        return
      }

      const userId = this.getCurrentUserId()
      if (!userId) {
        console.warn("[ProgramState] Cannot fork template without authenticated user")
        return
      }

      const sourceTemplateId = activeProgram.templateId
      console.log("[ProgramState] Forking template for active program:", sourceTemplateId)
      try {
        const hasCustomSuffix = activeProgram.template.name.trim().toLowerCase().endsWith('(custom)')
        const customName = hasCustomSuffix
          ? activeProgram.template.name
          : `${activeProgram.template.name} (Custom)`
        const newTemplateId = await programForkService.forkTemplateToMyProgram(sourceTemplateId, userId, {
          nameOverride: customName,
        })

        console.log("[ProgramState] Fork completed, repointing to new template:", {
          from: sourceTemplateId,
          to: newTemplateId,
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

    return this.withLock(async () => {
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

      activeProgram.templateId = newTemplateId
      activeProgram.template = freshTemplate
      this.templateCache.set(newTemplateId, freshTemplate)
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
        activeHistory.name = freshTemplate.name
        activeHistory.totalWorkouts = activeProgram.totalWorkouts
        activeHistory.completedWorkouts = activeProgram.completedWorkouts
        activeHistory.completionRate = activeProgram.progress
        this.saveProgramHistory(history)
      }

      programTemplateService.clearCache()

      window.dispatchEvent(new Event("programChanged"))
    })
  }

  static async applyFutureExerciseReplacement(params: {
    dayNumber: number
    fromExerciseId?: string
    fromExerciseName?: string
    templateExerciseIds?: string[]
    toExercise: ReplacementExercisePayload
    applyToFutureWeeks?: boolean  // If false, only applies to current week
  }): Promise<void> {
    if (typeof window === "undefined") return

    // Ensure the active program is forked into a custom copy before entering the lock.
    let activeProgram = await this.getActiveProgram({ skipDatabaseLoad: true })
    if (!activeProgram) {
      console.warn("[ProgramState] Cannot apply exercise replacement - no active program")
      return
    }
    if (!activeProgram.isCustom) {
      await this.ensureCustomTemplateForActiveProgram()
    }

    return this.withLock(async () => {
      const { dayNumber, fromExerciseId, fromExerciseName, templateExerciseIds, toExercise, applyToFutureWeeks = true } = params

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
        // CRITICAL FIX: Clear BOTH caches to ensure fresh template is loaded
        // 1. Clear programTemplateService cache (database query cache)
        programTemplateService.clearCache()
        // 2. Clear ProgramStateManager's own templateCache
        this.templateCache.delete(targetTemplateId)
        console.log(`[ProgramState] Cleared template caches after DB update for templateId: ${targetTemplateId}`)
      } catch (error) {
        const err = error as any
        console.error("[ProgramState] Failed to update template exercise:", {
          message: err?.message,
          code: err?.code,
          details: err?.details,
          hint: err?.hint,
        })
      }

      // CRITICAL FIX: Reload template from database to ensure we have the latest version
      // This is necessary because the DB update changed the exercises and we need fresh data
      if (applyToFutureWeeks) {
        const freshTemplate = await this.loadTemplate(targetTemplateId)
        if (freshTemplate) {
          activeProgram.template = freshTemplate
          console.log(`[ProgramState] Reloaded fresh template from database after exercise replacement`)
        }
      }

      const dayKey = `day${dayNumber}`
      const replacementNameNormalized = fromExerciseName?.toLowerCase().trim()

      // Helper function to apply replacement logic consistently
      const applyExerciseReplacement = (exercise: any) => {
        const matchesById = fromExerciseId && exercise.exerciseLibraryId === fromExerciseId
        const matchesByTemplateId = templateExerciseIds?.includes(exercise.id)
        const matchesByName = replacementNameNormalized
          ? exercise.exerciseName?.toLowerCase().trim() === replacementNameNormalized
          : false

        if (matchesById || matchesByTemplateId || matchesByName) {
          return {
            ...exercise,
            exerciseLibraryId: toExercise.id,
            exerciseName: toExercise.name,
            muscleGroup: toExercise.muscleGroup,
            equipmentType: toExercise.equipmentType,
          }
        }
        return exercise
      }

      // Apply replacement to current day (for in-memory update - handles case where DB update fails)
      let changed = false
      const dayEntry = activeProgram.template.schedule?.[dayKey]
      if (dayEntry) {
        dayEntry.exercises = dayEntry.exercises.map(applyExerciseReplacement)
        changed = true  // Mark as changed so we save
      }

      // CRITICAL FIX: Apply replacement to ALL days in schedule (since same exercise may appear on multiple days)
      // This allows current-week-only replacements while still forking the program
      const totalWeeks = activeProgram.template.weeks || 0

      if (applyToFutureWeeks) {
        // Update ALL days in schedule (exercises are shared across weeks)
        for (const scheduleKey of Object.keys(activeProgram.template.schedule || {})) {
          const daySchedule = activeProgram.template.schedule?.[scheduleKey]
          if (daySchedule && daySchedule.exercises) {
            daySchedule.exercises = daySchedule.exercises.map(applyExerciseReplacement)
            changed = true
          }
        }
      } else {
        console.log(`[ProgramState] applyToFutureWeeks is false - replacement will only affect current week`)
      }

      if (changed) {
        console.log(`[ProgramState] Applied exercise replacement to day${dayNumber} across weeks`)
        await this.saveActiveProgram(activeProgram)
        window.dispatchEvent(new Event("programChanged"))
      }

      const userId = this.getCurrentUserId()
      if (userId && typeof dayNumber === "number" && dayNumber > 0) {
        for (let week = activeProgram.currentWeek + 1; week <= totalWeeks; week++) {
          try {
            await WorkoutLogger.clearCurrentWorkout(week, dayNumber, userId)
          } catch (error) {
            console.warn("[ProgramState] Failed to clear future in-progress workout", { week, dayNumber, error })
          }
        }
      }
    })
  }

  static async renameCustomProgram(templateId: string, newName: string): Promise<void> {
    return this.withLock(async () => {
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
    })
  }

  /**
   * Add a set to an exercise in the program template
   * If repeatInFollowingWeeks is true, increases sets for all weeks in the progression template
   */
  static async addSetToExercise(params: {
    dayNumber: number
    exerciseId: string
    exerciseName: string
    repeatInFollowingWeeks: boolean
  }): Promise<void> {
    if (typeof window === "undefined") return

    // Ensure the active program is forked into a custom copy
    let activeProgram = await this.getActiveProgram({ skipDatabaseLoad: true })
    if (!activeProgram) {
      throw new Error("No active program found")
    }
    if (!activeProgram.isCustom) {
      await this.ensureCustomTemplateForActiveProgram()
      activeProgram = await this.getActiveProgram({ skipDatabaseLoad: true })
      if (!activeProgram) return
    }

    return this.withLock(async () => {
      const { dayNumber, exerciseId, exerciseName, repeatInFollowingWeeks } = params

      // Re-fetch activeProgram inside lock to avoid stale data
      activeProgram = await this.getActiveProgram({ skipDatabaseLoad: true })
      if (!activeProgram) {
        throw new Error("No active program found")
      }

      const dayKey = `day${dayNumber}`
      const dayEntry = activeProgram.template.schedule?.[dayKey]

      if (!dayEntry) {
        throw new Error(`Day ${dayNumber} not found in template`)
      }

      // Find the exercise in the template
      const exercise = dayEntry.exercises.find(
        (ex) => ex.id === exerciseId || ex.exerciseName === exerciseName
      )

      if (!exercise) {
        throw new Error(`Exercise "${exerciseName}" not found in day ${dayNumber}`)
      }

      // Update progression template to add one set for all weeks
      const totalWeeks = activeProgram.template.weeks || 1
      const updatedProgressionTemplate = { ...exercise.progressionTemplate }

      for (let week = 1; week <= totalWeeks; week++) {
        const weekKey = `week${week}` as keyof typeof exercise.progressionTemplate
        const weekData = exercise.progressionTemplate[weekKey]

        if (weekData && typeof weekData === 'object' && 'sets' in weekData) {
          updatedProgressionTemplate[weekKey] = {
            ...weekData,
            sets: (weekData.sets as number) + 1,
          }
        } else {
          // If week not defined, use week1 as base or default
          const baseWeek = exercise.progressionTemplate.week1 || { sets: 3, repRange: "8-10" }
          updatedProgressionTemplate[weekKey] = {
            ...baseWeek,
            sets: baseWeek.sets + 1,
          }
        }
      }

      // Update in-memory template
      exercise.progressionTemplate = updatedProgressionTemplate

      // Update database if repeatInFollowingWeeks is true
      if (repeatInFollowingWeeks && supabase) {
        try {
          // Find the template exercise ID in database
          const fullTemplate = await programTemplateService.getFullTemplate(activeProgram.templateId)
          if (!fullTemplate) {
            throw new Error("Template not found in database")
          }

          const templateDay = fullTemplate.days?.find((d) => d.day_number === dayNumber)
          if (!templateDay) {
            throw new Error(`Day ${dayNumber} not found in database template`)
          }

          const templateExercise = templateDay.exercises?.find(
            (ex) => ex.exercise_id === exercise.exerciseLibraryId || ex.exercise_id === exerciseId
          )

          if (templateExercise) {
            // Update progression_config in database
            const updatedProgressionConfig = {
              ...templateExercise.progression_config,
              progressionTemplate: updatedProgressionTemplate,
            }

            const { error } = await supabase
              .from("program_template_exercises")
              .update({ progression_config: updatedProgressionConfig })
              .eq("id", templateExercise.id)

            if (error) {
              console.error("[ProgramState] Failed to update exercise sets in database:", error)
              throw error
            }

            programTemplateService.clearCache()
          }
        } catch (error) {
          console.error("[ProgramState] Error updating database for set addition:", error)
          // Continue with in-memory update even if database update fails
        }
      }

      await this.saveActiveProgram(activeProgram)
      window.dispatchEvent(new Event("programChanged"))
    })
  }

  /**
   * Add an exercise to a day in the program template
   * If repeatInFollowingWeeks is true, adds the exercise to all future weeks
   */
  static async addExerciseToDay(params: {
    dayNumber: number
    exercise: {
      id: string
      name: string
      muscleGroup?: string
      equipmentType?: string
    }
    repeatInFollowingWeeks: boolean
  }): Promise<void> {
    if (typeof window === "undefined") return

    // Ensure the active program is forked into a custom copy
    let activeProgram = await this.getActiveProgram({ skipDatabaseLoad: true })
    if (!activeProgram) {
      throw new Error("No active program found")
    }
    if (!activeProgram.isCustom) {
      await this.ensureCustomTemplateForActiveProgram()
      activeProgram = await this.getActiveProgram({ skipDatabaseLoad: true })
      if (!activeProgram) return
    }

    return this.withLock(async () => {
      const { dayNumber, exercise, repeatInFollowingWeeks } = params

      // Re-fetch activeProgram inside lock to avoid stale data
      activeProgram = await this.getActiveProgram({ skipDatabaseLoad: true })
      if (!activeProgram) {
        throw new Error("No active program found")
      }

      const dayKey = `day${dayNumber}`
      const dayEntry = activeProgram.template.schedule?.[dayKey]

      if (!dayEntry) {
        throw new Error(`Day ${dayNumber} not found in template`)
      }

      // Get exercise metadata from library
      const exerciseService = ExerciseLibraryService.getInstance()
      let exerciseData = await exerciseService.getExerciseById(exercise.id)
      if (!exerciseData) {
        exerciseData = await exerciseService.getExerciseByName(exercise.name)
      }

      // Prefer DB muscle group; fall back to template and finally name-based detection to avoid "Other"
      const muscleGroup =
        exerciseData?.muscleGroup ||
        exercise.muscleGroup ||
        getExerciseMuscleGroup(exercise.name)
      const equipmentType = exerciseData?.equipmentType || exercise.equipmentType || "Bodyweight"
      
      // Determine category based on muscle group - compound movements are typically for larger muscle groups
      const compoundMuscleGroups = ["chest", "back", "legs", "shoulders", "quadriceps", "hamstrings", "glutes"]
      const isCompound = compoundMuscleGroups.some(group => 
        muscleGroup.toLowerCase().includes(group)
      )
      const category = isCompound ? "compound" : "isolation"

      // Create progression template for all weeks
      const totalWeeks = activeProgram.template.weeks || 1
      const progressionTemplate: Record<string, { sets: number; repRange: string }> = {}
      for (let week = 1; week <= totalWeeks; week++) {
        progressionTemplate[`week${week}`] = {
          sets: 3,
          repRange: "8-10",
        }
      }

      // Create new exercise template
      const newExercise: any = {
        id: Math.random().toString(36).substr(2, 9),
        exerciseName: exercise.name,
        exerciseLibraryId: exercise.id,
        category,
        muscleGroup,
        equipmentType,
        restTime: 90,
        progressionTemplate,
        autoProgression: {
          enabled: true,
          progressionType: "weight_based" as const,
          rules: {
            if_all_sets_completed: "increase_weight",
            if_failed_reps: "repeat_weight",
            if_failed_twice: "deload",
          },
        },
      }

      // Add to in-memory template
      dayEntry.exercises.push(newExercise)

      // Update database if repeatInFollowingWeeks is true
      if (repeatInFollowingWeeks && supabase) {
        try {
          const fullTemplate = await programTemplateService.getFullTemplate(activeProgram.templateId)
          if (!fullTemplate) {
            throw new Error("Template not found in database")
          }

          const templateDay = fullTemplate.days?.find((d) => d.day_number === dayNumber)
          if (!templateDay) {
            throw new Error(`Day ${dayNumber} not found in database template`)
          }

          // Get max exercise order
          const maxOrder = Math.max(
            ...(templateDay.exercises?.map((ex) => ex.exercise_order) || [0]),
            0
          )

          // Insert new exercise into database
          const { error } = await supabase.from("program_template_exercises").insert({
            template_day_id: templateDay.id,
            exercise_id: exercise.id,
            exercise_order: maxOrder + 1,
            category,
            rest_time_seconds: 90,
            progression_config: {
              progressionTemplate,
              autoProgression: {
                enabled: true,
                progressionType: "weight_based",
                rules: {
                  if_all_sets_completed: "increase_weight",
                  if_failed_reps: "repeat_weight",
                  if_failed_twice: "deload",
                },
              },
            },
          })

          if (error) {
            console.error("[ProgramState] Failed to add exercise to database:", error)
            throw error
          }

          programTemplateService.clearCache()
        } catch (error) {
          console.error("[ProgramState] Error adding exercise to database:", error)
          // Continue with in-memory update even if database update fails
        }
      }

      await this.saveActiveProgram(activeProgram)
      window.dispatchEvent(new Event("programChanged"))
    })
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

    // Log audit event for program deletion
    try {
      const { logAuditEvent } = await import('./audit-logger')
      await logAuditEvent({
        action: 'PROGRAM_DELETED',
        userId: userId,
        resourceType: 'PROGRAM',
        resourceId: templateId,
        details: { programName: targetTemplate.name },
        ipAddress: null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      })
    } catch (auditError) {
      console.error('[ProgramState] Failed to log program deletion audit event:', auditError)
      // Don't throw - audit logging shouldn't break program deletion
    }

    // Dispatch events to update UI
    window.dispatchEvent(new Event('programChanged'))

    console.log(`[ProgramState] Successfully deleted program ${templateId} from user ${userId}'s profile`)
  }

  static clearActiveProgram(): void {
    if (typeof window === "undefined") return
    
    // Use platform-aware storage removal
    if (this.shouldUseNativeStorage()) {
      this.removeStorageValue(this.ACTIVE_PROGRAM_KEY).catch(console.error)
      this.removeStorageValue(this.PROGRAM_PROGRESS_KEY).catch(console.error)
    } else {
      localStorage.removeItem(this.ACTIVE_PROGRAM_KEY)
      localStorage.removeItem(this.PROGRAM_PROGRESS_KEY)
    }
    // NOTE: Do NOT clear program history here - that should persist
    console.log("[ProgramState] Cleared active program from storage")
  }

  /**
   * Clear all program history
   * Useful for testing and starting fresh
   */
  static clearProgramHistory(): void {
    if (typeof window === "undefined") return
    
    console.log("[ProgramState] Clearing all program history")
    
    // Use platform-aware storage removal
    if (this.shouldUseNativeStorage()) {
      this.removeStorageValue(this.PROGRAM_HISTORY_KEY).catch(console.error)
      this.removeStorageValue(this.ACTIVE_PROGRAM_KEY).catch(console.error)
    } else {
      localStorage.removeItem(this.PROGRAM_HISTORY_KEY)
      // Also clear the active program
      localStorage.removeItem(this.ACTIVE_PROGRAM_KEY)
    }
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
    let userProfile: { experience: "beginner" | "intermediate" | "advanced"; gender: "male" | "female" } = {
      experience: "beginner",
      gender: "male"
    }
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
      let exerciseLibraryId: string | undefined = exercise.exerciseLibraryId  // UUID from library

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
          exerciseLibraryId = dbExercise.id  // CRITICAL FIX: Use the actual library UUID for notes/RPE storage
        }
      } catch (error) {
        console.warn(`[ProgramState] Could not fetch exercise metadata for "${exercise.exerciseName}":`, error)
        // Continue with fallback values
      }
      // Final fallback: derive muscle group from name if still unknown
      if (!muscleGroup || muscleGroup.toLowerCase() === "other") {
        muscleGroup = getExerciseMuscleGroup(exercise.exerciseName)
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
        exerciseLibraryId,  // CRITICAL FIX: Now contains the actual UUID from database (not template)
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

  /**
   * Check if a workout is fully skipped (all sets have skipped=true or reps=0 && weight=0)
   */
  private static isWorkoutFullySkipped(workout: any): boolean {
    if (!workout || !workout.exercises) return false

    // Check if all exercises have all sets skipped
    return workout.exercises.every((exercise: any) => {
      if (!exercise.sets || exercise.sets.length === 0) return true
      return exercise.sets.every((set: any) => set.skipped || (set.reps === 0 && set.weight === 0))
    })
  }

  static async completeWorkout(userId?: string): Promise<void> {
    return this.withLock(async () => {
      const activeProgram = await this.getActiveProgram()
      if (!activeProgram) return

      // Get current user ID if not provided
      const resolvedUserId = userId ?? this.getCurrentUserId()

      // Start telemetry tracking
      const telemetryId = StorageTelemetry.startSyncOperation('program_complete', {
        currentWeek: activeProgram.currentWeek,
        currentDay: activeProgram.currentDay,
        completedWorkouts: activeProgram.completedWorkouts,
        totalWorkouts: activeProgram.totalWorkouts,
      })

      try {
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

        // DEBUG: Log detailed program state for diagnosing completion issues
        const programWeeks = activeProgram.template?.weeks || activeProgram.templateMetadata?.weeks || 6
        console.log("[v0] Workout completion check:", {
          currentWeek: activeProgram.currentWeek,
          currentDay: activeProgram.currentDay,
          daysPerWeek,
          programWeeks,
          templateWeeks: activeProgram.template?.weeks,
          metadataWeeks: activeProgram.templateMetadata?.weeks,
          isCurrentWeekComplete,
          instanceId: activeProgram.instanceId,
        })

        if (isCurrentWeekComplete) {
          // Check if we've reached the program's final week
          // Use templateMetadata.weeks as fallback if template.weeks is missing
          if (activeProgram.currentWeek >= programWeeks) {
            // Program is complete - finalize it instead of advancing to next week
            console.log("[v0] Program completed! Finalizing program after week", activeProgram.currentWeek, "of", programWeeks)
            StorageTelemetry.endSyncOperation(telemetryId, true)
            await this.finalizeActiveProgram(resolvedUserId, { endedEarly: false })
            return
          }

          // All days in current week are done, advance to next week
          activeProgram.currentWeek += 1
          activeProgram.currentDay = 1
          console.log("[v0] Week completed! Advanced to week", activeProgram.currentWeek)
      } else {
        // Find the next incomplete day in the current week
        // Start from day AFTER the current day to ensure we advance
        const currentDay = activeProgram.currentDay
        let nextDay = currentDay
        let foundIncomplete = false
        
        // First, check days after the current day
        for (let day = currentDay + 1; day <= daysPerWeek; day++) {
          const isCompleted = WorkoutLogger.hasCompletedWorkout(activeProgram.currentWeek, day, resolvedUserId, activeProgram.instanceId)
          console.log(`[v0] Checking day ${day}: completed=${isCompleted}`)
          if (!isCompleted) {
            nextDay = day
            foundIncomplete = true
            break
          }
        }
        
        // If no incomplete day found after current day, check from beginning
        // (in case user completed days out of order)
        if (!foundIncomplete) {
          for (let day = 1; day < currentDay; day++) {
            const isCompleted = WorkoutLogger.hasCompletedWorkout(activeProgram.currentWeek, day, resolvedUserId, activeProgram.instanceId)
            console.log(`[v0] Checking day ${day} (wrap-around): completed=${isCompleted}`)
            if (!isCompleted) {
              nextDay = day
              foundIncomplete = true
              break
            }
          }
        }
        
        // If still no incomplete day found, the week must be complete
        // This shouldn't happen since isWeekCompleted was false, but handle it
        if (!foundIncomplete) {
          console.log("[v0] All days appear complete, but isWeekCompleted was false. Advancing to next week.")
          activeProgram.currentWeek += 1
          activeProgram.currentDay = 1
        } else {
          activeProgram.currentDay = nextDay
          console.log("[v0] Advanced to next incomplete day:", nextDay, "from current day:", currentDay)
        }
      }

      await this.saveActiveProgram(activeProgram)

      window.dispatchEvent(new Event("programChanged"))

      const history = this.getProgramHistory()
      const historyEntry = history.find((p) => p.isActive)
      if (historyEntry) {
        historyEntry.completedWorkouts = activeProgram.completedWorkouts
        historyEntry.completionRate = activeProgram.progress
        historyEntry.instanceId = historyEntry.instanceId ?? historyEntry.id

        // Check if the workout that was just completed was fully skipped
        // Get the workout that was just completed (need to look back since currentDay has advanced)
        let workoutWeek = activeProgram.currentWeek
        let workoutDay = activeProgram.currentDay - 1

        // Handle week rollover
        if (workoutDay < 1) {
          workoutWeek = workoutWeek - 1
          const scheduleKeys = Object.keys(activeProgram.template.schedule)
          workoutDay = scheduleKeys.length
        }

        const completedWorkout = WorkoutLogger.getInProgressWorkout(workoutWeek, workoutDay, resolvedUserId)
        if (completedWorkout && this.isWorkoutFullySkipped(completedWorkout)) {
          historyEntry.skippedWorkouts = (historyEntry.skippedWorkouts ?? 0) + 1
        }

        this.saveProgramHistory(history)
      }

      console.log("[v0] Completed workout, updated progress:", activeProgram)

      // Sync to database
      if (resolvedUserId) {
        await this.syncToDatabase(resolvedUserId)
      }

      StorageTelemetry.endSyncOperation(telemetryId, true)
      } catch (error) {
        StorageTelemetry.endSyncOperation(telemetryId, false, String(error))
        StorageTelemetry.logSyncFailure('completeWorkout', error, {
          currentWeek: activeProgram?.currentWeek,
          currentDay: activeProgram?.currentDay,
        })
        throw error
      }
    })
  }


  static async finalizeActiveProgram(userId?: string, options?: { endedEarly?: boolean }): Promise<void> {
    // Start telemetry tracking
    const telemetryId = StorageTelemetry.startSyncOperation('program_complete', {
      endedEarly: options?.endedEarly,
      context: 'finalizeActiveProgram',
    })

    return this.withLock(async () => {
      const activeProgram = await this.getActiveProgram()
      if (!activeProgram) {
        StorageTelemetry.endSyncOperation(telemetryId, false, 'No active program')
        return
      }

      const resolvedUserId = userId ?? this.getCurrentUserId()

      console.log("[ProgramState] Finalizing program:", {
        programName: activeProgram.templateMetadata?.name || activeProgram.template?.name,
        endedEarly: options?.endedEarly,
        completedWorkouts: activeProgram.completedWorkouts,
        totalWorkouts: activeProgram.totalWorkouts,
      })

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

      // Clear storage (platform-aware: native SQLite or localStorage)
      // CRITICAL FIX: Must use removeStorageValue() to clear BOTH native SQLite AND localStorage
      // Using localStorage.removeItem() directly only clears web storage, leaving native SQLite stale
      await this.removeStorageValue(this.ACTIVE_PROGRAM_KEY)
      await this.removeStorageValue(this.PROGRAM_PROGRESS_KEY)

      // FIX: Dispatch events IMMEDIATELY BEFORE database operations
      // This ensures the UI updates even if Supabase calls hang or fail on Native
      // The celebration dialog must show regardless of network conditions
      if (typeof window !== "undefined") {
        // If program was completed naturally (not ended early), dispatch programCompleted event
        // This allows UI to show a celebration dialog
        if (!options?.endedEarly) {
          window.dispatchEvent(new CustomEvent("programCompleted", {
            detail: {
              programName: activeProgram.templateMetadata?.name || activeProgram.template?.name || "Program",
              totalWorkouts: activeProgram.totalWorkouts,
              completedWorkouts: activeProgram.completedWorkouts,
            }
          }))
          console.log("[ProgramState] Dispatched programCompleted event (natural completion)")
        }
        window.dispatchEvent(new CustomEvent("programEnded"))
        console.log("[ProgramState] Dispatched programEnded event")
      }

      // Database sync happens AFTER events are dispatched (fire-and-forget on Native)
      // This prevents slow/hanging network calls from blocking the UI celebration
      const syncToDatabase = async () => {
        // Delete from database
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
      }

      // CRITICAL FIX: Always await database sync for program end
      // This is a critical operation - we MUST ensure Supabase is updated
      // before the function returns, otherwise reinstalling the app will load stale data.
      // The ~1-2 second delay is acceptable for this infrequent operation.
      try {
        await syncToDatabase()
        console.log("[ProgramState] Database sync completed for program finalization")
      } catch (err) {
        console.error("[ProgramState] Database sync failed for program finalization:", err)
        StorageTelemetry.logSyncFailure('finalizeActiveProgram.syncToDatabase', err)
        // Don't throw - local storage is already updated, and we've shown the UI
        // The next app restart will try to sync again
      }

      StorageTelemetry.endSyncOperation(telemetryId, true)
    })
  }
  static async recalculateProgress(options?: { silent?: boolean }): Promise<void> {
    const activeProgram = await this.getActiveProgram()
    if (!activeProgram) return

    // Get current user ID
    const userId = this.getCurrentUserId()

    // Use non-forced loads to avoid overwriting fresh local/native state immediately after completion
    await this.ensureDatabaseLoaded(userId)
    await WorkoutLogger.ensureDatabaseLoaded(userId)

    // DEFENSIVE: Retag orphaned workouts before checking completion
    // This ensures any workouts that got saved without instanceId are recovered
    // before we check if the program is complete
    if (activeProgram.instanceId && activeProgram.templateId) {
      WorkoutLogger.tagWorkoutsWithInstance(
        activeProgram.instanceId,
        activeProgram.templateId,
        userId
      )
      console.log("[ProgramState] Retagged orphaned workouts before progress recalculation")
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

  /**
   * Save active program to local storage and optionally sync to Supabase immediately.
   * 
   * @param program - The active program to save
   * @param options.isCritical - If true, performs immediate Supabase sync even on native.
   *                             Use for critical state changes like new program creation or program end.
   *                             This prevents stale Supabase data from overwriting fresh local state
   *                             when the app restarts before background sync completes.
   */
  private static async saveActiveProgram(program: ActiveProgram, options?: { isCritical?: boolean }): Promise<void> {
    if (typeof window === "undefined") return

    if (!program.templateMetadata) {
      program.templateMetadata = this.extractTemplateMetadata(program.template)
    }

    if (program.template?.id) {
      this.templateCache.set(program.templateId, program.template)
    }

    const serializedProgram = this.serializeProgramForStorage(program)

    // NATIVE OPTIMIZATION: Use SQLite storage on native for instant saves
    // Background sync will handle Supabase synchronization for regular saves
    if (this.shouldUseNativeStorage()) {
      try {
        await this.setStorageValue(this.ACTIVE_PROGRAM_KEY, serializedProgram)
        console.log("[ProgramState] Saved to native SQLite storage")
        
        // SYNC PROTECTION FIX: For critical operations (new program, end program),
        // also sync to Supabase immediately to prevent stale data overwrites
        if (options?.isCritical) {
          console.log("[ProgramState] Critical operation - performing immediate Supabase sync")
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
                }, { onConflict: 'user_id' })
              console.log("[ProgramState] Critical sync completed - instanceId now in Supabase:", program.instanceId)
            } catch (error) {
              logSupabaseError("[ProgramState] Critical sync failed (will retry via background sync):", error)
              // Don't throw - SQLite already has the data, background sync will retry
            }
          }
        }
        return
      } catch (error) {
        console.warn("[ProgramState] Native storage failed, falling back to web storage:", error)
      }
    }

    // Web: Use localStorage with quota handling
    try {
      localStorage.setItem(this.ACTIVE_PROGRAM_KEY, serializedProgram)
      // RACE CONDITION FIX: Mark local save to protect from database overwrite
      this.markLocalSave()
    } catch (error) {
      if (this.isQuotaExceeded(error)) {
        console.warn("[ProgramState] Storage quota exceeded while saving active program - storing minimal snapshot")
        try {
          localStorage.setItem(this.ACTIVE_PROGRAM_KEY, this.serializeProgramMinimal(program))
          // RACE CONDITION FIX: Mark local save to protect from database overwrite
          this.markLocalSave()
        } catch (secondaryError) {
          console.error("[ProgramState] Failed to persist minimal active program snapshot:", secondaryError)
        }
      } else {
        throw error
      }
    }

    // Sync to database (critical for multi-device + page refresh)
    // On web, do this immediately. On native, background sync handles it.
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

    const telemetryId = StorageTelemetry.startSyncOperation('program_start', {
      userId,
      context: 'syncToDatabase',
    })

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
      StorageTelemetry.endSyncOperation(telemetryId, true)
    } catch (error) {
      logSupabaseError("[ProgramState] Sync to database failed:", error)
      StorageTelemetry.endSyncOperation(telemetryId, false, String(error))
      StorageTelemetry.logSyncFailure('syncToDatabase', error, { userId })
    }
  }

  static async loadFromDatabase(userId: string): Promise<void> {
    if (!supabase) {
      console.log("[ProgramState] Supabase not configured, skipping load")
      return
    }

    try {
      await WorkoutLogger.ensureDatabaseLoaded(userId)

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

        const instanceId = activeProgramData.instance_id ?? activeProgramData.id

        // FALLBACK FIX: If template not found in database, try to recover from localStorage
        if (!template) {
          console.error("[ProgramState] Template not found in database:", activeProgramData.program_id)
          console.log("[ProgramState] Attempting to recover program from localStorage...")

          // Try to load the program from localStorage as a fallback
          const storedProgram = localStorage.getItem(this.ACTIVE_PROGRAM_KEY)
          if (storedProgram) {
            try {
              const recovered = JSON.parse(storedProgram) as ActiveProgram
              if (recovered && recovered.templateMetadata) {
                console.log("[ProgramState] Successfully recovered program from localStorage:", recovered.templateId)
                // Program is recoverable - save it back to continue operation
                await this.saveActiveProgram(recovered)
                WorkoutLogger.tagWorkoutsWithInstance(instanceId, recovered.templateId, userId)
                console.log("[ProgramState] Program recovered and saved")
                return
              }
            } catch (error) {
              console.error("[ProgramState] Failed to recover from localStorage:", error)
            }
          }

          // If we can't recover, clear the broken state
          console.warn("[ProgramState] Cannot recover program - clearing broken state")
          localStorage.removeItem(this.ACTIVE_PROGRAM_KEY)
          localStorage.removeItem(this.PROGRAM_PROGRESS_KEY)
          return
        }

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
          templateMetadata: this.extractTemplateMetadata(template),
        }
        await this.saveActiveProgram(activeProgram)
        WorkoutLogger.tagWorkoutsWithInstance(instanceId, activeProgram.templateId, userId)

        // REPAIR: Update orphaned workouts in Supabase that match this program but lack instanceId
        // This fixes workouts that were saved before instanceId tracking was implemented,
        // or workouts that lost their instanceId due to sync issues
        const instanceStart = new Date(activeProgramData.start_date).getTime()
        try {
          const { error: repairError } = await supabase
            .from("workout_sessions")
            .update({ program_instance_id: instanceId })
            .eq("user_id", userId)
            .eq("program_id", activeProgramData.program_id)
            .is("program_instance_id", null)
            .gte("start_time", instanceStart)

          if (repairError) {
            console.warn("[ProgramState] Failed to repair orphaned workouts in database:", repairError)
          } else {
            console.log("[ProgramState] Repaired orphaned workouts in database with instanceId:", instanceId)
          }
        } catch (error) {
          console.warn("[ProgramState] Error repairing database workouts:", error)
          // Don't throw - this is a repair operation, not critical for program loading
        }

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
