/**
 * CustomRpeService
 * Manages per-set custom RPE logging, independent from block-level progression.
 *
 * Key behaviors:
 * - Supports decimal RPE values (8.5, 9.5, etc.)
 * - RPE is per-set (set 1, 2, 3 can have different values)
 * - Independent from block-level RIR/RPE
 * - Instance-specific (not cross-program)
 */

import { ExerciseCustomRpe } from '@/lib/types/progression'

const CUSTOM_RPE_STORAGE_KEY = 'liftlog_custom_rpe'

export class CustomRpeService {
  /**
   * Save custom RPE for a specific set of an exercise.
   *
   * @param userId - User UUID
   * @param programInstanceId - Program instance UUID
   * @param exerciseId - Exercise library UUID
   * @param week - Week number
   * @param setNumber - Set number (1, 2, 3, etc.)
   * @param rpeValue - RPE value (1-10, supports decimals like 8.5)
   * @returns The saved custom RPE record
   */
  static async saveCustomRpe(
    userId: string,
    programInstanceId: string,
    exerciseId: string,
    week: number,
    setNumber: number,
    rpeValue: number
  ): Promise<ExerciseCustomRpe> {
    // Validate RPE value
    if (rpeValue < 1 || rpeValue > 10) {
      throw new Error(`Invalid RPE value: ${rpeValue}. Must be between 1 and 10.`)
    }

    if (setNumber < 1) {
      throw new Error(`Invalid set number: ${setNumber}. Must be >= 1.`)
    }

    const now = Date.now()
    const id = crypto.randomUUID()

    const customRpe: ExerciseCustomRpe = {
      id,
      userId,
      programInstanceId,
      exerciseId,
      week,
      setNumber,
      rpeValue,
      createdAt: now,
      updatedAt: now
    }

    // Update localStorage immediately
    this.updateLocalStorage(customRpe)

    // TODO: Sync to Supabase async
    // await db.upsert('exercise_custom_rpe', customRpe)

    return customRpe
  }

  /**
   * Get custom RPE for a specific set.
   *
   * @param userId - User UUID
   * @param programInstanceId - Program instance UUID
   * @param exerciseId - Exercise library UUID
   * @param week - Week number
   * @param setNumber - Set number (1, 2, 3, etc.)
   * @returns Custom RPE or null if not recorded
   */
  static async getCustomRpe(
    userId: string,
    programInstanceId: string,
    exerciseId: string,
    week: number,
    setNumber: number
  ): Promise<ExerciseCustomRpe | null> {
    // Check localStorage first
    const rpes = this.getFromLocalStorage()
    const found = rpes.find(
      r =>
        r.userId === userId &&
        r.programInstanceId === programInstanceId &&
        r.exerciseId === exerciseId &&
        r.week === week &&
        r.setNumber === setNumber
    )

    if (found) return found

    // TODO: Query Supabase if not in localStorage
    // const dbRpe = await db.query('exercise_custom_rpe', {...})
    // return dbRpe || null

    return null
  }

  /**
   * Get all custom RPEs for an exercise in a week.
   * Returns a map of set number to RPE value.
   *
   * @param userId - User UUID
   * @param programInstanceId - Program instance UUID
   * @param exerciseId - Exercise library UUID
   * @param week - Week number
   * @returns Array of custom RPE records
   */
  static async getExerciseRpesForWeek(
    userId: string,
    programInstanceId: string,
    exerciseId: string,
    week: number
  ): Promise<ExerciseCustomRpe[]> {
    const rpes = this.getFromLocalStorage()
    return rpes.filter(
      r =>
        r.userId === userId &&
        r.programInstanceId === programInstanceId &&
        r.exerciseId === exerciseId &&
        r.week === week
    )
  }

  /**
   * Get custom RPEs as a map for easy lookup (set number -> RPE).
   *
   * @param userId - User UUID
   * @param programInstanceId - Program instance UUID
   * @param exerciseId - Exercise library UUID
   * @param week - Week number
   * @returns Object with set numbers as keys, RPE values as values
   */
  static async getExerciseRpesMapForWeek(
    userId: string,
    programInstanceId: string,
    exerciseId: string,
    week: number
  ): Promise<{ [setNumber: number]: number }> {
    const rpes = await this.getExerciseRpesForWeek(userId, programInstanceId, exerciseId, week)
    return rpes.reduce(
      (acc, r) => {
        acc[r.setNumber] = r.rpeValue
        return acc
      },
      {} as { [setNumber: number]: number }
    )
  }

  /**
   * Delete custom RPE for a specific set.
   *
   * @param customRpeId - Custom RPE record UUID
   */
  static async deleteCustomRpe(customRpeId: string): Promise<void> {
    const rpes = this.getFromLocalStorage()
    const filtered = rpes.filter(r => r.id !== customRpeId)
    this.setLocalStorage(filtered)

    // TODO: Delete from Supabase
    // await db.delete('exercise_custom_rpe', customRpeId)
  }

  /**
   * Delete all custom RPEs for an exercise when it's replaced.
   *
   * @param userId - User UUID
   * @param programInstanceId - Program instance UUID
   * @param exerciseId - Exercise library UUID
   */
  static async deleteExerciseRpes(
    userId: string,
    programInstanceId: string,
    exerciseId: string
  ): Promise<void> {
    const rpes = this.getFromLocalStorage()
    const filtered = rpes.filter(
      r =>
        !(
          r.userId === userId &&
          r.programInstanceId === programInstanceId &&
          r.exerciseId === exerciseId
        )
    )
    this.setLocalStorage(filtered)

    // TODO: Delete from Supabase
    // await db.delete('exercise_custom_rpe', { exercise_id: exerciseId, user_id: userId })
  }

  /**
   * Delete all custom RPEs for a week (for cleanup or reset).
   *
   * @param userId - User UUID
   * @param programInstanceId - Program instance UUID
   * @param week - Week number
   */
  static async deleteWeekRpes(
    userId: string,
    programInstanceId: string,
    week: number
  ): Promise<void> {
    const rpes = this.getFromLocalStorage()
    const filtered = rpes.filter(
      r =>
        !(
          r.userId === userId &&
          r.programInstanceId === programInstanceId &&
          r.week === week
        )
    )
    this.setLocalStorage(filtered)

    // TODO: Delete from Supabase
    // await db.delete('exercise_custom_rpe', { user_id: userId, week: week })
  }

  /**
   * Get all custom RPEs for an exercise across all weeks.
   * Useful for history/analytics view.
   *
   * @param userId - User UUID
   * @param programInstanceId - Program instance UUID
   * @param exerciseId - Exercise library UUID
   * @returns Array of all custom RPE records for that exercise
   */
  static async getExerciseRpeHistory(
    userId: string,
    programInstanceId: string,
    exerciseId: string
  ): Promise<ExerciseCustomRpe[]> {
    const rpes = this.getFromLocalStorage()
    return rpes.filter(
      r =>
        r.userId === userId &&
        r.programInstanceId === programInstanceId &&
        r.exerciseId === exerciseId
    )
  }

  /**
   * localStorage helpers
   */

  private static getFromLocalStorage(): ExerciseCustomRpe[] {
    if (typeof window === 'undefined') return []
    try {
      const data = window.localStorage.getItem(CUSTOM_RPE_STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      console.error('Failed to load custom RPE from localStorage')
      return []
    }
  }

  private static setLocalStorage(rpes: ExerciseCustomRpe[]): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(CUSTOM_RPE_STORAGE_KEY, JSON.stringify(rpes))
    } catch {
      console.error('Failed to save custom RPE to localStorage')
    }
  }

  private static updateLocalStorage(newRpe: ExerciseCustomRpe): void {
    const rpes = this.getFromLocalStorage()
    // Remove old RPE with same key (user+program+exercise+week+set)
    const filtered = rpes.filter(
      r =>
        !(
          r.userId === newRpe.userId &&
          r.programInstanceId === newRpe.programInstanceId &&
          r.exerciseId === newRpe.exerciseId &&
          r.week === newRpe.week &&
          r.setNumber === newRpe.setNumber
        )
    )
    // Add new RPE
    filtered.push(newRpe)
    this.setLocalStorage(filtered)
  }

  /**
   * Clear all custom RPE from localStorage (for testing/reset).
   */
  static clearLocalStorage(): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(CUSTOM_RPE_STORAGE_KEY)
    } catch {
      console.error('Failed to clear custom RPE from localStorage')
    }
  }
}
