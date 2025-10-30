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

export interface ProgramTemplateSummary {
  id: string
  name: string
  description: string | null
  daysPerWeek: number
  totalWeeks: number
  gender: GenderOption[]
  experienceLevel: ExperienceOption[]
  isActive: boolean
  updatedAt?: string | null
}

export interface ApiTemplateExercise {
  id: string
  templateDayId: string
  exerciseId: string
  exerciseName: string
  muscleGroup: string | null
  equipmentType: string | null
  order: number
  category: "compound" | "isolation"
  restTimeSeconds: number
  progressionConfig: Record<string, unknown>
}

export interface ApiTemplateDay {
  id: string
  dayNumber: number
  dayName: string
  exercises: ApiTemplateExercise[]
}

export interface ProgramTemplateDetail extends ProgramTemplateSummary {
  deloadWeek: number | null
  progressionType: ProgressionType
  isPublic?: boolean
  createdAt?: string | null
  days: ApiTemplateDay[]
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
