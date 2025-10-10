import { supabase } from '../supabase'

export interface Exercise {
  id: string  // UUID from Supabase
  name: string
  muscleGroup: string
  equipmentType: string
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

  // Basic CRUD operations
  async getAllExercises(): Promise<Exercise[]> {
    this.ensureSupabase()
    
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data || []
  }

  async getExerciseById(id: string): Promise<Exercise | null> {
    this.ensureSupabase()
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async getExerciseByName(name: string): Promise<Exercise | null> {
    this.ensureSupabase()
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .eq('name', name)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
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
    return data || []
  }

  async getExercisesByEquipment(equipmentType: string): Promise<Exercise[]> {
    this.ensureSupabase()
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .eq('equipment_type', equipmentType)
      .order('name')
    
    if (error) throw error
    return data || []
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
    return data || []
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
    return data || []
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
