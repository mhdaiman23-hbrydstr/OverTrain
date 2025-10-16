import { supabase } from '../supabase'

export interface Exercise {
  id: string  // UUID from Supabase
  name: string
  muscleGroup: string
  equipmentType: string
  linearProgressionTierId?: string | null  // UUID reference to linear_progression_tiers
  created_at?: string
  updated_at?: string
}

// Database row type (snake_case from Supabase)
interface ExerciseRow {
  id: string
  name: string
  muscle_group: string
  equipment_type: string
  linear_progression_tier_id?: string | null
  created_at?: string
  updated_at?: string
}

export class ExerciseLibraryService {
  private static instance: ExerciseLibraryService

  static getInstance(): ExerciseLibraryService {
    if (!ExerciseLibraryService.instance) {
      ExerciseLibraryService.instance = new ExerciseLibraryService()
    }
    return ExerciseLibraryService.instance
  }

  private ensureSupabase() {
    if (!supabase) throw new Error('Supabase client not initialized - check environment variables')
  }

  // Map database row (snake_case) to TypeScript interface (camelCase)
  private mapExercise(row: ExerciseRow): Exercise {
    return {
      id: row.id,
      name: row.name,
      muscleGroup: row.muscle_group,
      equipmentType: row.equipment_type,
      linearProgressionTierId: row.linear_progression_tier_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  }

  // Basic CRUD operations
  async getAllExercises(): Promise<Exercise[]> {
    this.ensureSupabase()
    
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .order('name')
    
    if (error) throw error
    return (data || []).map(row => this.mapExercise(row as ExerciseRow))
  }

  async getExerciseById(id: string): Promise<Exercise | null> {
    this.ensureSupabase()
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data ? this.mapExercise(data as ExerciseRow) : null
  }

  async getExerciseByName(name: string): Promise<Exercise | null> {
    this.ensureSupabase()
    
    try {
      const { data, error } = await supabase
        .from('exercise_library')
        .select('*')
        .eq('name', name)
        .maybeSingle() // Use maybeSingle() instead of single() to handle 0 or 1 results
      
      if (error) {
        console.warn('[ExerciseLibraryService] Error fetching by name:', error)
        return null
      }
      
      return data ? this.mapExercise(data as ExerciseRow) : null
    } catch (error) {
      console.error('[ExerciseLibraryService] Failed to get exercise by name:', error)
      return null
    }
  }

  // Filtering operations
  async getExercisesByMuscleGroup(muscleGroup: string): Promise<Exercise[]> {
    this.ensureSupabase()
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .eq('muscle_group', muscleGroup)
      .order('name')
    
    if (error) throw error
    return (data || []).map(row => this.mapExercise(row as ExerciseRow))
  }

  async getExercisesByEquipment(equipmentType: string): Promise<Exercise[]> {
    this.ensureSupabase()
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .eq('equipment_type', equipmentType)
      .order('name')
    
    if (error) throw error
    return (data || []).map(row => this.mapExercise(row as ExerciseRow))
  }

  async searchExercises(query: string): Promise<Exercise[]> {
    this.ensureSupabase()
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(50)
    
    if (error) throw error
    return (data || []).map(row => this.mapExercise(row as ExerciseRow))
  }

  // Advanced filtering
  async getExercisesWithFilters(filters: {
    muscleGroup?: string
    equipmentType?: string
    search?: string
  }): Promise<Exercise[]> {
    this.ensureSupabase()
    let query = supabase
      .from('exercise_library')
      .select('*')
    
    if (filters.muscleGroup) {
      query = query.eq('muscle_group', filters.muscleGroup)
    }
    
    if (filters.equipmentType) {
      query = query.eq('equipment_type', filters.equipmentType)
    }
    
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }
    
    const { data, error } = await query.order('name')
    
    if (error) throw error
    return (data || []).map(row => this.mapExercise(row as ExerciseRow))
  }

  // Utility methods
  async getMuscleGroups(): Promise<string[]> {
    this.ensureSupabase()
    const { data, error } = await supabase
      .from('exercise_library')
      .select('muscle_group')
    
    if (error) throw error
    
    const uniqueGroups = [...new Set(data?.map(item => item.muscle_group) || [])]
    return uniqueGroups.sort()
  }

  async getEquipmentTypes(): Promise<string[]> {
    this.ensureSupabase()
    const { data, error } = await supabase
      .from('exercise_library')
      .select('equipment_type')
    
    if (error) throw error
    
    const uniqueTypes = [...new Set(data?.map(item => item.equipment_type) || [])]
    return uniqueTypes.sort()
  }

  // Admin operations for future exercise management
  async addExercise(exercise: Omit<Exercise, 'id' | 'created_at' | 'updated_at'>): Promise<Exercise> {
    this.ensureSupabase()
    const { data, error } = await supabase
      .from('exercise_library')
      .insert(exercise)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async updateExercise(id: string, updates: Partial<Exercise>): Promise<Exercise> {
    this.ensureSupabase()
    const { data, error } = await supabase
      .from('exercise_library')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  async deleteExercise(id: string): Promise<void> {
    this.ensureSupabase()
    const { error } = await supabase
      .from('exercise_library')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Export singleton instance
export const exerciseService = ExerciseLibraryService.getInstance()
