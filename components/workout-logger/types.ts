export interface WorkoutTemplateExercise {
  exerciseId: string
  exerciseName: string
  targetSets: number
  /**
   * templateRecommendedReps: The template's recommended rep range for display purposes ONLY.
   * This is derived from the template's repRange (e.g., "8-10" -> middle value 9)
   *
   * IMPORTANT: This field should NEVER be used for calculations or pre-filling sets.
   * It is ONLY for displaying the template's recommendation to the user.
   *
   * Actual workout behavior:
   * - Week 1: User enters their actual reps manually (sets start with 0 reps)
   * - Week 2+: Sets are pre-filled ONLY from perSetSuggestions (previous week's actual performance)
   */
  templateRecommendedReps: string
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
