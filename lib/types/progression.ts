/**
 * Type definitions for RIR/RPE progression, exercise notes, and custom RPE features.
 */

/**
 * Configuration for a single week in a progression block.
 * Both RIR and RPE are stored independently.
 */
export interface ProgressionWeekConfig {
  week: number
  rir: number // Reps in Reserve: 0-8
  rpe: number // Rate of Perceived Exertion: 1-10 (supports decimals like 8.5)
}

/**
 * Complete progression pattern for a specific block length (4-8 weeks).
 */
export interface RirRpeProgression {
  blockLength: 4 | 5 | 6 | 7 | 8
  weeks: ProgressionWeekConfig[]
}

/**
 * Exercise-specific notes that can be pinned to repeat across weeks.
 */
export interface ExerciseNote {
  id: string
  userId: string
  programInstanceId: string
  exerciseId: string // Reference to exercise_library.id
  week: number
  noteText: string
  isPinned: boolean
  createdAt: number // Timestamp in milliseconds
  updatedAt: number // Timestamp in milliseconds
}

/**
 * Per-set custom RPE logging, independent from block-level progression.
 */
export interface ExerciseCustomRpe {
  id: string
  userId: string
  programInstanceId: string
  exerciseId: string // Reference to exercise_library.id
  week: number
  setNumber: number
  rpeValue: number // 1-10, supports decimals like 8.5
  createdAt: number // Timestamp in milliseconds
  updatedAt: number // Timestamp in milliseconds
}

/**
 * User's display preference for intensity labels.
 */
export type RpeRirDisplayMode = 'rir' | 'rpe' | 'off'

/**
 * User preference for RIR/RPE display.
 */
export interface UserRpeRirPreference {
  displayMode: RpeRirDisplayMode
}

/**
 * Extended WorkoutExercise interface with notes and custom RPE.
 * Use this when spreading into existing WorkoutExercise type.
 */
export interface WorkoutExerciseExtension {
  notes?: ExerciseNote
  customRpeBySet?: {
    [setNumber: number]: number // set 1 → RPE 9, set 2 → RPE 8, etc.
  }
  blockLevelRir?: number // From program progression pattern
  blockLevelRpe?: number // Calculated from RIR
}

/**
 * Result of getProgressionLabelWithValues - includes both raw values and formatted label.
 */
export interface ProgressionLabelValues {
  label: string // e.g., "RIR 3", "RPE 7.5", or ""
  rir: number | null
  rpe: number | null
}
