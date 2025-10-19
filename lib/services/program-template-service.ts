/**
 * Program Template Service
 *
 * High-performance service for loading workout program templates from database.
 * Features:
 * - Aggressive caching for <50ms response times
 * - Single-query joins to minimize DB roundtrips
 * - Compatible with existing GymTemplate interface
 * - Zero changes required to workout logger
 */

import { supabase } from '../supabase'
import type { GymTemplate, ExerciseTemplate, WorkoutDay } from '../gym-templates'

// ============================================================================
// DATABASE TYPES (Match SQL schema)
// ============================================================================

interface DbProgramTemplate {
  id: string
  name: string
  description: string | null
  days_per_week: number
  total_weeks: number
  deload_week: number | null
  gender: string[]
  experience_level: string[]
  progression_type: string
  is_active: boolean
  // Custom program ownership/origin (nullable for canonical templates)
  owner_user_id?: string | null
  origin_template_id?: string | null
  origin_version?: number | null
  forked_at?: string | null
  origin_name_snapshot?: string | null
  origin_author_snapshot?: string | null
  created_from?: 'blank' | 'template' | 'import' | null
  created_at: string
  updated_at: string
}

interface DbTemplateDay {
  id: string
  program_template_id: string
  day_number: number
  day_name: string
}

interface DbTemplateExercise {
  id: string
  template_day_id: string
  exercise_id: string
  exercise_order: number
  progression_config: {
    progressionTemplate: Record<string, { sets: number; repRange: string; intensity?: string }>
    autoProgression?: {
      enabled: boolean
      progressionType: 'weight_based' | 'rep_based'
      rules: {
        if_all_sets_completed: string
        if_failed_reps: string
        if_failed_twice: string
      }
    }
    tier?: string
  }
  rest_time_seconds: number
  category: 'compound' | 'isolation'
}

interface DbExercise {
  id: string
  name: string
  muscle_group: string
  equipment_type: string
}

// Full template with all relationships
interface DbFullTemplate extends DbProgramTemplate {
  days: Array<
    DbTemplateDay & {
      exercises: Array<
        DbTemplateExercise & {
          exercise: DbExercise
        }
      >
    }
  >
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class ProgramTemplateService {
  private static instance: ProgramTemplateService

  // Cache with TTL
  private cache = new Map<string, any>()
  private cacheTimestamps = new Map<string, number>()
  private readonly CACHE_TTL = 10 * 60 * 1000 // 10 minutes

  static getInstance(): ProgramTemplateService {
    if (!ProgramTemplateService.instance) {
      ProgramTemplateService.instance = new ProgramTemplateService()
    }
    return ProgramTemplateService.instance
  }

  private ensureSupabase() {
    if (!supabase) throw new Error('Supabase client not initialized - check environment variables')
  }

  // ==========================================================================
  // CACHE MANAGEMENT
  // ==========================================================================

  private isCacheValid(key: string): boolean {
    const timestamp = this.cacheTimestamps.get(key)
    if (!timestamp) return false
    return Date.now() - timestamp < this.CACHE_TTL
  }

  private setCache(key: string, value: any): void {
    this.cache.set(key, value)
    this.cacheTimestamps.set(key, Date.now())
  }

  private getCache(key: string): any | null {
    if (!this.isCacheValid(key)) {
      this.cache.delete(key)
      this.cacheTimestamps.delete(key)
      return null
    }
    return this.cache.get(key) || null
  }

  clearCache(): void {
    this.cache.clear()
    this.cacheTimestamps.clear()
    console.log('[ProgramTemplateService] Cache cleared')
  }

  // ==========================================================================
  // FETCH METHODS (With Caching)
  // ==========================================================================

  /**
   * Get all active program templates (lightweight - no exercises)
   * Use for listing/filtering templates
   * Performance: <5ms cached, <100ms uncached
   */
  async getAllTemplates(): Promise<DbProgramTemplate[]> {
    const cacheKey = 'all_templates'
    const cached = this.getCache(cacheKey)
    if (cached) return cached

    this.ensureSupabase()

    const { data, error } = await supabase
      .from('program_templates')
      .select('*')
      .eq('is_active', true)
      .is('owner_user_id', null)
      .order('name')

    if (error) throw error

    this.setCache(cacheKey, data || [])
    return data || []
  }

  /**
   * Get all user-owned programs (My Programs) - lightweight metadata only
   */
  async getMyPrograms(userId: string): Promise<DbProgramTemplate[]> {
    const cacheKey = `my_programs_${userId}`
    const cached = this.getCache(cacheKey)
    if (cached) return cached

    this.ensureSupabase()

    const { data, error } = await supabase
      .from('program_templates')
      .select('*')
      .eq('owner_user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw error

    this.setCache(cacheKey, data || [])
    return data || []
  }

  async renameUserProgram(templateId: string, userId: string, name: string): Promise<void> {
    this.ensureSupabase()

    const { error } = await supabase
      .from('program_templates')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', templateId)
      .eq('owner_user_id', userId)

    if (error) throw error

    this.cache.delete(`my_programs_${userId}`)
    this.cacheTimestamps.delete(`my_programs_${userId}`)
  }

  /**
   * Get templates filtered by criteria
   * Performance: <5ms cached, <100ms uncached
   */
  async getTemplatesByFilter(filters: {
    gender?: 'male' | 'female'
    experience?: 'beginner' | 'intermediate' | 'advanced'
    daysPerWeek?: number
  }): Promise<DbProgramTemplate[]> {
    const cacheKey = `filter_${JSON.stringify(filters)}`
    const cached = this.getCache(cacheKey)
    if (cached) return cached

    this.ensureSupabase()

    let query = supabase
      .from('program_templates')
      .select('*')
      .eq('is_active', true)

    // Filter by gender (array contains)
    if (filters.gender) {
      query = query.contains('gender', [filters.gender])
    }

    // Filter by experience (array contains)
    if (filters.experience) {
      query = query.contains('experience_level', [filters.experience])
    }

    // Filter by days per week
    if (filters.daysPerWeek) {
      query = query.eq('days_per_week', filters.daysPerWeek)
    }

    const { data, error } = await query.order('name')

    if (error) throw error

    this.setCache(cacheKey, data || [])
    return data || []
  }

  /**
   * Get full template with all days and exercises (SINGLE QUERY)
   * This is the main method used by ProgramStateManager
   * Performance: <10ms cached, <200ms uncached
   */
  async getFullTemplate(templateId: string): Promise<DbFullTemplate | null> {
    const cacheKey = `full_${templateId}`
    const cached = this.getCache(cacheKey)
    if (cached) return cached

    this.ensureSupabase()

    // Single query with nested joins (PostgreSQL magic!)
    const { data, error } = await supabase
      .from('program_templates')
      .select(`
        *,
        days:program_template_days(
          *,
          exercises:program_template_exercises(
            *,
            exercise:exercise_library(id, name, muscle_group, equipment_type)
          )
        )
      `)
      .eq('id', templateId)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    // Sort days and exercises by order
    if (data && data.days) {
      data.days.sort((a, b) => a.day_number - b.day_number)
      data.days.forEach(day => {
        if (day.exercises) {
          day.exercises.sort((a, b) => a.exercise_order - b.exercise_order)
        }
      })
    }

    this.setCache(cacheKey, data)
    return data
  }

  // ==========================================================================
  // CONVERSION TO LEGACY FORMAT (Compatibility Layer)
  // ==========================================================================

  /**
   * Convert database template to GymTemplate format
   * This ensures workout logger receives data in expected format
   * NO CHANGES to workout logger needed!
   */
  convertToGymTemplate(dbTemplate: DbFullTemplate): GymTemplate {
    const schedule: { [key: string]: WorkoutDay } = {}

    // Convert each day
    dbTemplate.days?.forEach((day, index) => {
      const dayKey = `day${index + 1}`

      const exercises: ExerciseTemplate[] = day.exercises?.map(ex => ({
        id: ex.id,
        exerciseName: ex.exercise.name, // EXACT name from database
        exerciseLibraryId: ex.exercise_id, // UUID for future reference
        category: ex.category,
        equipmentType: ex.exercise.equipment_type,
        tier: ex.progression_config.tier as any,
        progressionTemplate: ex.progression_config.progressionTemplate,
        autoProgression: ex.progression_config.autoProgression || {
          enabled: false,
          progressionType: 'weight_based',
          rules: {
            if_all_sets_completed: '',
            if_failed_reps: '',
            if_failed_twice: ''
          }
        },
        restTime: ex.rest_time_seconds
      })) || []

      schedule[dayKey] = {
        name: day.day_name,
        exercises
      }
    })

    // Convert to GymTemplate format
    return {
      id: dbTemplate.id,
      name: dbTemplate.name,
      days: dbTemplate.days_per_week,
      weeks: dbTemplate.total_weeks,
      gender: dbTemplate.gender as ('male' | 'female')[],
      experience: dbTemplate.experience_level as ('beginner' | 'intermediate' | 'advanced')[],
      ownerUserId: dbTemplate.owner_user_id ?? null,
      originTemplateId: dbTemplate.origin_template_id ?? null,
      forkedAt: dbTemplate.forked_at ?? null,
      createdFrom: dbTemplate.created_from ?? null,
      progressionScheme: {
        type: 'linear',
        deloadWeek: dbTemplate.deload_week || dbTemplate.total_weeks,
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
      schedule
    }
  }

  /**
   * Get template in GymTemplate format (ready for use)
   * This is what ProgramStateManager will call
   * Performance: <10ms cached, <200ms uncached
   */
  async getTemplate(templateId: string): Promise<GymTemplate | null> {
    const dbTemplate = await this.getFullTemplate(templateId)
    if (!dbTemplate) return null

    return this.convertToGymTemplate(dbTemplate)
  }

  /**
   * Get all templates in GymTemplate format
   * Use for program selection UI
   */
  async getAllGymTemplates(): Promise<GymTemplate[]> {
    const cacheKey = 'all_gym_templates'
    const cached = this.getCache(cacheKey)
    if (cached) return cached

    const templates = await this.getAllTemplates()

    // Fetch full data for each template (parallel)
    const fullTemplates = await Promise.all(
      templates.map(t => this.getFullTemplate(t.id))
    )

    const gymTemplates = fullTemplates
      .filter((t): t is DbFullTemplate => t !== null)
      .map(t => this.convertToGymTemplate(t))

    this.setCache(cacheKey, gymTemplates)
    return gymTemplates
  }

  // ==========================================================================
  // WARM CACHE (Call on app startup)
  // ==========================================================================

  /**
   * Preload popular templates into cache
   * Call this on app initialization for instant performance
   */
  async warmCache(): Promise<void> {
    try {
      console.log('[ProgramTemplateService] Warming cache...')

      // Load all templates
      await this.getAllTemplates()

      // Load full data for top 10 templates
      const templates = await this.getAllTemplates()
      const topTemplates = templates.slice(0, 10)

      await Promise.all(topTemplates.map(t => this.getFullTemplate(t.id)))

      console.log(`[ProgramTemplateService] Cache warmed with ${topTemplates.length} templates`)
    } catch (error) {
      console.error('[ProgramTemplateService] Failed to warm cache:', error)
    }
  }

  // ==========================================================================
  // ADMIN OPERATIONS (For future template creation UI)
  // ==========================================================================

  async createTemplate(template: Omit<DbProgramTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    this.ensureSupabase()

    const { data, error } = await supabase
      .from('program_templates')
      .insert(template)
      .select('id')
      .single()

    if (error) throw error

    this.clearCache() // Invalidate cache
    return data.id
  }

  async updateTemplate(id: string, updates: Partial<DbProgramTemplate>): Promise<void> {
    this.ensureSupabase()

    const { error } = await supabase
      .from('program_templates')
      .update(updates)
      .eq('id', id)

    if (error) throw error

    this.clearCache() // Invalidate cache
  }

  async deleteTemplate(id: string): Promise<void> {
    this.ensureSupabase()

    const { error } = await supabase
      .from('program_templates')
      .delete()
      .eq('id', id)

    if (error) throw error

    this.clearCache() // Invalidate cache
  }
}

// Export singleton instance
export const programTemplateService = ProgramTemplateService.getInstance()
