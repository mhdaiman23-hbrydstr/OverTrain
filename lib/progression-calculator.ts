import { WorkoutLogger, type WorkoutSession } from "./workout-logger"
import type { ExerciseTemplate } from "./gym-templates"

export interface ProgressedExerciseData {
  targetWeight: number
  targetSets: number
  targetReps: string
  progressionNote?: string
  hasPreviousData: boolean
}

export class ProgressionCalculator {
  /**
   * Calculate progressed targets for an exercise based on previous week's performance
   */
  static calculateProgressedTargets(
    exerciseId: string,
    exerciseName: string,
    currentWeek: number,
    currentDay: number,
    exerciseTemplate: ExerciseTemplate,
  ): ProgressedExerciseData {
    console.log("[ProgressionCalculator] calculateProgressedTargets called:", {
      exerciseId,
      exerciseName,
      currentWeek,
      currentDay,
    })
    
    if (currentWeek === 1) {
      // Week 1 - no previous data, use template defaults
      const weekData = exerciseTemplate.progressionTemplate.week1
      console.log("[ProgressionCalculator] Week 1 - using template defaults")
      return {
        targetWeight: 0, // User enters their starting weight
        targetSets: weekData?.sets || 3,
        targetReps: weekData?.repRange || "8-10",
        hasPreviousData: false,
      }
    }

    // Try to get previous week's workout for the same day
    const previousWeek = currentWeek - 1
    let previousWorkout = WorkoutLogger.getCompletedWorkout(previousWeek, currentDay)
    console.log("[ProgressionCalculator] Previous workout for same day:", previousWorkout ? "found" : "not found")

    // If same day doesn't exist, try to get the most recent completed workout from previous week
    if (!previousWorkout) {
      const history = WorkoutLogger.getWorkoutHistory()
      const previousWeekWorkouts = history
        .filter(w => w.week === previousWeek && w.completed)
        .sort((a, b) => (b.day || 0) - (a.day || 0)) // Sort by day descending to get most recent
      
      previousWorkout = previousWeekWorkouts.length > 0 ? previousWeekWorkouts[0] : null
      console.log("[ProgressionCalculator] Previous week workouts:", {
        total: history.filter(w => w.week === previousWeek && w.completed).length,
        mostRecent: previousWorkout ? `Week ${previousWorkout.week} Day ${previousWorkout.day}` : "none",
      })
    }

    // For current week + 1, always try to calculate progression if there's any completed workout from previous week
    // This allows users to see suggested weights even if current week isn't complete
    if (!previousWorkout) {
      // No previous data for this week - show message
      const weekKey = `week${currentWeek}`
      const weekData =
        exerciseTemplate.progressionTemplate[weekKey] || exerciseTemplate.progressionTemplate.week1

      console.log("[ProgressionCalculator] No previous workout found, using template defaults")
      return {
        targetWeight: 0,
        targetSets: weekData?.sets || 3,
        targetReps: weekData?.repRange || "8-10",
        progressionNote: `Complete any workout from Week ${previousWeek} to see progressed targets`,
        hasPreviousData: false,
      }
    }

    // Find the same exercise in previous workout
    const previousExercise = previousWorkout.exercises.find(
      (ex) => ex.exerciseId === exerciseId || ex.exerciseName === exerciseName,
    )

    if (!previousExercise) {
      // Exercise not found in previous week (template might have changed)
      const weekKey = `week${currentWeek}`
      const weekData =
        exerciseTemplate.progressionTemplate[weekKey] || exerciseTemplate.progressionTemplate.week1

      return {
        targetWeight: 0,
        targetSets: weekData?.sets || 3,
        targetReps: weekData?.repRange || "8-10",
        hasPreviousData: false,
      }
    }

    // Calculate progression based on previous performance
    const completedSets = previousExercise.sets.filter((s) => s.completed && s.weight > 0 && s.reps > 0)

    if (completedSets.length === 0) {
      // Previous week had no completed sets - use template
      const weekKey = `week${currentWeek}`
      const weekData =
        exerciseTemplate.progressionTemplate[weekKey] || exerciseTemplate.progressionTemplate.week1

      return {
        targetWeight: 0,
        targetSets: weekData?.sets || 3,
        targetReps: weekData?.repRange || "8-10",
        progressionNote: "No data from previous week",
        hasPreviousData: false,
      }
    }

    // Get average or max weight from previous week
    const maxWeight = Math.max(...completedSets.map((s) => s.weight))
    const avgReps = completedSets.reduce((sum, s) => sum + s.reps, 0) / completedSets.length

    // Get target reps range for current week
    const weekKey = `week${currentWeek}`
    const currentWeekData =
      exerciseTemplate.progressionTemplate[weekKey] || exerciseTemplate.progressionTemplate.week1
    const targetRepRange = currentWeekData?.repRange || "8-10"
    const targetSets = currentWeekData?.sets || 3

    // Determine if user hit all target reps in previous week
    const targetRepsStr = previousExercise.targetReps || "8-10"
    const targetRepsMax = Number.parseInt(targetRepsStr.split("-")[1] || targetRepsStr)
    const allSetsCompletedWithGoodReps = completedSets.every((s) => s.reps >= targetRepsMax)

    // Calculate weight progression
    let progressedWeight = maxWeight
    let note = ""

    // Add info about which previous workout was used
    const workoutSource = previousWorkout.day === currentDay 
      ? `Week ${previousWeek} Day ${currentDay}` 
      : `Week ${previousWeek} Day ${previousWorkout.day}`

    if (allSetsCompletedWithGoodReps && completedSets.length >= previousExercise.targetSets) {
      // User completed all sets with good reps - increase weight
      const weightIncrease =
        exerciseTemplate.category === "compound"
          ? 5 // 5 lbs for compound exercises
          : 2.5 // 2.5 lbs for isolation exercises

      progressedWeight = maxWeight + weightIncrease
      note = `+${weightIncrease}lbs from ${workoutSource} (${maxWeight}lbs)`
    } else if (completedSets.length < previousExercise.targetSets / 2) {
      // Completed less than half the sets - suggest reducing weight
      progressedWeight = Math.round(maxWeight * 0.9 * 10) / 10
      note = `Reduced 10% from ${workoutSource} (${maxWeight}lbs)`
    } else {
      // Completed some sets but not all - repeat weight
      progressedWeight = maxWeight
      note = `Same as ${workoutSource} (${maxWeight}lbs)`
    }

    console.log("[ProgressionCalculator] Calculated progression:", {
      exerciseId,
      exerciseName,
      currentWeek,
      currentDay,
      previousWeek,
      previousWorkoutDay: previousWorkout.day,
      completedSetsCount: completedSets.length,
      maxWeight,
      avgReps,
      allSetsCompletedWithGoodReps,
      progressedWeight,
      note,
    })

    return {
      targetWeight: progressedWeight,
      targetSets,
      targetReps: targetRepRange,
      progressionNote: note,
      hasPreviousData: true,
    }
  }

  /**
   * Get progression summary for display
   */
  static getProgressionSummary(previousWeight: number, currentWeight: number): string {
    if (currentWeight > previousWeight) {
      const increase = currentWeight - previousWeight
      return `↑ +${increase}lbs`
    } else if (currentWeight < previousWeight) {
      const decrease = previousWeight - currentWeight
      return `↓ -${decrease}lbs`
    }
    return "→ Same weight"
  }
}
