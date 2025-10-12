export interface WorkoutTemplateExercise {
  exerciseId: string
  exerciseName: string
  targetSets: number
  /**
   * performedReps: The actual reps the user performed (or will perform).
   * - Week 1: User enters their actual reps during workout (e.g., "10")
   * - Week 2+: Pre-filled from previous week's actual performance (e.g., if user did 10 reps in Week 1, Week 2 shows "10")
   * - Progression applies to weight, reps stay constant unless user changes them
   * NOTE: Template repRange (e.g., "8-10") is ONLY for program preview/reference, never used in actual workouts
   */
  performedReps: string
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
