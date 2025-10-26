/**
 * ProgressionConfigService
 * Manages RIR/RPE progression patterns for programs.
 * Patterns are stored independently (both RIR and RPE are lookupable).
 */

import { ProgressionWeekConfig, RirRpeProgression } from '@/lib/types/progression'

export class ProgressionConfigService {
  /**
   * Hardcoded default progression patterns for 1-8 week blocks.
   * - 1-3 weeks: Simple linear progression (no deload)
   * - 4-8 weeks: Standard periodized patterns
   */
  private static readonly DEFAULT_PATTERNS: Record<number, ProgressionWeekConfig[]> = {
    1: [
      { week: 1, rir: 0, rpe: 10 } // Max effort
    ],
    2: [
      { week: 1, rir: 2, rpe: 8 },
      { week: 2, rir: 0, rpe: 10 } // Max effort
    ],
    3: [
      { week: 1, rir: 3, rpe: 7 },
      { week: 2, rir: 1, rpe: 9 },
      { week: 3, rir: 0, rpe: 10 } // Max effort
    ],
    4: [
      { week: 1, rir: 2, rpe: 8 },
      { week: 2, rir: 1, rpe: 9 },
      { week: 3, rir: 0, rpe: 10 },
      { week: 4, rir: 8, rpe: 2 } // Deload
    ],
    5: [
      { week: 1, rir: 3, rpe: 7 },
      { week: 2, rir: 1, rpe: 9 },
      { week: 3, rir: 1, rpe: 9 },
      { week: 4, rir: 0, rpe: 10 },
      { week: 5, rir: 8, rpe: 2 } // Deload
    ],
    6: [
      { week: 1, rir: 3, rpe: 7 },
      { week: 2, rir: 3, rpe: 7 },
      { week: 3, rir: 2, rpe: 8 },
      { week: 4, rir: 1, rpe: 9 },
      { week: 5, rir: 0, rpe: 10 },
      { week: 6, rir: 8, rpe: 2 } // Deload
    ],
    7: [
      { week: 1, rir: 3, rpe: 7 },
      { week: 2, rir: 3, rpe: 7 },
      { week: 3, rir: 2, rpe: 8 },
      { week: 4, rir: 2, rpe: 8 },
      { week: 5, rir: 1, rpe: 9 },
      { week: 6, rir: 0, rpe: 10 },
      { week: 7, rir: 8, rpe: 2 } // Deload
    ],
    8: [
      { week: 1, rir: 3, rpe: 7 },
      { week: 2, rir: 3, rpe: 7 },
      { week: 3, rir: 2, rpe: 8 },
      { week: 4, rir: 2, rpe: 8 },
      { week: 5, rir: 1, rpe: 9 },
      { week: 6, rir: 1, rpe: 9 },
      { week: 7, rir: 0, rpe: 10 },
      { week: 8, rir: 8, rpe: 2 } // Deload
    ]
  }

  /**
   * In-memory cache for loaded progression patterns.
   * Key: `${templateId}:${blockLength}`
   */
  private static cache: Map<string, ProgressionWeekConfig[]> = new Map()

  /**
   * Get progression config for a specific week and block length.
   * Uses hardcoded defaults (no database lookup needed).
   *
   * @param blockLength - Total weeks in program (4-8)
   * @param weekNumber - Week number (1 to blockLength)
   * @returns ProgressionWeekConfig or null if not found
   */
  static getProgressionForWeek(
    blockLength: 4 | 5 | 6 | 7 | 8,
    weekNumber: number
  ): ProgressionWeekConfig | null {
    if (!this.isValidBlockLength(blockLength)) return null
    if (weekNumber < 1 || weekNumber > blockLength) return null

    const pattern = this.DEFAULT_PATTERNS[blockLength]
    return pattern.find(w => w.week === weekNumber) || null
  }

  /**
   * Get RIR value for a week.
   *
   * @param blockLength - Total weeks in program (4-8)
   * @param weekNumber - Week number (1 to blockLength)
   * @returns RIR value (0-8) or null if not found
   */
  static getRirForWeek(blockLength: 4 | 5 | 6 | 7 | 8, weekNumber: number): number | null {
    const config = this.getProgressionForWeek(blockLength, weekNumber)
    return config?.rir ?? null
  }

  /**
   * Get RPE value for a week.
   * Supports decimal values (8.5, 9.5, etc.)
   *
   * @param blockLength - Total weeks in program (4-8)
   * @param weekNumber - Week number (1 to blockLength)
   * @returns RPE value (1-10, may be decimal) or null if not found
   */
  static getRpeForWeek(blockLength: 4 | 5 | 6 | 7 | 8, weekNumber: number): number | null {
    const config = this.getProgressionForWeek(blockLength, weekNumber)
    return config?.rpe ?? null
  }

  /**
   * Get the complete progression pattern for a block length.
   *
   * @param blockLength - Total weeks in program (4-8)
   * @returns Complete RirRpeProgression with all weeks
   */
  static getProgressionPattern(blockLength: 4 | 5 | 6 | 7 | 8): RirRpeProgression {
    if (!this.isValidBlockLength(blockLength)) {
      throw new Error(`Invalid block length: ${blockLength}. Must be 4-8 weeks.`)
    }

    return {
      blockLength,
      weeks: this.DEFAULT_PATTERNS[blockLength]
    }
  }

  /**
   * Get the default progression pattern for a block length.
   * (Same as getProgressionPattern, but explicit naming)
   *
   * @param blockLength - Total weeks in program (4-8)
   * @returns RirRpeProgression with hardcoded defaults
   */
  static getDefaultProgressionPattern(blockLength: 4 | 5 | 6 | 7 | 8): RirRpeProgression {
    return this.getProgressionPattern(blockLength)
  }

  /**
   * Load progression pattern from database for a specific template.
   * Currently not implemented - returns null (uses hardcoded defaults).
   *
   * TODO: Implement database loading when custom progression configs are stored.
   *
   * @param templateId - Template UUID
   * @param blockLength - Total weeks in program (4-8)
   * @returns Database pattern or null to use defaults
   */
  static async loadProgressionPattern(
    templateId: string,
    blockLength: 4 | 5 | 6 | 7 | 8
  ): Promise<RirRpeProgression | null> {
    // TODO: Query database for custom progression config
    // return db.query(...)
    return null // Use defaults for now
  }

  /**
   * Sync progression pattern to database for a template.
   * Currently not implemented - no-op function.
   *
   * TODO: Implement when custom progression configs need to be saved.
   *
   * @param templateId - Template UUID
   * @param blockLength - Total weeks in program (4-8)
   * @param pattern - Progression week configs
   */
  static async syncProgressionPattern(
    templateId: string,
    blockLength: 4 | 5 | 6 | 7 | 8,
    pattern: ProgressionWeekConfig[]
  ): Promise<void> {
    // TODO: Save to database
    // await db.insert(...)
  }

  /**
   * Clear the in-memory cache.
   * Useful for testing or forcing refresh.
   */
  static clearCache(): void {
    this.cache.clear()
  }

  /**
   * Validate block length.
   *
   * @param blockLength - Number to validate
   * @returns true if valid (1-8)
   */
  private static isValidBlockLength(blockLength: any): boolean {
    return Number.isInteger(blockLength) && blockLength >= 1 && blockLength <= 8
  }
}
