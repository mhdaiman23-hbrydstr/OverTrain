import { LinearProgressionEngine, type LinearProgressionInput, type LinearProgressionResult } from "./progression-engines/linear-engine"
import { PercentageProgressionEngine, type PercentageProgressionInput, type PercentageProgressionResult, type OneRepMax } from "./progression-engines/percentage-engine"
import { WorkoutLogger } from "./workout-logger"
import { getTierRules } from "./progression-tiers"
import type { ExerciseTemplate } from "./gym-templates"
import type { ActiveProgram } from "./program-state"

export interface ProgressionInput {
  exercise: ExerciseTemplate
  activeProgram: ActiveProgram
  currentWeek: number
  userProfile: {
    experience: "beginner" | "intermediate" | "advanced"
    gender: "male" | "female"
  }
  previousPerformance?: {
    lastWeight: number
    actualReps: number
    completedSets: number
    targetSets: number
    allSetsCompleted: boolean
  }
  userWeightAdjustment?: number
  oneRepMaxes?: OneRepMax[]
}

export interface ProgressionResult {
  targetWeight: number
  targetReps: number
  targetSets?: number
  progressionNote: string
  strategy: "linear" | "percentage" | "hybrid" | "deload" | "standard" | "volume_compensated" | "multi_week" | "out_of_bounds" | "percentage" | "estimated_1rm" | "no_1rm_data"
  engineUsed: "linear" | "percentage"
  additionalData?: {
    percentage?: number
    adjustedReps?: number
    bounds?: { min: number; max: number }
    oneRepMaxUsed?: number
    isEstimated?: boolean
    weeklyIncrease?: number
    tier?: string
  }
}

export interface ProgressionOverride {
  enabled: boolean
  overrideType: "linear" | "percentage" | "hybrid"
  customRules?: {
    linear?: {
      weeklyIncrease: number
      minIncrement: number
    }
    percentage?: {
      requiresOneRM: boolean
      percentageProgression: Record<string, { working: number[]; deload?: number[] }>
    }
    hybrid?: {
      compoundProgression: "linear" | "percentage"
      accessoryProgression: "linear" | "percentage"
      compoundExercises: string[]
    }
  }
}

export class ProgressionRouter {
  /**
   * Route progression calculation to the appropriate engine based on template, user override, and exercise type
   */
  static calculateProgression(input: ProgressionInput): ProgressionResult {
    const { exercise, activeProgram, currentWeek, userProfile, previousPerformance, userWeightAdjustment, oneRepMaxes = [] } = input

    console.log("[ProgressionRouter] Routing progression calculation:", {
      exerciseName: exercise.exerciseName,
      category: exercise.category,
      templateType: activeProgram.template.progressionScheme?.type || "linear",
      userOverride: activeProgram.progressionOverride?.enabled,
      overrideType: activeProgram.progressionOverride?.overrideType,
      currentWeek,
      userProfile
    })

    // Check for user override first
    if (activeProgram.progressionOverride?.enabled) {
      return this.handleOverride(input)
    }

    // Get progression type from template
    const templateProgressionType = this.getTemplateProgressionType(activeProgram.template)

    // Handle different progression types
    switch (templateProgressionType) {
      case "percentage":
        return this.routeToPercentageEngine(input)
      case "hybrid":
        return this.routeHybrid(input)
      case "linear":
      default:
        return this.routeToLinearEngine(input)
    }
  }

  /**
   * Handle user-defined progression override
   */
  private static handleOverride(input: ProgressionInput): ProgressionResult {
    const { activeProgram } = input
    const override = activeProgram.progressionOverride!

    // Add safety checks for beginners
    if (input.userProfile.experience === "beginner" && override.overrideType === "percentage") {
      console.warn("[ProgressionRouter] Beginner user attempting percentage-based progression - applying safety restrictions")
      return this.routeToLinearEngine(input, "Beginner safety: Using linear progression")
    }

    switch (override.overrideType) {
      case "percentage":
        return this.routeToPercentageEngine(input, override.customRules?.percentage)
      case "hybrid":
        return this.routeHybrid(input, override.customRules?.hybrid)
      case "linear":
      default:
        return this.routeToLinearEngine(input, undefined, override.customRules?.linear)
    }
  }

  /**
   * Route to linear progression engine
   */
  private static routeToLinearEngine(
    input: ProgressionInput,
    safetyNote?: string,
    customLinearRules?: { weeklyIncrease: number; minIncrement: number }
  ): ProgressionResult {
    const { exercise, currentWeek, previousPerformance, userWeightAdjustment } = input

    // Get tier rules (modified by custom rules if provided)
    const baseTierRules = getTierRules(exercise.exerciseName, exercise.category)
    const tierRules = customLinearRules ? {
      ...baseTierRules,
      weeklyIncrease: customLinearRules.weeklyIncrease,
      minIncrement: customLinearRules.minIncrement
    } : baseTierRules

    const linearInput: LinearProgressionInput = {
      exercise,
      currentWeek,
      previousPerformance,
      tierRules,
      userWeightAdjustment
    }

    const result: LinearProgressionResult = LinearProgressionEngine.calculate(linearInput)

    // Get current week data for target sets
    const weekKey = `week${currentWeek}`
    const currentWeekData = exercise.progressionTemplate[weekKey] || exercise.progressionTemplate.week1
    const targetSets = currentWeekData?.sets || 3

    return {
      targetWeight: result.targetWeight,
      targetReps: result.targetReps,
      targetSets,
      progressionNote: safetyNote ? `${safetyNote} | ${result.progressionNote}` : result.progressionNote,
      strategy: result.strategy,
      engineUsed: "linear",
      additionalData: {
        adjustedReps: result.adjustedReps,
        bounds: result.bounds,
        weeklyIncrease: result.weeklyIncrease,
        tier: exercise.tier
      }
    }
  }

  /**
   * Route to percentage progression engine
   */
  private static routeToPercentageEngine(
    input: ProgressionInput,
    customPercentageRules?: { requiresOneRM: boolean; percentageProgression: Record<string, { working: number[]; deload?: number[] }> }
  ): ProgressionResult {
    const { exercise, currentWeek, userWeightAdjustment, oneRepMaxes } = input

    const percentageRules = customPercentageRules || {
      requiresOneRM: true,
      percentageProgression: PercentageProgressionEngine.generateCustomProgression(
        6, // Default 6 weeks
        75,
        95,
        6 // Last week is deload
      ).percentageProgression
    }

    const percentageInput: PercentageProgressionInput = {
      exercise,
      currentWeek,
      percentageRules,
      oneRepMaxes: oneRepMaxes || [],
      userWeightAdjustment
    }

    const result: PercentageProgressionResult = PercentageProgressionEngine.calculate(percentageInput)

    // Get current week data for target sets
    const weekKey = `week${currentWeek}`
    const currentWeekData = exercise.progressionTemplate[weekKey] || exercise.progressionTemplate.week1
    const targetSets = currentWeekData?.sets || 3

    return {
      targetWeight: result.targetWeight,
      targetReps: result.targetReps,
      targetSets,
      progressionNote: result.progressionNote,
      strategy: result.strategy,
      engineUsed: "percentage",
      additionalData: {
        percentage: result.percentage,
        oneRepMaxUsed: result.oneRepMaxUsed,
        isEstimated: result.isEstimated
      }
    }
  }

  /**
   * Route hybrid progression (linear for compounds, percentage for accessories or vice versa)
   */
  private static routeHybrid(
    input: ProgressionInput,
    customHybridRules?: { compoundProgression: "linear" | "percentage"; accessoryProgression: "linear" | "percentage"; compoundExercises: string[] }
  ): ProgressionResult {
    const { exercise } = input

    // Default hybrid rules: compounds use linear, accessories use percentage
    const hybridRules = customHybridRules || {
      compoundProgression: "linear" as const,
      accessoryProgression: "percentage" as const,
      compoundExercises: [
        "squat", "deadlift", "bench press", "overhead press", "barbell row",
        "pull-up", "chin-up", "dip"
      ]
    }

    const exerciseName = exercise.exerciseName.toLowerCase()
    const isCompoundExercise = hybridRules.compoundExercises.some(ex => exerciseName.includes(ex.toLowerCase()))

    if (isCompoundExercise) {
      // Use compound progression method
      if (hybridRules.compoundProgression === "percentage") {
        return this.routeToPercentageEngine(input)
      } else {
        return this.routeToLinearEngine(input)
      }
    } else {
      // Use accessory progression method
      if (hybridRules.accessoryProgression === "percentage") {
        return this.routeToPercentageEngine(input)
      } else {
        return this.routeToLinearEngine(input)
      }
    }
  }

  /**
   * Get progression type from template
   */
  private static getTemplateProgressionType(template: any): "linear" | "percentage" | "hybrid" {
    // Check for new progressionConfig structure
    if (template.progressionConfig) {
      return template.progressionConfig.type || "linear"
    }

    // Check for legacy progressionScheme structure
    if (template.progressionScheme) {
      if (template.progressionScheme.type === "periodized") {
        return "percentage"
      }
      return "linear"
    }

    // Default to linear
    return "linear"
  }

  /**
   * Validate progression override for safety
   */
  static validateOverride(
    override: ProgressionOverride,
    userProfile: { experience: "beginner" | "intermediate" | "advanced" }
  ): { isValid: boolean; warnings: string[]; errors: string[] } {
    const warnings: string[] = []
    const errors: string[] = []

    // Beginners shouldn't use percentage-based progression
    if (userProfile.experience === "beginner" && override.overrideType === "percentage") {
      errors.push("Percentage-based progression is not recommended for beginners")
    }

    // Validate custom rules
    if (override.customRules) {
      if (override.customRules.linear) {
        const { weeklyIncrease, minIncrement } = override.customRules.linear
        if (weeklyIncrease > 0.1) {
          warnings.push("Weekly increase of more than 10% may be too aggressive")
        }
        if (minIncrement > 10) {
          warnings.push("Minimum increment of more than 10lbs may be too large")
        }
      }

      if (override.customRules.percentage) {
        const { requiresOneRM, percentageProgression } = override.customRules.percentage
        if (requiresOneRM && userProfile.experience === "beginner") {
          warnings.push("1RM-based training requires experience with proper form")
        }

        // Check for dangerously high percentages
        Object.values(percentageProgression).forEach(week => {
          if (week.working.some(p => p > 95)) {
            errors.push("Working percentages above 95% are unsafe for progression")
          }
        })
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    }
  }

  /**
   * Get previous performance data for an exercise
   */
  static getPreviousPerformance(
    exerciseId: string,
    exerciseName: string,
    currentWeek: number,
    currentDay?: number
  ): ProgressionInput["previousPerformance"] | null {
    const previousWeek = currentWeek - 1
    const history = WorkoutLogger.getWorkoutHistory()
    
    console.log(`[ProgressionRouter] 🔍 getPreviousPerformance called:`, {
      exerciseId,
      exerciseName,
      currentWeek,
      currentDay,
      previousWeek,
      historyLength: history.length
    })
    
    // Filter for previous week's completed workouts
    let previousWeekWorkouts = history.filter(w => w.week === previousWeek && w.completed)

    console.log(`[ProgressionRouter] Found ${previousWeekWorkouts.length} workouts for Week ${previousWeek}`)
    
    if (previousWeekWorkouts.length === 0) {
      console.log(`[ProgressionRouter] ❌ No completed workouts found for Week ${previousWeek}`)
      return null
    }

    // If currentDay is provided, try to match the same day first (e.g., Week 3 Day 1 → Week 2 Day 1)
    let previousWorkout: typeof previousWeekWorkouts[0] | undefined
    
    if (currentDay) {
      const sameDayWorkouts = previousWeekWorkouts.filter(w => w.day === currentDay)
      
      if (sameDayWorkouts.length > 0) {
        // Prefer workouts with completed sets over empty/skipped workouts
        // Sort by start time descending to get the most recent
        sameDayWorkouts.sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
        
        // Find the most recent workout that has at least one exercise with completed sets
        previousWorkout = sameDayWorkouts.find(w => 
          w.exercises?.some(ex => 
            ex.sets?.some(s => s.completed && s.weight > 0 && s.reps > 0)
          )
        )
        
        // Fallback to most recent if none have completed sets
        if (!previousWorkout) {
          previousWorkout = sameDayWorkouts[0]
        }
      }
    }
    
    // Fallback: if no matching day, use the most recent workout from previous week
    if (!previousWorkout) {
      previousWeekWorkouts.sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
      previousWorkout = previousWeekWorkouts[0]
    }
    
    const hasCompletedSets = previousWorkout.exercises?.some(ex => 
      ex.sets?.some(s => s.completed && s.weight > 0 && s.reps > 0)
    )
    
    console.log(`[ProgressionRouter] Using workout: Week ${previousWorkout.week} Day ${previousWorkout.day}`, {
      workoutId: previousWorkout.id,
      matchedDay: currentDay && previousWorkout.day === currentDay ? 'YES' : 'NO (fallback)',
      hasCompletedSets,
      startTime: new Date(previousWorkout.startTime || 0).toLocaleString(),
      exerciseCount: previousWorkout.exercises.length,
      exerciseIds: previousWorkout.exercises.map(e => ({ id: e.exerciseId, name: e.exerciseName }))
    })
    
    const previousExercise = previousWorkout.exercises.find(
      (ex) => ex.exerciseId === exerciseId || ex.exerciseName === exerciseName
    )

    if (!previousExercise) {
      console.log(`[ProgressionRouter] ❌ Exercise not found in workout. Looking for:`, {
        exerciseId,
        exerciseName,
        availableExercises: previousWorkout.exercises.map(e => ({ id: e.exerciseId, name: e.exerciseName }))
      })
      return null
    }
    
    console.log(`[ProgressionRouter] ✅ Found exercise: ${previousExercise.exerciseName}`, {
      exerciseId: previousExercise.exerciseId,
      setsCount: previousExercise.sets?.length || 0
    })

    const completedSets = previousExercise.sets.filter((s) => s.completed && s.weight > 0 && s.reps > 0)
    if (completedSets.length === 0) {
      console.log(`[ProgressionRouter] ❌ No completed sets with valid weight/reps`)
      return null
    }

    const lastWeight = Math.max(...completedSets.map((s) => s.weight))
    
    // Use actual user reps from the heaviest set (no averaging, no template targets)
    const heaviestSet = completedSets.find(s => s.weight === lastWeight)
    const actualReps = heaviestSet?.reps || completedSets[0]?.reps || 8
    
    // Simple completion check: did user complete all assigned sets? (ignore rep targets)
    const totalSetsAssigned = previousExercise.targetSets || 3
    const allSetsCompleted = completedSets.length >= totalSetsAssigned

    const result = {
      lastWeight,
      actualReps, // Use actual user reps, not averaged
      completedSets: completedSets.length,
      targetSets: totalSetsAssigned,
      allSetsCompleted // Based on set completion, not rep targets
    }
    
    console.log(`[ProgressionRouter] ✅ Returning previous performance:`, result)
    
    return result
  }
}