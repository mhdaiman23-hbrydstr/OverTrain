/**
 * Program Wizard Types
 * Defines state structures for the custom program creation wizard
 */

export type WizardStep =
  | 'source'
  | 'dayCount'
  | 'templateSelect'
  | 'dayBuilder'
  | 'muscleGroupSelect'
  | 'exerciseAssign'
  | 'finalize'

export type ProgramSource = 'template' | 'scratch' | null

export interface MuscleGroupSelection {
  category: 'upper-push' | 'upper-pull' | 'legs' | 'accessories'
  group: string
  count: number
}

export interface ExerciseInWizard {
  tempId: string // Client-side UUID for React keys
  exerciseLibraryId: string // UUID from exercise_library table
  exerciseName: string
  muscleGroup: string
  equipmentType: string
  order: number
  category: 'compound' | 'isolation'
  restTime: number
}

export interface DayInWizard {
  dayNumber: number
  dayName: string // Editable by user
  muscleGroups?: MuscleGroupSelection[] // For scratch flow
  exercises: ExerciseInWizard[]
}

export interface ProgramMetadata {
  name: string
  weeks: number
  deloadWeek: number
  gender: string[]
  experience: string[]
  isPublic: boolean // Always false for now, future-proofing for community feature
}

export interface ProgramWizardState {
  // Wizard flow
  step: WizardStep
  source: ProgramSource

  // Day configuration
  dayCount: number
  selectedTemplateId: string | null // Only used for initial template load

  // Day/exercise data (ALL in-memory until save)
  days: DayInWizard[]

  // Program metadata
  metadata: ProgramMetadata

  // Loading/error states
  isLoading: boolean
  error: string | null
}

export const initialWizardState: ProgramWizardState = {
  step: 'source',
  source: null,
  dayCount: 0,
  selectedTemplateId: null,
  days: [],
  metadata: {
    name: '',
    weeks: 0,
    deloadWeek: 0,
    gender: ['male', 'female'],
    experience: ['beginner'],
    isPublic: false,
  },
  isLoading: false,
  error: null,
}
