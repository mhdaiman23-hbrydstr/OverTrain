import type { ProgressionOverride } from "./program-state"
import type { GymTemplate, ProgressionConfig } from "./gym-templates"

export interface ValidationResult {
  isValid: boolean
  warnings: string[]
  errors: string[]
  recommendations: string[]
}

export interface UserProfile {
  experience: "beginner" | "intermediate" | "advanced"
  gender: "male" | "female"
  age?: number
  weight?: number // in 
}

export class ProgressionValidator {
  /**
   * Validate progression override for safety and appropriateness
   */
  static validateOverride(
    override: ProgressionOverride,
    userProfile: UserProfile,
    template: GymTemplate
  ): ValidationResult {
    const warnings: string[] = []
    const errors: string[] = []
    const recommendations: string[] = []

    // Experience-based validation
    if (userProfile.experience === "beginner") {
      if (override.overrideType === "percentage") {
        errors.push("Percentage-based progression is not recommended for beginners")
        recommendations.push("Consider linear progression to build proper form and technique")
      }

      if (override.overrideType === "hybrid" && override.customRules?.hybrid?.compoundProgression === "percentage") {
        warnings.push("Percentage-based compound progression may be challenging for beginners")
        recommendations.push("Consider linear progression for compound exercises")
      }
    }

    // Age-based safety checks
    if (userProfile.age && userProfile.age < 18) {
      warnings.push("Progressive training for minors should be supervised by qualified professionals")
      recommendations.push("Focus on form and technique rather than heavy weights")
    }

    if (userProfile.age && userProfile.age > 65) {
      warnings.push("Older adults should consult healthcare providers before intense training")
      recommendations.push("Consider conservative progression and longer recovery periods")
    }

    // Validate custom rules
    if (override.customRules) {
      this.validateCustomRules(override.customRules, userProfile, warnings, errors, recommendations)
    }

    // Template compatibility checks
    this.validateTemplateCompatibility(override, template, warnings, errors)

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      recommendations
    }
  }

  /**
   * Validate custom progression rules
   */
  private static validateCustomRules(
    customRules: ProgressionOverride["customRules"] | undefined,
    userProfile: UserProfile,
    warnings: string[],
    errors: string[],
    recommendations: string[]
  ): void {
    if (!customRules) return

    const requiresOneRM = customRules.percentage?.requiresOneRM ?? false

    // Linear rules validation
    if (customRules.linear) {
      const { weeklyIncrease, minIncrement } = customRules.linear

      if (weeklyIncrease > 0.05) { // 5%
        warnings.push("Weekly increase of more than 5% may be too aggressive")
        recommendations.push("Consider 2-3% weekly increase for sustainable progress")
      }

      if (minIncrement > 10) {
        errors.push("Minimum increment of more than 10 may be unsafe")
        recommendations.push("Use smaller increments (2.5-5) for better control")
      }

      if (userProfile.experience === "beginner" && weeklyIncrease > 0.025) {
        warnings.push("Beginners should start with conservative weekly increases (2-2.5%)")
      }
    }

    // Percentage rules validation
    if (customRules.percentage) {
      const { requiresOneRM, percentageProgression } = customRules.percentage

      if (requiresOneRM && userProfile.experience === "beginner") {
        warnings.push("1RM-based training requires experience with proper form")
        recommendations.push("Build foundation with linear progression first")
      }

      // Check for dangerously high percentages
      Object.entries(percentageProgression).forEach(([week, data]) => {
        const maxPercentage = Math.max(...data.working)
        if (maxPercentage > 95) {
          errors.push(`Week ${week} has working percentages above 95% which is unsafe for progression`)
        }
        if (maxPercentage > 90 && userProfile.experience === "beginner") {
          warnings.push(`Week ${week} has high intensity percentages (${maxPercentage}%) for beginners`)
        }
      })

      // Check deload configuration
      Object.entries(percentageProgression).forEach(([week, data]) => {
        if (data.deload) {
          const maxDeloadPercentage = Math.max(...data.deload)
          if (maxDeloadPercentage > 80) {
            warnings.push(`Week ${week} deload percentages may be too high for recovery`)
          }
        }
      })
    }

    // Hybrid rules validation
    if (customRules.hybrid) {
      const { compoundProgression, accessoryProgression } = customRules.hybrid

      if (compoundProgression === "percentage" && userProfile.experience === "beginner") {
        warnings.push("Percentage-based compound progression is challenging for beginners")
        recommendations.push("Consider linear progression for compound exercises")
      }

      if (accessoryProgression === "percentage" && !requiresOneRM) {
        warnings.push("Percentage-based accessory progression without 1RM data may be inaccurate")
      }
    }
  }

  /**
   * Validate compatibility with template
   */
  private static validateTemplateCompatibility(
    override: ProgressionOverride,
    template: GymTemplate,
    warnings: string[],
    errors: string[]
  ): void {
    const templateProgression = template.progressionConfig?.type ||
                              (template.progressionScheme?.type === "periodized" ? "percentage" : "linear")

    // Warn about significant changes from template design
    if (templateProgression === "linear" && override.overrideType === "percentage") {
      warnings.push("Switching from linear template to percentage-based progression")
    }

    if (templateProgression === "percentage" && override.overrideType === "linear") {
      warnings.push("Switching from percentage template to linear progression")
    }

    // Check if override conflicts with template weeks
    if (template.weeks && override.customRules?.percentage?.percentageProgression) {
      const overrideWeeks = Object.keys(override.customRules.percentage.percentageProgression).length
      if (overrideWeeks !== template.weeks) {
        warnings.push(`Override has ${overrideWeeks} weeks but template is designed for ${template.weeks} weeks`)
      }
    }
  }

  /**
   * Validate 1RM input for safety
   */
  static validateOneRM(
    exerciseName: string,
    oneRM: number,
    userProfile: UserProfile
  ): ValidationResult {
    const warnings: string[] = []
    const errors: string[] = []
    const recommendations: string[] = []

    // Basic validation
    if (oneRM <= 0) {
      errors.push("1RM must be greater than 0")
    }

    if (oneRM < 10) {
      errors.push("1RM seems too low (less than 10)")
    }

    if (oneRM > 2000) {
      errors.push("1RM seems unrealistically high (more than 2000)")
    }

    // Exercise-specific validation
    const exerciseNameLower = exerciseName.toLowerCase()

    if (exerciseNameLower.includes("curl") || exerciseNameLower.includes("bicep")) {
      if (oneRM > 100) {
        warnings.push("High bicep curl 1RM - ensure proper form")
      }
    }

    if (exerciseNameLower.includes("lateral") || exerciseNameLower.includes("raise")) {
      if (oneRM > 50) {
        warnings.push("High lateral raise 1RM - risk of shoulder injury")
      }
    }

    if (exerciseNameLower.includes("squat") || exerciseNameLower.includes("deadlift")) {
      if (oneRM > 1000) {
        warnings.push("Very high squat/deadlift 1RM - ensure proper preparation and safety")
      }
    }

    // Experience-based validation
    if (userProfile.experience === "beginner") {
      if (exerciseNameLower.includes("squat") && oneRM > 315) {
        warnings.push("High squat 1RM for beginner - ensure proper form")
      }
      if (exerciseNameLower.includes("bench") && oneRM > 225) {
        warnings.push("High bench press 1RM for beginner - ensure proper form")
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      recommendations
    }
  }

  /**
   * Generate safety recommendations based on user profile
   */
  static generateSafetyRecommendations(userProfile: UserProfile): string[] {
    const recommendations: string[] = []

    if (userProfile.experience === "beginner") {
      recommendations.push("Start with conservative weights and focus on proper form")
      recommendations.push("Consider working with a qualified trainer initially")
      recommendations.push("Record your workouts to track progress consistently")
      recommendations.push("Don't sacrifice form for heavier weights")
    }

    if (userProfile.age && userProfile.age < 18) {
      recommendations.push("Ensure proper supervision during training")
      recommendations.push("Focus on technique and movement patterns")
      recommendations.push("Avoid maximal lifts until physical maturity")
    }

    if (userProfile.age && userProfile.age > 65) {
      recommendations.push("Allow adequate recovery between sessions")
      recommendations.push("Consider longer warm-up periods")
      recommendations.push("Listen to your body and adjust intensity as needed")
    }

    if (userProfile.weight && userProfile.weight < 120) {
      recommendations.push("Focus on gradual progression and proper nutrition")
    }

    recommendations.push("Stay hydrated and get adequate sleep for recovery")
    recommendations.push("Consider mobility work and proper warm-up routines")

    return recommendations
  }

  /**
   * Check if progression change requires confirmation
   */
  static requiresConfirmation(
    override: ProgressionOverride,
    userProfile: UserProfile
  ): { requires: boolean; reason: string } {
    if (userProfile.experience === "beginner" && override.overrideType === "percentage") {
      return {
        requires: true,
        reason: "Percentage-based progression is not typically recommended for beginners. Are you sure you want to continue?"
      }
    }

    const weeklyIncrease = override.customRules?.linear?.weeklyIncrease
    if (weeklyIncrease !== undefined && weeklyIncrease > 0.05) {
      return {
        requires: true,
        reason: "Weekly increase of more than 5% may be too aggressive and increase injury risk. Continue?"
      }
    }

    if (override.customRules?.percentage?.percentageProgression) {
      const hasHighIntensity = Object.values(override.customRules.percentage.percentageProgression)
        .some(week => Math.max(...week.working) > 90)

      if (hasHighIntensity && userProfile.experience !== "advanced") {
        return {
          requires: true,
          reason: "This program includes high-intensity training (>90% 1RM). This requires significant experience. Continue?"
        }
      }
    }

    return { requires: false, reason: "" }
  }
}
