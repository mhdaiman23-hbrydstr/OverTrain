export type GenderOption = "male" | "female"
export type ExperienceOption = "beginner" | "intermediate" | "advanced"
export type ProgressionType = "linear" | "percentage" | "hybrid"

export interface ExerciseLibraryItem {
  id: string
  name: string
  muscle_group: string
  equipment_type: string
}

export interface BuilderExercise {
  id: string
  exerciseId: string
  exerciseName: string
  category: "compound" | "isolation"
  restTimeSeconds: number
  order: number
  tier: "tier1" | "tier2"
  useGlobalProgression: boolean
  workingSets: number
  workingRepRange: string
  deloadSets: number
  deloadRepRange: string
  autoProgressionEnabled: boolean
  progressionMode: "weight_based" | "rep_based"
}

export interface BuilderDay {
  id: string
  dayNumber: number
  dayName: string
  exercises: BuilderExercise[]
}

export interface ProgramMeta {
  name: string
  description: string
  daysPerWeek: number
  totalWeeks: number
  progressionType: ProgressionType
  gender: GenderOption[]
  experienceLevel: ExperienceOption[]
  applyGlobalProgression: boolean
  isActive: boolean
}

export interface GlobalProgressionDefaults {
  workingSets: number
  workingRepRange: string
  deloadSets: number
  deloadRepRange: string
  restTimeSeconds: number
  tier: "tier1" | "tier2"
  autoProgressionEnabled: boolean
  progressionMode: "weight_based" | "rep_based"
}
