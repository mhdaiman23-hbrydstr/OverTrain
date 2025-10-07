export interface WorkoutTemplateExercise {
  exerciseId: string
  exerciseName: string
  targetSets: number
  targetReps: string
  targetRest: string
  muscleGroup?: string
  equipmentType?: string
}

export interface WorkoutLoggerProps {
  initialWorkout?: {
    name: string
    exercises: WorkoutTemplateExercise[]
  }
  onComplete?: () => void
  onCancel?: () => void
  onViewAnalytics?: () => void
}
