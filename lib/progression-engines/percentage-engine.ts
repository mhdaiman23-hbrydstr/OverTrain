import type { ExerciseTemplate } from "../gym-templates"
import { roundToIncrement } from "../progression-tiers"

export interface OneRepMax {
  exerciseName: string
  maxWeight: number
  dateTested: Date
}

export interface PercentageRules {
  requiresOneRM: boolean
  percentageProgression: Record<string, { working: number[]; deload?: number[] }>
  estimatedRMTable?: Record<number, number> // Percentage to estimated 1RM multiplier
}

export interface PercentageProgressionInput {
  exercise: ExerciseTemplate
  currentWeek: number
  percentageRules: PercentageRules
  oneRepMaxes: OneRepMax[]
  userWeightAdjustment?: number
}

export interface PercentageProgressionResult {
  targetWeight: number
  templateRecommendedReps: number  // RENAMED: Template's recommended reps (display only, never used for calculations)
  percentage: number
  progressionNote: string
  strategy: "percentage" | "deload" | "estimated_1rm" | "no_1rm_data"
  oneRepMaxUsed?: number
  isEstimated?: boolean
}

export class PercentageProgressionEngine {
  // Default percentage progression for common programs
  private static DEFAULT_PERCENTAGE_PROGRESSION: PercentageRules = {
    requiresOneRM: true,
    percentageProgression: {
      week1: { working: [75, 80, 85] }, // Accumulation
      week2: { working: [77.5, 82.5, 87.5] },
      week3: { working: [80, 85, 90] }, // Intensification
      week4: { working: [70, 75, 80], deload: [60, 65, 70] }, // Deload
      week5: { working: [82.5, 87.5, 92.5] }, // Peak
      week6: { working: [85, 90, 95] } // Test week
    },
    estimatedRMTable: {
      95: 1.00,  // 95% ≈ 1RM
      90: 1.05,  // 90% ≈ 1.05RM
      85: 1.10,  // 85% ≈ 1.10RM
      80: 1.15,  // 80% ≈ 1.15RM
      77.5: 1.18, // 77.5% ≈ 1.18RM
      75: 1.20,  // 75% ≈ 1.20RM
      70: 1.25,  // 70% ≈ 1.25RM
      65: 1.30,  // 65% ≈ 1.30RM
      60: 1.35   // 60% ≈ 1.35RM
    }
  }

  /**
   * Calculate percentage-based progression for an exercise
   */
  static calculate(input: PercentageProgressionInput): PercentageProgressionResult {
    const { exercise, currentWeek, percentageRules, oneRepMaxes, userWeightAdjustment } = input

    console.log("[PercentageProgressionEngine] Calculating progression:", {
      exerciseName: exercise.exerciseName,
      currentWeek,
      has1RMData: oneRepMaxes.length > 0,
      userWeightAdjustment
    })

    // Get the most recent 1RM for this exercise
    const oneRepMax = this.findMostRecent1RM(exercise.exerciseName, oneRepMaxes)

    if (!oneRepMax && percentageRules.requiresOneRM) {
      return {
        targetWeight: 0,
        templateRecommendedReps: 8,
        percentage: 0,
        strategy: "no_1rm_data",
        progressionNote: "1RM data required for percentage-based progression",
        isEstimated: false
      }
    }

    // Get current week percentages
    const weekKey = `week${currentWeek}`
    const weekProgression = percentageRules.percentageProgression[weekKey] ||
                          this.DEFAULT_PERCENTAGE_PROGRESSION.percentageProgression[weekKey] ||
                          { working: [75, 80, 85] }

    // Determine if this is a deload week
    const isDeloadWeek = this.isDeloadWeek(currentWeek, exercise) || weekProgression.deload !== undefined
    const percentages = isDeloadWeek && weekProgression.deload ?
                       weekProgression.deload :
                       weekProgression.working

    // Use the highest working percentage for the target (last set of the day)
    const targetPercentage = percentages[percentages.length - 1] || 85

    // Get target reps based on percentage (inverse relationship)
    const templateRecommendedReps = this.getRepsForPercentage(targetPercentage)

    let targetWeight: number
    let progressionNote: string
    let strategy: PercentageProgressionResult["strategy"] = "percentage"

    if (userWeightAdjustment) {
      // User provided weight adjustment
      targetWeight = userWeightAdjustment
      const actualPercentage = oneRepMax ? Math.round((targetWeight / oneRepMax.maxWeight) * 100) : 0
      progressionNote = `User selected ${userWeightAdjustment} (${actualPercentage}% of 1RM)`
      strategy = "percentage"
    } else if (oneRepMax) {
      // Calculate from 1RM
      targetWeight = roundToIncrement((targetPercentage / 100) * oneRepMax.maxWeight, 2.5)
      progressionNote = `${targetPercentage}% of 1RM (${oneRepMax.maxWeight})`
      strategy = isDeloadWeek ? "deload" : "percentage"
    } else {
      // No 1RM data - estimate from previous performance or use default
      targetWeight = 0
      progressionNote = "Enter starting weight (1RM will be estimated)"
      strategy = "estimated_1rm"
    }

    return {
      targetWeight,
      templateRecommendedReps,
      percentage: targetPercentage,
      progressionNote,
      strategy,
      oneRepMaxUsed: oneRepMax?.maxWeight,
      isEstimated: !oneRepMax && percentageRules.requiresOneRM
    }
  }

  /**
   * Find the most recent 1RM for an exercise
   */
  private static findMostRecent1RM(exerciseName: string, oneRepMaxes: OneRepMax[]): OneRepMax | null {
    // Look for exact match first
    let exactMatch = oneRepMaxes.find(rm => rm.exerciseName === exerciseName)
    if (exactMatch) {
      return exactMatch
    }

    // Look for variations (e.g., "Barbell Bench Press" vs "Bench Press")
    const normalizedExercise = exerciseName.toLowerCase().replace(/barbell\s+/g, '').trim()
    const variationMatch = oneRepMaxes.find(rm =>
      rm.exerciseName.toLowerCase().replace(/barbell\s+/g, '').trim() === normalizedExercise
    )
    if (variationMatch) {
      return variationMatch
    }

    // Look for partial matches (e.g., "Squat" in "Barbell Back Squat")
    const partialMatch = oneRepMaxes.find(rm =>
      rm.exerciseName.toLowerCase().includes('squat') && exerciseName.toLowerCase().includes('squat') ||
      rm.exerciseName.toLowerCase().includes('bench') && exerciseName.toLowerCase().includes('bench') ||
      rm.exerciseName.toLowerCase().includes('deadlift') && exerciseName.toLowerCase().includes('deadlift')
    )
    return partialMatch || null
  }

  /**
   * Get target reps based on percentage (inverse relationship)
   */
  private static getRepsForPercentage(percentage: number): number {
    if (percentage >= 95) return 1
    if (percentage >= 92.5) return 2
    if (percentage >= 90) return 3
    if (percentage >= 87.5) return 4
    if (percentage >= 85) return 5
    if (percentage >= 82.5) return 6
    if (percentage >= 80) return 7
    if (percentage >= 77.5) return 8
    if (percentage >= 75) return 9
    if (percentage >= 70) return 10
    if (percentage >= 65) return 12
    if (percentage >= 60) return 15
    return 8 // Default
  }

  /**
   * Check if current week is a deload week
   */
  private static isDeloadWeek(currentWeek: number, exercise: ExerciseTemplate): boolean {
    const templateWeeks = exercise.weeks || 6
    return currentWeek === templateWeeks
  }

  /**
   * Estimate 1RM from a set of reps and weight
   */
  static estimateOneRepMax(weight: number, reps: number): number {
    // Use Epley formula for estimation
    // 1RM = weight × (1 + reps/30)
    const estimated = weight * (1 + reps / 30)
    return roundToIncrement(estimated, 2.5)
  }

  /**
   * Calculate training max from 1RM (typically 90% of true 1RM)
   */
  static calculateTrainingMax(oneRepMax: number, percentage: number = 90): number {
    return roundToIncrement((percentage / 100) * oneRepMax, 2.5)
  }

  /**
   * Generate percentage progression for a custom program
   */
  static generateCustomProgression(
    weeks: number,
    startPercentage: number = 75,
    endPercentage: number = 95,
    deloadWeek?: number
  ): PercentageRules {
    const percentageProgression: Record<string, { working: number[]; deload?: number[] }> = {}
    const weeklyIncrease = (endPercentage - startPercentage) / (weeks - 1)

    for (let week = 1; week <= weeks; week++) {
      const weekKey = `week${week}`

      if (deloadWeek && week === deloadWeek) {
        percentageProgression[weekKey] = {
          working: [startPercentage + (week - 1) * weeklyIncrease],
          deload: [60, 65, 70]
        }
      } else {
        const basePercentage = Math.min(startPercentage + (week - 1) * weeklyIncrease, endPercentage)
        percentageProgression[weekKey] = {
          working: [
            basePercentage - 5,
            basePercentage,
            basePercentage + 5
          ]
        }
      }
    }

    return {
      requiresOneRM: true,
      percentageProgression,
      estimatedRMTable: this.DEFAULT_PERCENTAGE_PROGRESSION.estimatedRMTable
    }
  }
}