import { LinearProgressionEngine, type LinearProgressionInput, type LinearProgressionResult } from "./progression-engines/linear-engine"
import { PercentageProgressionEngine, type PercentageProgressionInput, type PercentageProgressionResult, type OneRepMax } from "./progression-engines/percentage-engine"
import { WorkoutLogger } from "./workout-logger"
import { getTierRules } from "./progression-tiers"
import { ProgressionTierResolver } from "./progression-tier-resolver"
import type { ExerciseTemplate, GymTemplate } from "./gym-templates"
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
    lastWeight: number // Legacy - keep for backward compatibility
    actualReps: number
    completedSets: number
    targetSets: number
    allSetsCompleted: boolean
    setsData?: Array<{  // New: per-set weight and rep tracking
      weight: number
      reps: number
      completed: boolean
    }>
  }
  userWeightAdjustment?: number
  oneRepMaxes?: OneRepMax[]
}

export interface ProgressionResult {
  targetWeight: number
  templateRecommendedReps: number  // RENAMED: Template's recommended reps (display only, never used for calculations)
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
  perSetSuggestions?: Array<{  // NEW: per-set weight and rep suggestions
    weight: number
    reps: number
    baseWeight: number
    baseReps: number
    bounds: { min: number; max: number }
  }>
}

export type ProgressionStrategy = "linear" | "percentage" | "hybrid"

interface ProgressionRegistryEntry {
  strategy: ProgressionStrategy
  note?: string
}

export interface ProgressionRoutingDecision {
  strategy: ProgressionStrategy
  source: "registry" | "template_config" | "template_scheme" | "default"
  note?: string
}

const PROGRESSION_REGISTRY: Record<string, ProgressionRegistryEntry> = {
  // Hypertrophy templates default to linear
  "fullbody-3day-beginner-male": { strategy: "linear" },
  "fullbody-3day-beginner-female": { strategy: "linear" },
  "upperlower-4day-intermediate-male": { strategy: "linear" },
  "ppl-6day-intermediate-male": { strategy: "hybrid", note: "Hybrid target example" },
}

export function resolveProgressionStrategy(
  template: GymTemplate | null | undefined,
  fallback: ProgressionStrategy = "linear"
): ProgressionRoutingDecision {
  if (!template) {
    return { strategy: fallback, source: "default" }
  }

  const registryEntry = PROGRESSION_REGISTRY[template.id]
  if (registryEntry) {
    return { strategy: registryEntry.strategy, source: "registry", note: registryEntry.note }
  }

  const configType = template.progressionConfig?.type
  if (configType) {
    return { strategy: configType, source: "template_config" }
  }

  const schemeType = template.progressionScheme?.type
  if (schemeType) {
    const normalized: ProgressionStrategy = schemeType === "periodized" ? "percentage" : "linear"
    return { strategy: normalized, source: "template_scheme" }
  }

  return { strategy: fallback, source: "default" }
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
   * NEW: Now async to support database tier resolution
   */
  static async calculateProgression(input: ProgressionInput): Promise<ProgressionResult> {
    const { exercise, activeProgram, currentWeek, userProfile, previousPerformance, userWeightAdjustment, oneRepMaxes = [] } = input

    const progressionDecision = resolveProgressionStrategy(activeProgram.template)
    console.log("[ProgressionRouter] Routing progression calculation:", {
      exerciseName: exercise.exerciseName,
      category: exercise.category,
      templateSchemeType: activeProgram.template.progressionScheme?.type || "linear",
      templateConfigType: activeProgram.template.progressionConfig?.type,
      resolvedStrategy: progressionDecision.strategy,
      strategySource: progressionDecision.source,
      registryNote: progressionDecision.note,
      userOverride: activeProgram.progressionOverride?.enabled,
      overrideType: activeProgram.progressionOverride?.overrideType,
      currentWeek,
      userProfile
    })
    // Check for user override first
    if (activeProgram.progressionOverride?.enabled) {
      return await this.handleOverride(input)
    }
    // Handle different progression strategies
    switch (progressionDecision.strategy) {
      case "percentage":
        return this.routeToPercentageEngine(input)
      case "hybrid":
        return await this.routeHybrid(input)
      case "linear":
      default:
        return await this.routeToLinearEngine(input)
    }
  }

  /**
   * Handle user-defined progression override
   */
  private static async handleOverride(input: ProgressionInput): Promise<ProgressionResult> {
    const { activeProgram } = input
    const override = activeProgram.progressionOverride!

    // Add safety checks for beginners
    if (input.userProfile.experience === "beginner" && override.overrideType === "percentage") {
      console.warn("[ProgressionRouter] Beginner user attempting percentage-based progression - applying safety restrictions")
      return await this.routeToLinearEngine(input, "Beginner safety: Using linear progression")
    }

    switch (override.overrideType) {
      case "percentage":
        return this.routeToPercentageEngine(input, override.customRules?.percentage)
      case "hybrid":
        return await this.routeHybrid(input, override.customRules?.hybrid)
      case "linear":
      default:
        return await this.routeToLinearEngine(input, undefined, override.customRules?.linear)
    }
  }

  /**
   * Route to linear progression engine
   * NEW: Uses ProgressionTierResolver for database-backed tier rules with fallback
   */
  private static async routeToLinearEngine(
    input: ProgressionInput,
    safetyNote?: string,
    customLinearRules?: { weeklyIncrease: number; minIncrement: number }
  ): Promise<ProgressionResult> {
    const { exercise, currentWeek, previousPerformance, userWeightAdjustment } = input

    // NEW: Resolve tier rules from database with fallback to heuristic
    let tierResolution
    let baseTierRules

    if (customLinearRules) {
      // If custom rules provided, use heuristic as base (skip DB lookup for performance)
      baseTierRules = getTierRules(exercise.exerciseName, exercise.category)
      console.log('[ProgressionRouter] Using custom linear rules, skipping DB tier lookup')
    } else {
      // Resolve tier from database or heuristic
      tierResolution = await ProgressionTierResolver.resolveTierRules(
        exercise.exerciseLibraryId,
        exercise.exerciseName,
        exercise.category
      )
      baseTierRules = tierResolution.tierRules

      console.log('[ProgressionRouter] Tier resolution:', {
        exerciseName: exercise.exerciseName,
        source: tierResolution.source,
        tierName: tierResolution.tierName,
        tierRules: tierResolution.tierRules
      })
    }

    // Apply custom rules if provided
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

    // Build progression note with tier source info
    let progressionNote = result.progressionNote
    if (tierResolution) {
      const tierSource = tierResolution.source === 'database' ? '🗄️ DB' : '🧮 Heuristic'
      const tierLabel = tierResolution.tierName ? ` [${tierResolution.tierName}]` : ''
      progressionNote = `${tierSource}${tierLabel}: ${progressionNote}`
    }
    if (safetyNote) {
      progressionNote = `${safetyNote} | ${progressionNote}`
    }

    return {
      targetWeight: result.targetWeight,
      templateRecommendedReps: result.templateRecommendedReps,
      targetSets,
      progressionNote,
      strategy: result.strategy,
      engineUsed: "linear",
      additionalData: {
        adjustedReps: result.adjustedReps,
        bounds: result.bounds,
        weeklyIncrease: result.weeklyIncrease,
        tier: tierResolution?.tierName || exercise.tier
      },
      perSetSuggestions: result.perSetSuggestions  // NEW: pass through per-set suggestions
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
      templateRecommendedReps: result.templateRecommendedReps,
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
  private static async routeHybrid(
    input: ProgressionInput,
    customHybridRules?: { compoundProgression: "linear" | "percentage"; accessoryProgression: "linear" | "percentage"; compoundExercises: string[] }
  ): Promise<ProgressionResult> {
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
        return await this.routeToLinearEngine(input)
      }
    } else {
      // Use accessory progression method
      if (hybridRules.accessoryProgression === "percentage") {
        return this.routeToPercentageEngine(input)
      } else {
        return await this.routeToLinearEngine(input)
      }
    }
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
          warnings.push("Minimum increment of more than 10 may be too large")
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

    // Only use history from the current active instance to guarantee a fresh
    // start when the user restarts the same template. Read the active program
    // synchronously from localStorage (same approach as WorkoutLogger).
    let instanceId: string | undefined
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('liftlog_active_program')
        const program = stored ? JSON.parse(stored) : null
        instanceId = program?.instanceId
      }
    } catch {
      // ignore parsing errors; fall back to no previous performance
    }

    const history = WorkoutLogger.getWorkoutHistory()
    
    console.log(`[ProgressionRouter] 🔍 getPreviousPerformance called:`, {
      exerciseId,
      exerciseName,
      currentWeek,
      currentDay,
      previousWeek,
      historyLength: history.length
    })
    
    // Filter for previous week's completed workouts within the current instance only
    let previousWeekWorkouts = history.filter(
      (w) => w.week === previousWeek && w.completed && (!!instanceId ? w.programInstanceId === instanceId : false)
    )

    // Fallback: if none found for the active instance, allow previous-week workouts regardless of instance
    if (previousWeekWorkouts.length === 0) {
      previousWeekWorkouts = history.filter((w) => w.week === previousWeek && w.completed)
      if (previousWeekWorkouts.length > 0) {
        console.log('[ProgressionRouter] No instance-matched history, falling back to any previous-week workout')
      }
    }

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
      (ex) =>
        ex.exerciseId === exerciseId ||
        ex.exerciseName === exerciseName ||
        ex.exerciseName?.toLowerCase() === exerciseName.toLowerCase()
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

    // NEW: Collect per-set data for percentage-based progression
    const setsData = completedSets.map(set => ({
      weight: set.weight,
      reps: set.reps,
      completed: set.completed
    }))

    const result = {
      lastWeight,
      actualReps, // Use actual user reps, not averaged
      completedSets: completedSets.length,
      targetSets: totalSetsAssigned,
      allSetsCompleted, // Based on set completion, not rep targets
      setsData // NEW: per-set tracking
    }
    
    console.log(`[ProgressionRouter] ✅ Returning previous performance:`, result)
    
    return result
  }
}
