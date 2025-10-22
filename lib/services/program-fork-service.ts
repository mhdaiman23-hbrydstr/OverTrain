import { supabase } from '../supabase'
import { programTemplateService } from './program-template-service'

type ForkOptions = {
  nameOverride?: string
}

export class ProgramForkService {
  private static instance: ProgramForkService

  static getInstance(): ProgramForkService {
    if (!ProgramForkService.instance) {
      ProgramForkService.instance = new ProgramForkService()
    }
    return ProgramForkService.instance
  }

  private ensureSupabase() {
    if (!supabase) throw new Error('Supabase client not initialized - check environment variables')
  }

  /**
   * Fork a canonical template into a user-owned copy (My Program) and return new template ID.
   * Deep-clones days and exercises.
   */
  async forkTemplateToMyProgram(templateId: string, ownerUserId: string, options?: ForkOptions): Promise<string> {
    this.ensureSupabase()

    const source = await programTemplateService.getFullTemplate(templateId)
    if (!source) throw new Error('Source template not found')

    const name = options?.nameOverride || `${source.name} (My Copy)`

    const { data: newTemplate, error: insertError } = await supabase
      .from('program_templates')
      .insert({
        name,
        description: source.description ?? null,
        days_per_week: source.days_per_week,
        total_weeks: source.total_weeks,
        deload_week: source.deload_week,
        gender: source.gender,
        experience_level: source.experience_level,
        progression_type: source.progression_type,
        is_active: true,
        owner_user_id: ownerUserId,
        origin_template_id: source.id,
        origin_version: null,
        forked_at: new Date().toISOString(),
        origin_name_snapshot: source.name,
        created_from: 'template',
        is_public: false,
      })
      .select('id')
      .single()

    if (insertError || !newTemplate) throw insertError ?? new Error('Failed to create fork')

    const newTemplateId = newTemplate.id as string

    // Map old day IDs to new day IDs
    const dayIdMap = new Map<string, string>()

    // Insert days sequentially to capture new IDs
    const sortedDays = [...(source.days || [])].sort((a, b) => a.day_number - b.day_number)
    for (const day of sortedDays) {
      const { data: createdDay, error: dayError } = await supabase
        .from('program_template_days')
        .insert({
          program_template_id: newTemplateId,
          day_number: day.day_number,
          day_name: day.day_name,
        })
        .select('id')
        .single()

      if (dayError || !createdDay) throw dayError ?? new Error('Failed to create template day')
      dayIdMap.set(day.id, createdDay.id)
    }

    // Insert exercises per day
    for (const day of sortedDays) {
      const newDayId = dayIdMap.get(day.id)
      if (!newDayId) throw new Error('Missing new day mapping')

      const exercises = (day.exercises || []).map((ex) => ({
        template_day_id: newDayId,
        exercise_id: ex.exercise_id,
        exercise_order: ex.exercise_order,
        category: ex.category,
        rest_time_seconds: ex.rest_time_seconds,
        progression_config: ex.progression_config,
      }))

      if (exercises.length > 0) {
        const { error: exError } = await supabase
          .from('program_template_exercises')
          .insert(exercises)

        if (exError) throw exError
      }
    }

    return newTemplateId
  }

  /**
   * Create a blank user-owned program skeleton and return its ID.
   */
  async createBlankProgram(ownerUserId: string, name?: string, weeks?: number, deloadWeekParam?: number): Promise<string> {
    this.ensureSupabase()

    const programName = name?.trim() || 'New Program'
    const totalWeeks = weeks || 1
    const deloadWeek = deloadWeekParam || totalWeeks
    
    const { data: newTemplate, error } = await supabase!
      .from('program_templates')
      .insert({
        name: programName,
        description: null,
        days_per_week: 1,
        total_weeks: totalWeeks,
        deload_week: deloadWeek,
        gender: ['male', 'female'],
        experience_level: ['beginner'],
        progression_type: 'linear',
        is_active: true,
        owner_user_id: ownerUserId,
        origin_template_id: null,
        origin_version: null,
        forked_at: null,
        origin_name_snapshot: null,
        created_from: 'blank',
        is_public: false,
      })
      .select('id')
      .single()

    if (error || !newTemplate) throw error ?? new Error('Failed to create blank program')

    // Create minimal day 1
    const { error: dayError } = await supabase!
      .from('program_template_days')
      .insert({
        program_template_id: newTemplate.id,
        day_number: 1,
        day_name: 'Day 1',
      })

    if (dayError) throw dayError

    return newTemplate.id as string
  }

  async replaceExerciseInstances(params: {
    templateId: string
    toExerciseId: string
    templateExerciseIds?: string[]
    dayNumber?: number
    fromExerciseId?: string
  }): Promise<number> {
    this.ensureSupabase()

    const { templateId, toExerciseId, templateExerciseIds, dayNumber, fromExerciseId } = params

    if (templateExerciseIds && templateExerciseIds.length > 0) {
      const { data, error } = await supabase
        .from('program_template_exercises')
        .update({ exercise_id: toExerciseId })
        .in('id', templateExerciseIds)
        .select('id')

      if (error) throw error
      return data?.length ?? 0
    }

    if (!dayNumber || !fromExerciseId) {
      console.warn('[ProgramForkService] Missing dayNumber or fromExerciseId for template replacement')
      return 0
    }

    const { data: days, error: dayError } = await supabase
      .from('program_template_days')
      .select('id')
      .eq('program_template_id', templateId)
      .eq('day_number', dayNumber)

    if (dayError) throw dayError
    if (!days || days.length === 0) {
      console.warn('[ProgramForkService] No template day found for replacement', { templateId, dayNumber })
      return 0
    }

    const dayIds = days.map((day) => day.id)

    const { data, error } = await supabase
      .from('program_template_exercises')
      .update({ exercise_id: toExerciseId })
      .in('template_day_id', dayIds)
      .eq('exercise_id', fromExerciseId)
      .select('id')

    if (error) throw error
    return data?.length ?? 0
  }
}

export const programForkService = ProgramForkService.getInstance()
