import type { ExerciseTemplate } from "../gym-templates"
import type { TierRules } from "../progression-tiers"
import { roundToIncrement, calculateWeightBounds, calculateVolumeCompensation } from "../progression-tiers"

export interface LinearProgressionInput {
  exercise: ExerciseTemplate
  currentWeek: number
  previousPerformance?: {
    lastWeight: number
    actualReps: number
    completedSets: number
    targetSets: number
    allSetsCompleted: boolean
    setsData?: Array<{
      weight: number
      reps: number
      completed: boolean
    }>
  }
  tierRules: TierRules
  userWeightAdjustment?: number
}

export interface LinearProgressionResult {
  targetWeight: number
  templateRecommendedReps: number  // RENAMED: Template's recommended reps (display only, never used for calculations)
  adjustedReps?: number
  bounds?: { min: number; max: number }
  strategy: "standard" | "volume_compensated" | "multi_week" | "out_of_bounds" | "deload"
  progressionNote: string
  weeklyIncrease: number
  perSetSuggestions?: Array<{  // Week 2+: per-set weight and rep suggestions from previous performance
    weight: number
    reps: number
    baseWeight: number  // Original weight from previous week (for UI reference)
    baseReps: number    // Original reps from previous week (for UI reference)
    bounds: { min: number; max: number }  // Acceptable weight range for this set
  }>
}

export class LinearProgressionEngine {
  /**
   * Calculate linear progression for an exercise
   */
  static calculate(input: LinearProgressionInput): LinearProgressionResult {
    const { exercise, currentWeek, previousPerformance, tierRules, userWeightAdjustment } = input

    console.log("[LinearProgressionEngine] Calculating progression:", {
      exerciseName: exercise.exerciseName,
      currentWeek,
      hasPreviousData: !!previousPerformance,
      userWeightAdjustment
    })

    // Check if this is a deload week
    if (this.isDeloadWeek(currentWeek, exercise)) {
      return this.calculateDeload(input)
    }

    // Week 1 - no previous data
    if (currentWeek === 1 || !previousPerformance) {
      const weekData = exercise.progressionTemplate.week1
      const targetRepRange = weekData?.repRange || "8-10"
      const templateRecommendedReps = this.parseRepRange(targetRepRange)

      return {
        targetWeight: 0, // User will enter starting weight
        templateRecommendedReps,  // For display only, not used for calculations
        strategy: "standard",
        progressionNote: "Enter your starting weight",
        weeklyIncrease: tierRules.weeklyIncrease
      }
    }

    const { lastWeight, actualReps, completedSets, targetSets, allSetsCompleted } = previousPerformance

    // Use the exact reps the user did last week (no template, no averaging)
    const templateRecommendedReps = actualReps  // RENAMED: This is the actual reps from last week (for display only)

    // Calculate target volume with weekly increase
    const baseVolume = lastWeight * actualReps
    const targetVolume = baseVolume * (1 + tierRules.weeklyIncrease)

    // Calculate ideal weight progression
    let targetWeight: number
    let progressionNote: string
    let strategy: LinearProgressionResult["strategy"] = "standard"
    let adjustedReps: number | undefined
    let bounds: { min: number; max: number } | undefined

    if (userWeightAdjustment) {
      // User provided weight adjustment
      targetWeight = userWeightAdjustment
      progressionNote = `User selected ${userWeightAdjustment}`

      // Validate user weight and calculate compensation if needed
      const compensationResult = this.validateAndAdjust(
        userWeightAdjustment,
        targetVolume,
        templateRecommendedReps,
        tierRules
      )

      if (compensationResult.adjustedReps !== templateRecommendedReps) {
        adjustedReps = compensationResult.adjustedReps
        strategy = compensationResult.strategy
        bounds = compensationResult.bounds
        progressionNote += ` (${compensationResult.note})`
      }
    } else {
      // NEW: Percentage-based progression system (2.5% per set)
      // 1. +2.5% per set if completed all assigned sets
      // 2. Same weight if partial completion
      
      if (allSetsCompleted) {
        // User completed all assigned sets - increase weight by 2.5%
        targetWeight = roundToIncrement(lastWeight * 1.025, 2.5)
        progressionNote = `+2.5% (all sets completed)`
        strategy = "standard"
      } else {
        // User didn't complete all assigned sets - maintain weight
        targetWeight = lastWeight
        progressionNote = "Same weight (partial completion)"
        strategy = "standard"
      }

      // Use volume compensation if needed (for user weight adjustments)
      const compensationResult = this.validateAndAdjust(
        targetWeight,
        lastWeight * actualReps, // Use actual volume, not template-based
        actualReps, // Use actual user reps
        tierRules
      )

      if (compensationResult.adjustedReps !== actualReps) {
        adjustedReps = compensationResult.adjustedReps
        strategy = compensationResult.strategy
        bounds = compensationResult.bounds
        progressionNote += ` (Volume compensated: ${compensationResult.adjustedReps} reps)`
      }
    }

    // NEW: Generate per-set suggestions if we have per-set data from previous performance
    let perSetSuggestions: LinearProgressionResult["perSetSuggestions"]
    
    if (previousPerformance?.setsData && previousPerformance.setsData.length > 0) {
      perSetSuggestions = previousPerformance.setsData.map(setData => {
        // Apply 2.5% increase to each set's weight if all sets were completed
        const suggestedWeight = allSetsCompleted 
          ? roundToIncrement(setData.weight * 1.025, 2.5)
          : setData.weight
        
        // Calculate bounds for this specific set
        const setBounds = calculateWeightBounds(suggestedWeight, tierRules.adjustmentBounds)
        
        return {
          weight: suggestedWeight,
          reps: setData.reps, // Copy reps from previous week
          baseWeight: setData.weight,
          baseReps: setData.reps,
          bounds: setBounds
        }
      })
      
      console.log("[LinearProgressionEngine] Generated per-set suggestions with bounds:", perSetSuggestions)
    }

    return {
      targetWeight,
      templateRecommendedReps,
      adjustedReps,
      bounds,
      strategy,
      progressionNote,
      weeklyIncrease: tierRules.weeklyIncrease,
      perSetSuggestions
    }
  }

  /**
   * Calculate deload week progression
   * Reduces weight to 65% of previous week's heaviest weights per set
   */
  private static calculateDeload(input: LinearProgressionInput): LinearProgressionResult {
    const { exercise, currentWeek, previousPerformance, tierRules } = input

    console.log("[LinearProgressionEngine] Calculating DELOAD week:", {
      exerciseName: exercise.exerciseName,
      currentWeek,
      hasPreviousData: !!previousPerformance,
      previousSetsData: previousPerformance?.setsData?.length || 0
    })

    // Get current week template data for rep range
    const weekKey = `week${currentWeek}`
    const weekData = exercise.progressionTemplate[weekKey]
    const targetRepRange = weekData?.repRange || "8-10"
    const templateRecommendedReps = this.parseRepRange(targetRepRange)

    if (!previousPerformance) {
      return {
        targetWeight: 0,
        templateRecommendedReps,
        strategy: "deload",
        progressionNote: "Deload week - use lighter weight",
        weeklyIncrease: 0
      }
    }

    // Generate per-set deload suggestions (65% of each set's weight)
    let perSetSuggestions: LinearProgressionResult["perSetSuggestions"]
    let deloadWeight = 0

    if (previousPerformance.setsData && previousPerformance.setsData.length > 0) {
      // Per-set deload: 65% of each set's weight from previous week
      perSetSuggestions = previousPerformance.setsData.map(setData => {
        const deloadSetWeight = roundToIncrement(setData.weight * 0.65, 2.5)
        const setBounds = calculateWeightBounds(deloadSetWeight, tierRules.adjustmentBounds)
        return {
          weight: deloadSetWeight,
          reps: setData.reps, // Use actual reps from previous week
          baseWeight: setData.weight,
          baseReps: setData.reps,
          bounds: setBounds
        }
      })
      
      // Calculate average deload weight for display
      const totalDeloadWeight = perSetSuggestions.reduce((sum, set) => sum + set.weight, 0)
      deloadWeight = Math.round(totalDeloadWeight / perSetSuggestions.length)
      
      console.log("[LinearProgressionEngine] Generated per-set deload suggestions:", perSetSuggestions)
    } else {
      // Fallback: 65% of last weight
      deloadWeight = roundToIncrement(previousPerformance.lastWeight * 0.65, 2.5)
    }

    return {
      targetWeight: deloadWeight,
      templateRecommendedReps,
      strategy: "deload",
      progressionNote: `Deload week (65% reduction for recovery)`,
      weeklyIncrease: 0,
      perSetSuggestions
    }
  }

  /**
   * Validate weight adjustment and calculate volume compensation if needed
   */
  private static validateAndAdjust(
    targetWeight: number,
    targetVolume: number,
    templateRecommendedReps: number,
    tierRules: TierRules
  ): {
    adjustedReps: number
    strategy: LinearProgressionResult["strategy"]
    bounds?: { min: number; max: number }
    note: string
  } {
    const bounds = calculateWeightBounds(targetWeight, tierRules.adjustmentBounds)
    const idealWeight = targetVolume / templateRecommendedReps

    // Check if weight is within acceptable bounds
    if (targetWeight < bounds.min || targetWeight > bounds.max) {
      return {
        adjustedReps: templateRecommendedReps,
        strategy: "out_of_bounds",
        bounds,
        note: `Weight outside ${Math.round(tierRules.adjustmentBounds * 100)}% range. Consider ${roundToIncrement(idealWeight, tierRules.minIncrement)}`
      }
    }

    // Calculate volume compensation
    const compensation = calculateVolumeCompensation(
      targetVolume,
      targetWeight,
      templateRecommendedReps,
      tierRules.maxRepAdjustment
    )

    if (compensation.strategy === "multi_week") {
      return {
        adjustedReps: compensation.adjustedReps,
        strategy: "multi_week",
        bounds,
        note: compensation.message || "Large adjustment - consider multi-week progression"
      }
    }

    if (compensation.adjustedReps !== templateRecommendedReps) {
      return {
        adjustedReps: compensation.adjustedReps,
        strategy: "volume_compensated",
        bounds,
        note: `Volume compensated: ${compensation.adjustedReps} reps`
      }
    }

    return {
      adjustedReps: templateRecommendedReps,
      strategy: "standard",
      note: ""
    }
  }

  /**
   * Check if current week is a deload week
   * Now properly checks the template's intensity flag
   */
  private static isDeloadWeek(currentWeek: number, exercise: ExerciseTemplate): boolean {
    // Check if the current week has intensity: "deload" in the template
    const weekKey = `week${currentWeek}`
    const weekData = exercise.progressionTemplate[weekKey]
    return weekData?.intensity === "deload"
  }

  /**
   * Calculate adjusted reps when user manually changes weight from suggested value
   * Uses linear relationship: if weight increases by X%, reps decrease by X%
   * 
   * @param baseWeight - The suggested weight (from progression calculation)
   * @param newWeight - The weight user manually selected
   * @param baseReps - The suggested reps (from previous week)
   * @returns Adjusted rep count (minimum 1)
   */
  static calculateAdjustedReps(
    baseWeight: number,
    newWeight: number,
    baseReps: number
  ): number {
    if (baseWeight === 0 || baseWeight === newWeight) {
      return baseReps
    }

    // Calculate percentage change in weight
    const percentChange = ((newWeight - baseWeight) / baseWeight) * 100
    
    // Apply inverse percentage to reps (if weight goes up, reps go down)
    const repAdjustment = Math.round((baseReps * percentChange) / 100)
    const adjustedReps = baseReps - repAdjustment
    
    // Ensure minimum 1 rep
    return Math.max(1, adjustedReps)
  }

  /**
   * Parse rep range string to get target reps (uses middle of range)
   */
  private static parseRepRange(repRange: string): number {
    const parts = repRange.split("-")
    if (parts.length === 2) {
      const min = parseInt(parts[0])
      const max = parseInt(parts[1])
      return Math.round((min + max) / 2)
    }
    return parseInt(parts[0]) || 8
  }
}
