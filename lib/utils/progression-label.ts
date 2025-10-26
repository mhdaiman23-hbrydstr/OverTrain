/**
 * Progression Label Utilities
 * Helper functions for formatting and generating RIR/RPE labels.
 */

import { ProgressionConfigService } from '@/lib/services/progression-config-service'
import { ProgressionLabelValues, RpeRirDisplayMode } from '@/lib/types/progression'

/**
 * Get a formatted progression label for a week.
 *
 * @param blockLength - Total weeks in program (4-8)
 * @param weekNumber - Week number (1 to blockLength)
 * @param displayMode - Display preference: 'rir' | 'rpe' | 'off'
 * @returns Formatted label string: "RIR 3", "RPE 7.5", or ""
 */
export function getProgressionLabel(
  blockLength: 4 | 5 | 6 | 7 | 8,
  weekNumber: number,
  displayMode: RpeRirDisplayMode
): string {
  if (displayMode === 'off') return ''

  const config = ProgressionConfigService.getProgressionForWeek(blockLength, weekNumber)
  if (!config) return ''

  if (displayMode === 'rir') {
    return `RIR ${config.rir}`
  } else {
    return `RPE ${formatRpeValue(config.rpe)}`
  }
}

/**
 * Get progression label with both raw values and formatted label.
 * Useful for components that need flexibility in rendering.
 *
 * @param blockLength - Total weeks in program (4-8)
 * @param weekNumber - Week number (1 to blockLength)
 * @param displayMode - Display preference: 'rir' | 'rpe' | 'off'
 * @returns Object with label string and both raw values
 */
export function getProgressionLabelWithValues(
  blockLength: 4 | 5 | 6 | 7 | 8,
  weekNumber: number,
  displayMode: RpeRirDisplayMode
): ProgressionLabelValues {
  const config = ProgressionConfigService.getProgressionForWeek(blockLength, weekNumber)

  const label = getProgressionLabel(blockLength, weekNumber, displayMode)

  return {
    label,
    rir: config?.rir ?? null,
    rpe: config?.rpe ?? null
  }
}

/**
 * Format RPE value for display.
 * Handles both integers and decimals properly.
 *
 * @param rpe - RPE value (e.g., 7, 8.5, 9)
 * @returns Formatted string: "7", "8.5", "9"
 */
export function formatRpeValue(rpe: number): string {
  // If it's a whole number, return without decimals
  if (rpe % 1 === 0) {
    return rpe.toString()
  }
  // Otherwise, return with 1 decimal place
  return rpe.toFixed(1)
}

/**
 * Format RIR value for display (usually just returns string of integer).
 *
 * @param rir - RIR value (e.g., 0, 1, 2, 3, 8)
 * @returns Formatted string: "0", "1", "2", "3", "8"
 */
export function formatRirValue(rir: number): string {
  return rir.toString()
}

/**
 * Convert RIR to RPE (standard: RPE = 10 - RIR).
 * Note: We don't use this for our progression data since RPE is stored independently.
 * This is provided for reference/conversion only.
 *
 * @param rir - RIR value
 * @returns Approximate RPE value
 */
export function convertRirToRpe(rir: number): number {
  return 10 - rir
}

/**
 * Convert RPE to RIR (inverse of above).
 * Note: We don't use this for our progression data since RIR is stored independently.
 * This is provided for reference/conversion only.
 *
 * @param rpe - RPE value
 * @returns Approximate RIR value
 */
export function convertRpeToRir(rpe: number): number {
  return 10 - rpe
}

/**
 * Get a full week label with progression info.
 * Useful for calendar displays.
 *
 * @param weekNumber - Week number
 * @param blockLength - Total weeks
 * @param displayMode - Display preference
 * @returns Full label: "Week 1 · RIR 3" or "Week 1 · RPE 7" or "Week 1"
 */
export function getFullWeekLabel(
  weekNumber: number,
  blockLength: 4 | 5 | 6 | 7 | 8,
  displayMode: RpeRirDisplayMode
): string {
  const progressionLabel = getProgressionLabel(blockLength, weekNumber, displayMode)

  if (progressionLabel) {
    return `Week ${weekNumber} · ${progressionLabel}`
  } else {
    return `Week ${weekNumber}`
  }
}

/**
 * Get intensity description for a week (user-friendly).
 * Useful for tooltips or info text.
 *
 * @param blockLength - Total weeks
 * @param weekNumber - Week number
 * @returns Description: "Light", "Moderate", "Heavy", "Max Effort", "Deload"
 */
export function getIntensityDescription(
  blockLength: 4 | 5 | 6 | 7 | 8,
  weekNumber: number
): string {
  const config = ProgressionConfigService.getProgressionForWeek(blockLength, weekNumber)
  if (!config) return 'Unknown'

  // Deload week
  if (config.rir === 8) return 'Deload'

  // Based on RIR
  if (config.rir >= 3) return 'Light'
  if (config.rir === 2) return 'Moderate'
  if (config.rir === 1) return 'Heavy'
  if (config.rir === 0) return 'Max Effort'

  return 'Unknown'
}

/**
 * Get color class for intensity (for UI styling).
 * Returns Tailwind CSS class names.
 *
 * @param blockLength - Total weeks
 * @param weekNumber - Week number
 * @returns Tailwind class: 'text-green-500', 'text-yellow-500', 'text-red-500', etc.
 */
export function getIntensityColor(
  blockLength: 4 | 5 | 6 | 7 | 8,
  weekNumber: number
): string {
  const config = ProgressionConfigService.getProgressionForWeek(blockLength, weekNumber)
  if (!config) return 'text-gray-500'

  // Deload week
  if (config.rir === 8) return 'text-blue-500'

  // Based on RIR (higher RIR = lighter = green, lower = heavier = red)
  if (config.rir >= 3) return 'text-green-500'
  if (config.rir === 2) return 'text-yellow-500'
  if (config.rir === 1) return 'text-orange-500'
  if (config.rir === 0) return 'text-red-500'

  return 'text-gray-500'
}

/**
 * Check if a week is a deload week.
 *
 * @param blockLength - Total weeks
 * @param weekNumber - Week number
 * @returns true if week is deload (RIR 8)
 */
export function isDeloadWeek(blockLength: 4 | 5 | 6 | 7 | 8, weekNumber: number): boolean {
  const config = ProgressionConfigService.getProgressionForWeek(blockLength, weekNumber)
  return config?.rir === 8
}
