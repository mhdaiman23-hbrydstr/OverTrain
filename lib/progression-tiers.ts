export type ProgressionTier = "large_compound" | "medium_compound" | "small_compound" | "large_isolation" | "small_isolation"

export interface TierRules {
  minIncrement: number // Minimum weight increase (in )
  weeklyIncrease: number // Weekly volume increase percentage (0.025 = 2.5%)
  adjustmentBounds: number // How much weight can vary from target (0.10 = 10%)
  maxRepAdjustment: number // Maximum reps that can be adjusted for volume compensation
}

export interface TieredProgression {
  tier: ProgressionTier
  rules: TierRules
  suggestedWeight: number
  suggestedReps: number
  bounds: {
    min: number
    max: number
  }
  strategy: "standard" | "volume_compensated" | "multi_week" | "out_of_bounds"
}

export const PROGRESSION_TIERS: Record<ProgressionTier, TierRules> = {
  large_compound: {
    minIncrement: 5,
    weeklyIncrease: 0.025, // 2.5%
    adjustmentBounds: 0.10, // 10%
    maxRepAdjustment: 2
  },
  medium_compound: {
    minIncrement: 2.5,
    weeklyIncrease: 0.025, // 2.5%
    adjustmentBounds: 0.10, // 10%
    maxRepAdjustment: 2
  },
  small_compound: {
    minIncrement: 2.5,
    weeklyIncrease: 0.02, // 2%
    adjustmentBounds: 0.12, // 12%
    maxRepAdjustment: 3
  },
  large_isolation: {
    minIncrement: 2.5,
    weeklyIncrease: 0.02, // 2%
    adjustmentBounds: 0.15, // 15%
    maxRepAdjustment: 3
  },
  small_isolation: {
    minIncrement: 1,
    weeklyIncrease: 0.015, // 1.5%
    adjustmentBounds: 0.20, // 20%
    maxRepAdjustment: 4
  }
}

/**
 * Determines the progression tier for an exercise based on its name and category
 */
export function getExerciseTier(exerciseName: string, category: "compound" | "isolation"): ProgressionTier {
  const name = exerciseName.toLowerCase()

  if (category === "compound") {
    // Large compound exercises (major muscle groups, high weight potential)
    if (name.includes("squat") || name.includes("deadlift") || name.includes("leg press")) {
      return "large_compound"
    }

    // Small compound exercises (bodyweight or limited weight progression)
    if (name.includes("pull-up") || name.includes("chin-up") || name.includes("dip")) {
      return "small_compound"
    }

    // All other compound exercises are medium
    return "medium_compound"
  }

  if (category === "isolation") {
    // Large isolation exercises (significant weight potential)
    if (name.includes("leg extension") || name.includes("leg curl") ||
        name.includes("rdl") || name.includes("romanian") || name.includes("glute")) {
      return "large_isolation"
    }

    // Small isolation exercises (limited weight progression)
    if (name.includes("curl") || name.includes("bicep") || name.includes("tricep") ||
        name.includes("lateral") || name.includes("raise") || name.includes("fly") ||
        name.includes("extension") || name.includes("calf") || name.includes("ab")) {
      return "small_isolation"
    }

    // Default isolation exercises are large
    return "large_isolation"
  }

  // Fallback
  return category === "compound" ? "medium_compound" : "small_isolation"
}

/**
 * Gets the tier rules for a given exercise
 */
export function getTierRules(exerciseName: string, category: "compound" | "isolation"): TierRules {
  const tier = getExerciseTier(exerciseName, category)
  return PROGRESSION_TIERS[tier]
}

/**
 * Rounds a weight to the nearest increment
 */
export function roundToIncrement(weight: number, increment: number): number {
  return Math.round(weight / increment) * increment
}

/**
 * Calculates safe weight bounds for an exercise
 */
export function calculateWeightBounds(baseWeight: number, adjustmentBounds: number): { min: number; max: number } {
  const min = baseWeight * (1 - adjustmentBounds)
  const max = baseWeight * (1 + adjustmentBounds)
  return { min, max }
}

/**
 * Determines if a weight is within acceptable bounds
 */
export function isWeightWithinBounds(weight: number, baseWeight: number, adjustmentBounds: number): boolean {
  const bounds = calculateWeightBounds(baseWeight, adjustmentBounds)
  return weight >= bounds.min && weight <= bounds.max
}

/**
 * Calculates volume compensation for weight adjustments
 */
export function calculateVolumeCompensation(
  targetVolume: number,
  userWeight: number,
  baselineReps: number,
  maxRepAdjustment: number
): { adjustedReps: number; strategy: "volume_compensated" | "multi_week"; message?: string } {
  if (!Number.isFinite(targetVolume) || !Number.isFinite(userWeight) || userWeight <= 0 || baselineReps <= 0) {
    return {
      adjustedReps: Math.max(1, Math.round(baselineReps)),
      strategy: "volume_compensated"
    }
  }

  const idealWeight = targetVolume / baselineReps
  const rawReps = targetVolume / userWeight
  const percentDiff = idealWeight === 0
    ? 0
    : ((userWeight - idealWeight) / idealWeight) * 100

  // One rep per ~2.5% load change, ignore micro-changes under ~1.5%
  const absPercentDiff = Math.abs(percentDiff)
  const repSteps = absPercentDiff < 1.5 ? 0 : Math.round(absPercentDiff / 2.5)

  if (repSteps === 0) {
    return {
      adjustedReps: Math.max(1, Math.round(rawReps)),
      strategy: "volume_compensated"
    }
  }

  const direction = percentDiff >= 0 ? -1 : 1 // Heavier load -> reduce reps, lighter load -> increase reps
  let adjustedReps = baselineReps + direction * repSteps
  const repDifference = Math.abs(adjustedReps - baselineReps)

  if (repDifference > maxRepAdjustment) {
    const limitedReps = baselineReps + direction * maxRepAdjustment
    return {
      adjustedReps: Math.max(1, limitedReps),
      strategy: "multi_week",
      message: `Weight adjustment too large. Consider progressing over multiple weeks.`
    }
  }

  return {
    adjustedReps: Math.max(1, adjustedReps),
    strategy: "volume_compensated"
  }
}

/**
 * Determines progression strategy based on user weight choice
 */
export function determineProgressionStrategy(
  userWeight: number,
  targetWeight: number,
  targetVolume: number,
  tierRules: TierRules
): {
  strategy: "standard" | "volume_compensated" | "multi_week" | "out_of_bounds"
  suggestedWeight?: number
  adjustedReps?: number
  bounds?: { min: number; max: number }
  message?: string
} {
  // Check if user weight is within acceptable bounds
  if (!isWeightWithinBounds(userWeight, targetWeight, tierRules.adjustmentBounds)) {
    return {
      strategy: "out_of_bounds",
      suggestedWeight: targetWeight,
      bounds: calculateWeightBounds(targetWeight, tierRules.adjustmentBounds),
      message: `Weight is outside acceptable range (${(tierRules.adjustmentBounds * 100).toFixed(0)}% deviation). Consider using ${roundToIncrement(targetWeight, tierRules.minIncrement)} .`
    }
  }

  // Calculate volume compensation
  const baselineReps = targetWeight > 0
    ? Math.max(1, Math.round(targetVolume / targetWeight))
    : 1
  const compensation = calculateVolumeCompensation(
    targetVolume,
    userWeight,
    baselineReps,
    tierRules.maxRepAdjustment
  )

  if (compensation.strategy === "multi_week") {
    return {
      strategy: "multi_week",
      suggestedWeight: roundToIncrement(targetWeight, tierRules.minIncrement),
      adjustedReps: compensation.adjustedReps,
      bounds: calculateWeightBounds(targetWeight, tierRules.adjustmentBounds),
      message: compensation.message
    }
  }

  if (compensation.adjustedReps !== baselineReps) {
    return {
      strategy: "volume_compensated",
      suggestedWeight: userWeight,
      adjustedReps: compensation.adjustedReps,
      bounds: calculateWeightBounds(targetWeight, tierRules.adjustmentBounds)
    }
  }

  return {
    strategy: "standard",
    suggestedWeight: userWeight
  }
}

// Export common exercise groupings for easy reference
export const EXERCISE_GROUPS = {
  largeCompound: ["squat", "deadlift", "leg press"],
  smallCompound: ["pull-up", "chin-up", "dip"],
  mediumCompound: ["bench press", "overhead press", "barbell row", "incline press"],
  largeIsolation: ["leg extension", "leg curl", "rdl", "romanian", "glute"],
  smallIsolation: ["curl", "bicep", "tricep", "lateral", "raise", "fly", "extension", "calf", "ab"]
} as const
