import { WorkoutLogger, type WorkoutSession } from "./workout-logger"
import type { ExerciseTemplate } from "./gym-templates"
import {
  PROGRESSION_TIERS,
  getExerciseTier,
  getTierRules,
  roundToIncrement,
  calculateWeightBounds,
  determineProgressionStrategy,
  type ProgressionTier
} from "./progression-tiers"
import { ProgressionRouter, type ProgressionInput, type ProgressionResult } from "./progression-router"
import type { ActiveProgram } from "./program-state"

export interface ProgressedExerciseData {
  targetWeight: number
  targetSets: number
  performedReps: string
  progressionNote?: string
  hasPreviousData: boolean
}

export interface AdaptiveProgressionResult extends ProgressedExerciseData {
  adjustedReps?: number
  bounds?: { min: number; max: number }
  strategy?: "standard" | "volume_compensated" | "multi_week" | "out_of_bounds"
  tier?: ProgressionTier
  targetVolume?: number
  userWeightAdjustment?: number
  perSetSuggestions?: Array<{  // NEW: per-set weight and rep suggestions
    weight: number
    reps: number
    baseWeight: number
    baseReps: number
    bounds: { min: number; max: number }
  }>
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
        performedReps: weekData?.repRange || "8-10",
        hasPreviousData: false,
      }
    }

    // Try to get the most recent completed workout from previous week (any day)
    const previousWeek = currentWeek - 1
    const history = WorkoutLogger.getWorkoutHistory()
    const previousWeekWorkouts = history
      .filter(w => w.week === previousWeek && w.completed)
      .sort((a, b) => (b.day || 0) - (a.day || 0)) // Sort by day descending to get most recent

    let previousWorkout = previousWeekWorkouts.length > 0 ? previousWeekWorkouts[0] : null

    console.log("[ProgressionCalculator] Previous week workouts:", {
      week: previousWeek,
      total: history.filter(w => w.week === previousWeek && w.completed).length,
      mostRecent: previousWorkout ? `Week ${previousWorkout.week} Day ${previousWorkout.day}` : "none",
      workouts: previousWeekWorkouts.map(w => `Day ${w.day}: ${w.exercises.length} exercises`)
    })

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
        performedReps: weekData?.repRange || "8-10",
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
        performedReps: weekData?.repRange || "8-10",
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
        performedReps: weekData?.repRange || "8-10",
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
    const performedRepsStr = previousExercise.performedReps || "8-10"
    const performedRepsMax = Number.parseInt(performedRepsStr.split("-")[1] || performedRepsStr)
    const allSetsCompletedWithGoodReps = completedSets.every((s) => s.reps >= performedRepsMax)

    // Get tier-based progression rules
    const tier = getExerciseTier(exerciseName, exerciseTemplate.category)
    const tierRules = PROGRESSION_TIERS[tier]

    // Calculate weight progression using tier-based increments
    let progressedWeight = maxWeight
    let note = ""

    // Add info about which previous workout was used
    const workoutSource = previousWorkout.day === currentDay
      ? `Week ${previousWeek} Day ${currentDay}`
      : `Week ${previousWeek} Day ${previousWorkout.day}`

    if (allSetsCompletedWithGoodReps && completedSets.length >= previousExercise.targetSets) {
      // User completed all sets with good reps - increase weight based on tier
      const weightIncrease = tierRules.minIncrement
      progressedWeight = maxWeight + weightIncrease
      note = `+${weightIncrease} (${tier}) from ${workoutSource} (${maxWeight})`
    } else if (completedSets.length < previousExercise.targetSets / 2) {
      // Completed less than half the sets - suggest reducing weight
      progressedWeight = Math.round(maxWeight * 0.9 * 10) / 10
      note = `Reduced 10% from ${workoutSource} (${maxWeight})`
    } else {
      // Completed some sets but not all - repeat weight
      progressedWeight = maxWeight
      note = `Same as ${workoutSource} (${maxWeight})`
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
      performedReps: targetRepRange,
      progressionNote: note,
      hasPreviousData: true,
    }
  }

  /**
   * Calculate adaptive progression using tier-based system
   */
  static calculateAdaptiveProgression(
    exerciseId: string,
    exerciseName: string,
    currentWeek: number,
    currentDay: number,
    exerciseTemplate: ExerciseTemplate,
    userWeightAdjustment?: number
  ): AdaptiveProgressionResult {
    console.log("[ProgressionCalculator] calculateAdaptiveProgression called:", {
      exerciseId,
      exerciseName,
      currentWeek,
      currentDay,
      userWeightAdjustment,
    })

    // Determine exercise tier
    const tier = getExerciseTier(exerciseName, exerciseTemplate.category)
    const tierRules = getTierRules(exerciseName, exerciseTemplate.category)

    console.log("[ProgressionCalculator] Exercise tier:", {
      exerciseName,
      category: exerciseTemplate.category,
      tier,
      rules: tierRules
    })

    // Handle deload week
    const isDeloadWeek = this.isDeloadWeek(currentWeek, exerciseTemplate)
    if (isDeloadWeek) {
      return this.calculateDeloadProgression(exerciseId, exerciseName, currentWeek, exerciseTemplate, tier, tierRules)
    }

    // Week 1 - no previous data, use template defaults
    if (currentWeek === 1) {
      const weekData = exerciseTemplate.progressionTemplate.week1
      console.log("[ProgressionCalculator] Week 1 - using template defaults")
      return {
        targetWeight: 0, // User enters their starting weight
        targetSets: weekData?.sets || 3,
        performedReps: weekData?.repRange || "8-10",
        hasPreviousData: false,
        tier,
        strategy: "standard"
      }
    }

    // Get previous week's data
    const previousData = this.getPreviousWeekData(exerciseId, exerciseName, currentWeek)
    if (!previousData) {
      // No previous data available
      const weekKey = `week${currentWeek}`
      const weekData = exerciseTemplate.progressionTemplate[weekKey] || exerciseTemplate.progressionTemplate.week1

      return {
        targetWeight: 0,
        targetSets: weekData?.sets || 3,
        performedReps: weekData?.repRange || "8-10",
        progressionNote: `Complete any workout from Week ${currentWeek - 1} to see progressed targets`,
        hasPreviousData: false,
        tier,
        strategy: "standard"
      }
    }

    const { lastWeight, avgReps, completedSets, workoutSource, previousWeek } = previousData

    // Calculate target volume for this week
    const targetVolume = lastWeight * avgReps * (1 + tierRules.weeklyIncrease)

    // Get current week template data
    const weekKey = `week${currentWeek}`
    const currentWeekData = exerciseTemplate.progressionTemplate[weekKey] || exerciseTemplate.progressionTemplate.week1
    const targetRepRange = currentWeekData?.repRange || "8-10"
    const targetSets = currentWeekData?.sets || 3

    // Calculate bounds
    const bounds = calculateWeightBounds(lastWeight, tierRules.adjustmentBounds)

    console.log("[ProgressionCalculator] Adaptive progression calculation:", {
      lastWeight,
      avgReps,
      targetVolume,
      bounds,
      tierRules,
      userWeightAdjustment
    })

    // If no user weight adjustment provided, calculate ideal progression
    if (!userWeightAdjustment) {
      const idealWeight = roundToIncrement(targetVolume / avgReps, tierRules.minIncrement)
      const strategy = determineProgressionStrategy(idealWeight, idealWeight, targetVolume, tierRules)

      return {
        targetWeight: idealWeight,
        targetSets,
        performedReps: targetRepRange,
        progressionNote: `Auto-calculated +${(idealWeight - lastWeight).toFixed(1)} from ${workoutSource}`,
        hasPreviousData: true,
        tier,
        targetVolume,
        bounds,
        strategy: strategy.strategy,
        adjustedReps: strategy.adjustedReps
      }
    }

    // User provided weight adjustment - validate and calculate compensation
    const strategy = determineProgressionStrategy(userWeightAdjustment, targetVolume / avgReps, targetVolume, tierRules)

    console.log("[ProgressionCalculator] User weight adjustment strategy:", strategy)

    let progressionNote = `User selected ${userWeightAdjustment} from ${workoutSource}`
    if (strategy.message) {
      progressionNote += ` (${strategy.message})`
    }

    return {
      targetWeight: userWeightAdjustment,
      targetSets,
      performedReps: targetRepRange,
      progressionNote,
      hasPreviousData: true,
      tier,
      targetVolume,
      userWeightAdjustment,
      bounds,
      strategy: strategy.strategy,
      adjustedReps: strategy.adjustedReps
    }
  }

  /**
   * Calculate progression for deload week
   */
  private static calculateDeloadProgression(
    exerciseId: string,
    exerciseName: string,
    currentWeek: number,
    exerciseTemplate: ExerciseTemplate,
    tier: ProgressionTier,
    tierRules: any
  ): AdaptiveProgressionResult {
    console.log("[ProgressionCalculator] Calculating deload progression for week", currentWeek)

    // Get previous week's data for reference
    const previousData = this.getPreviousWeekData(exerciseId, exerciseName, currentWeek)
    const referenceWeight = previousData?.lastWeight || 0

    // Deload: reduce weight by ~20% and use lighter rep ranges
    const deloadWeight = referenceWeight > 0 ? Math.round(referenceWeight * 0.8) : 0

    return {
      targetWeight: deloadWeight,
      targetSets: Math.max(1, (exerciseTemplate.progressionTemplate.week1?.sets || 3) - 1), // Reduce sets by 1
      performedReps: "6-8", // Lighter rep range for deload
      progressionNote: referenceWeight > 0 ? `Deload week (${Math.round((1 - 0.8) * 100)}% reduction from ${referenceWeight})` : "Deload week - use lighter weight",
      hasPreviousData: previousData !== null,
      tier,
      strategy: "standard"
    }
  }

  /**
   * Check if current week is a deload week
   */
  private static isDeloadWeek(currentWeek: number, exerciseTemplate: any): boolean {
    // Check if template has explicit deload week setting
    if (exerciseTemplate.weeks && currentWeek === exerciseTemplate.weeks) {
      return true
    }

    // Default: check if this is the last week in a 6-week program
    // This will be updated when templates are converted to 6 weeks
    return currentWeek === 6
  }

  /**
   * Get previous week's workout data for an exercise
   */
  private static getPreviousWeekData(
    exerciseId: string,
    exerciseName: string,
    currentWeek: number
  ): {
    lastWeight: number
    avgReps: number
    completedSets: number
    workoutSource: string
    previousWeek: number
  } | null {
    const previousWeek = currentWeek - 1
    const history = WorkoutLogger.getWorkoutHistory()
    const previousWeekWorkouts = history
      .filter(w => w.week === previousWeek && w.completed)
      .sort((a, b) => (b.day || 0) - (a.day || 0))

    let previousWorkout = previousWeekWorkouts.length > 0 ? previousWeekWorkouts[0] : null

    if (!previousWorkout) {
      return null
    }

    const previousExercise = previousWorkout.exercises.find(
      (ex) => ex.exerciseId === exerciseId || ex.exerciseName === exerciseName,
    )

    if (!previousExercise) {
      return null
    }

    const completedSets = previousExercise.sets.filter((s) => s.completed && s.weight > 0 && s.reps > 0)

    if (completedSets.length === 0) {
      return null
    }

    const lastWeight = Math.max(...completedSets.map((s) => s.weight))
    const avgReps = completedSets.reduce((sum, s) => sum + s.reps, 0) / completedSets.length
    const workoutSource = previousWorkout.day === (currentWeek % 7 || 1)
      ? `Week ${previousWeek} Day ${previousWorkout.day}`
      : `Week ${previousWeek} Day ${previousWorkout.day}`

    return {
      lastWeight,
      avgReps,
      completedSets: completedSets.length,
      workoutSource,
      previousWeek
    }
  }

  /**
   * Get progression summary for display
   */
  static getProgressionSummary(previousWeight: number, currentWeight: number): string {
    if (currentWeight > previousWeight) {
      const increase = currentWeight - previousWeight
      return `↑ +${increase}`
    } else if (currentWeight < previousWeight) {
      const decrease = previousWeight - currentWeight
      return `↓ -${decrease}`
    }
    return "→ Same weight"
  }

  /**
   * Calculate adaptive progression using the new ProgressionRouter system
   * This is the recommended method for new implementations
   */
  static calculateAdaptiveProgressionWithRouter(
    exerciseId: string,
    exerciseName: string,
    currentWeek: number,
    currentDay: number,
    exerciseTemplate: ExerciseTemplate,
    activeProgram: ActiveProgram,
    userProfile: { experience: "beginner" | "intermediate" | "advanced"; gender: "male" | "female" },
    userWeightAdjustment?: number,
    oneRepMaxes?: any[]
  ): AdaptiveProgressionResult {
    console.log("[ProgressionCalculator] calculateAdaptiveProgressionWithRouter called:", {
      exerciseId,
      exerciseName,
      currentWeek,
      currentDay,
      templateProgressionType: activeProgram.template.progressionConfig?.type || activeProgram.template.progressionScheme?.type,
      hasOverride: !!activeProgram.progressionOverride?.enabled,
      userWeightAdjustment
    })

    // Get previous performance data
    const previousPerformance = ProgressionRouter.getPreviousPerformance(exerciseId, exerciseName, currentWeek)

    // Prepare progression input
    const progressionInput: ProgressionInput = {
      exercise: exerciseTemplate,
      activeProgram,
      currentWeek,
      userProfile,
      previousPerformance: previousPerformance || undefined,
      userWeightAdjustment,
      oneRepMaxes
    }

    // Route to appropriate engine
    const progressionResult: ProgressionResult = ProgressionRouter.calculateProgression(progressionInput)

    console.log("[ProgressionCalculator] Router result:", {
      engineUsed: progressionResult.engineUsed,
      strategy: progressionResult.strategy,
      targetWeight: progressionResult.targetWeight,
      performedReps: progressionResult.performedReps,
      note: progressionResult.progressionNote
    })

    // Convert to AdaptiveProgressionResult format for backward compatibility
    const adaptiveResult: AdaptiveProgressionResult = {
      targetWeight: progressionResult.targetWeight,
      targetSets: progressionResult.targetSets || this.getCurrentWeekSets(exerciseTemplate, currentWeek),
      performedReps: this.formatRepRange(progressionResult.performedReps),
      progressionNote: progressionResult.progressionNote,
      hasPreviousData: !!previousPerformance,
      tier: getExerciseTier(exerciseName, exerciseTemplate.category),
      strategy: this.mapStrategy(progressionResult.strategy),
      adjustedReps: progressionResult.additionalData?.adjustedReps,
      bounds: progressionResult.additionalData?.bounds,
      targetVolume: progressionResult.targetWeight * progressionResult.performedReps,
      userWeightAdjustment,
      perSetSuggestions: progressionResult.perSetSuggestions  // NEW: pass through per-set suggestions
    }

    // Add percentage-specific data if available
    if (progressionResult.engineUsed === "percentage" && progressionResult.additionalData) {
      adaptiveResult.targetVolume = progressionResult.additionalData.percentage ?
        (progressionResult.additionalData.oneRepMaxUsed || 0) * (progressionResult.additionalData.percentage / 100) * progressionResult.performedReps :
        adaptiveResult.targetVolume
    }

    return adaptiveResult
  }

  /**
   * Get current week sets from template
   */
  private static getCurrentWeekSets(exerciseTemplate: ExerciseTemplate, currentWeek: number): number {
    const weekKey = `week${currentWeek}`
    const weekData = exerciseTemplate.progressionTemplate[weekKey] || exerciseTemplate.progressionTemplate.week1
    return weekData?.sets || 3
  }

  /**
   * Format rep number to range string for backward compatibility
   */
  private static formatRepRange(reps: number | string): string {
    if (typeof reps === "number") {
      return `${reps}-${reps + 2}` // Convert single number to range
    }
    return reps
  }

  /**
   * Map router strategy to legacy strategy format
   */
  private static mapStrategy(strategy: ProgressionResult["strategy"]): AdaptiveProgressionResult["strategy"] {
    switch (strategy) {
      case "linear":
      case "percentage":
      case "hybrid":
        return "standard"
      case "deload":
        return "standard"
      case "out_of_bounds":
        return "out_of_bounds"
      case "volume_compensated":
        return "volume_compensated"
      case "multi_week":
        return "multi_week"
      case "estimated_1rm":
      case "no_1rm_data":
        return "standard"
      default:
        return "standard"
    }
  }
}
