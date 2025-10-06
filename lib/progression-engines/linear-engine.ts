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
  }
  tierRules: TierRules
  userWeightAdjustment?: number
}

export interface LinearProgressionResult {
  targetWeight: number
  targetReps: number
  adjustedReps?: number
  bounds?: { min: number; max: number }
  strategy: "standard" | "volume_compensated" | "multi_week" | "out_of_bounds" | "deload"
  progressionNote: string
  weeklyIncrease: number
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
      const targetReps = this.parseRepRange(targetRepRange)

      return {
        targetWeight: 0, // User will enter starting weight
        targetReps,
        strategy: "standard",
        progressionNote: "Enter your starting weight",
        weeklyIncrease: tierRules.weeklyIncrease
      }
    }

    const { lastWeight, actualReps, completedSets, targetSets, allSetsCompleted } = previousPerformance

    // Use the exact reps the user did last week (no template, no averaging)
    const targetReps = actualReps

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
      progressionNote = `User selected ${userWeightAdjustment}lbs`

      // Validate user weight and calculate compensation if needed
      const compensationResult = this.validateAndAdjust(
        userWeightAdjustment,
        targetVolume,
        targetReps,
        tierRules
      )

      if (compensationResult.adjustedReps !== targetReps) {
        adjustedReps = compensationResult.adjustedReps
        strategy = compensationResult.strategy
        bounds = compensationResult.bounds
        progressionNote += ` (${compensationResult.note})`
      }
    } else {
      // Simple user-driven progression system:
      // 1. +2.5 lbs if completed all assigned sets (ignore rep targets)
      // 2. Same weight if partial completion
      
      if (allSetsCompleted) {
        // User completed all assigned sets - increase weight by 2.5 lbs
        targetWeight = roundToIncrement(lastWeight + 2.5, 2.5)
        progressionNote = `+2.5lbs (all sets completed)`
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

    return {
      targetWeight,
      targetReps,
      adjustedReps,
      bounds,
      strategy,
      progressionNote,
      weeklyIncrease: tierRules.weeklyIncrease
    }
  }

  /**
   * Calculate deload week progression
   */
  private static calculateDeload(input: LinearProgressionInput): LinearProgressionResult {
    const { exercise, currentWeek, previousPerformance, tierRules } = input

    const referenceWeight = previousPerformance?.lastWeight || 0
    const deloadWeight = referenceWeight > 0 ? Math.round(referenceWeight * 0.8 / tierRules.minIncrement) * tierRules.minIncrement : 0

    return {
      targetWeight: deloadWeight,
      targetReps: 8, // Lighter reps for deload
      strategy: "deload",
      progressionNote: referenceWeight > 0 ? `Deload week (20% reduction from ${referenceWeight}lbs)` : "Deload week - use lighter weight",
      weeklyIncrease: tierRules.weeklyIncrease
    }
  }

  /**
   * Validate weight adjustment and calculate volume compensation if needed
   */
  private static validateAndAdjust(
    targetWeight: number,
    targetVolume: number,
    targetReps: number,
    tierRules: TierRules
  ): {
    adjustedReps: number
    strategy: LinearProgressionResult["strategy"]
    bounds?: { min: number; max: number }
    note: string
  } {
    const bounds = calculateWeightBounds(targetWeight, tierRules.adjustmentBounds)
    const idealWeight = targetVolume / targetReps

    // Check if weight is within acceptable bounds
    if (targetWeight < bounds.min || targetWeight > bounds.max) {
      return {
        adjustedReps: targetReps,
        strategy: "out_of_bounds",
        bounds,
        note: `Weight outside ${Math.round(tierRules.adjustmentBounds * 100)}% range. Consider ${roundToIncrement(idealWeight, tierRules.minIncrement)}lbs`
      }
    }

    // Calculate volume compensation
    const compensation = calculateVolumeCompensation(targetVolume, targetWeight, tierRules.maxRepAdjustment)

    if (compensation.strategy === "multi_week") {
      return {
        adjustedReps: compensation.adjustedReps,
        strategy: "multi_week",
        bounds,
        note: compensation.message || "Large adjustment - consider multi-week progression"
      }
    }

    if (compensation.adjustedReps !== targetReps) {
      return {
        adjustedReps: compensation.adjustedReps,
        strategy: "volume_compensated",
        bounds,
        note: `Volume compensated: ${compensation.adjustedReps} reps`
      }
    }

    return {
      adjustedReps: targetReps,
      strategy: "standard",
      note: ""
    }
  }

  /**
   * Check if current week is a deload week
   */
  private static isDeloadWeek(currentWeek: number, exercise: ExerciseTemplate): boolean {
    // Check template-specific deload week
    const templateWeeks = 6 // Default to 6 weeks
    return currentWeek === templateWeeks
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