/**
 * Progression Tier Resolver
 *
 * Resolves tier rules for exercises with smart fallback:
 * 1. First tries to fetch tier from database (if exerciseLibraryId exists)
 * 2. Falls back to heuristic-based tier selection if DB lookup fails
 * 3. Returns TierRules interface compatible with progression engines
 */

import { linearProgressionTierService } from './services/linear-progression-tier-service'
import { getTierRules, getExerciseTier } from './progression-tiers'
import type { TierRules } from './progression-tiers'

export interface TierResolutionResult {
  tierRules: TierRules
  source: 'database' | 'heuristic' | 'default'
  tierName?: string
  exerciseLibraryId?: string
}

export class ProgressionTierResolver {
  /**
   * Resolve tier rules for an exercise with smart fallback
   *
   * @param exerciseLibraryId - UUID from exercise_library table (if available)
   * @param exerciseName - Name of exercise (for heuristic fallback)
   * @param category - Category of exercise (for heuristic fallback)
   * @returns TierResolutionResult with rules and metadata
   */
  static async resolveTierRules(
    exerciseLibraryId: string | undefined | null,
    exerciseName: string,
    category: 'compound' | 'isolation'
  ): Promise<TierResolutionResult> {
    console.log(`[ProgressionTierResolver] Resolving tier for: ${exerciseName}`, {
      exerciseLibraryId,
      category,
      hasExerciseId: !!exerciseLibraryId
    })

    // Step 1: Try database lookup if exerciseLibraryId exists
    if (exerciseLibraryId) {
      try {
        const dbTierRules = await linearProgressionTierService.getTierRulesForExercise(exerciseLibraryId)

        if (dbTierRules) {
          // Success! Got tier from database
          const tierName = await linearProgressionTierService.getTierNameForExercise(exerciseLibraryId)

          console.log(`[ProgressionTierResolver] ✅ Resolved from DATABASE:`, {
            exerciseName,
            tierName,
            tierRules: dbTierRules
          })

          return {
            tierRules: dbTierRules,
            source: 'database',
            tierName: tierName || undefined,
            exerciseLibraryId
          }
        } else {
          console.log(`[ProgressionTierResolver] ⚠️ Exercise ${exerciseLibraryId} has no tier assigned in DB, falling back to heuristic`)
        }
      } catch (error) {
        console.error(`[ProgressionTierResolver] ❌ Database lookup failed, falling back to heuristic:`, error)
      }
    }

    // Step 2: Fallback to heuristic-based tier selection
    const tier = getExerciseTier(exerciseName, category)
    const heuristicRules = getTierRules(exerciseName, category)

    console.log(`[ProgressionTierResolver] ℹ️ Resolved from HEURISTIC:`, {
      exerciseName,
      tier,
      tierRules: heuristicRules
    })

    return {
      tierRules: heuristicRules,
      source: 'heuristic',
      tierName: tier,
      exerciseLibraryId: exerciseLibraryId || undefined
    }
  }

  /**
   * Batch resolve tier rules for multiple exercises
   * Useful for workout initialization
   */
  static async resolveTierRulesBatch(
    exercises: Array<{
      exerciseLibraryId?: string | null
      exerciseName: string
      category: 'compound' | 'isolation'
    }>
  ): Promise<Map<string, TierResolutionResult>> {
    const results = new Map<string, TierResolutionResult>()

    // Resolve all in parallel for performance
    const promises = exercises.map(async (ex) => {
      const result = await this.resolveTierRules(
        ex.exerciseLibraryId,
        ex.exerciseName,
        ex.category
      )
      return { key: ex.exerciseLibraryId || ex.exerciseName, result }
    })

    const resolvedResults = await Promise.all(promises)

    resolvedResults.forEach(({ key, result }) => {
      results.set(key, result)
    })

    console.log(`[ProgressionTierResolver] Batch resolved ${results.size} exercises`, {
      dbCount: Array.from(results.values()).filter(r => r.source === 'database').length,
      heuristicCount: Array.from(results.values()).filter(r => r.source === 'heuristic').length
    })

    return results
  }

  /**
   * Get summary of tier resolution for debugging
   */
  static async getTierSummary(exerciseLibraryId: string | null | undefined): Promise<string> {
    if (!exerciseLibraryId) {
      return 'No exercise ID - using heuristic'
    }

    try {
      const tierRules = await linearProgressionTierService.getTierRulesForExercise(exerciseLibraryId)
      if (tierRules) {
        const tierName = await linearProgressionTierService.getTierNameForExercise(exerciseLibraryId)
        return `DB: ${tierName || 'unknown'} (${tierRules.weeklyIncrease * 100}% weekly)`
      }
      return 'DB: No tier assigned - using heuristic'
    } catch (error) {
      return `DB: Error - using heuristic`
    }
  }

  /**
   * Validate that tier resolution is working correctly
   * Returns diagnostic information for troubleshooting
   */
  static async validateTierResolution(
    exerciseLibraryId: string,
    expectedTierName?: string
  ): Promise<{
    isValid: boolean
    actualTierName: string | null
    tierRules: TierRules | null
    message: string
  }> {
    try {
      const tierRules = await linearProgressionTierService.getTierRulesForExercise(exerciseLibraryId)
      const tierName = await linearProgressionTierService.getTierNameForExercise(exerciseLibraryId)

      if (!tierRules) {
        return {
          isValid: false,
          actualTierName: null,
          tierRules: null,
          message: 'Exercise has no tier assigned in database'
        }
      }

      if (expectedTierName && tierName !== expectedTierName) {
        return {
          isValid: false,
          actualTierName: tierName,
          tierRules,
          message: `Tier mismatch: expected ${expectedTierName}, got ${tierName}`
        }
      }

      return {
        isValid: true,
        actualTierName: tierName,
        tierRules,
        message: 'Tier resolution successful'
      }
    } catch (error) {
      return {
        isValid: false,
        actualTierName: null,
        tierRules: null,
        message: `Validation failed: ${error}`
      }
    }
  }
}
