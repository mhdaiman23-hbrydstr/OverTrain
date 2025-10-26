'use client'

import { useMemo } from 'react'
import { RpeRirDisplayMode } from '@/lib/types/progression'
import { getProgressionLabel } from '@/lib/utils/progression-label'

interface ProgressionLabelProps {
  blockLength: number
  weekNumber: number
  displayMode: RpeRirDisplayMode
}

/**
 * Progression Label Component
 * Displays RIR or RPE label next to week number in calendar modal.
 * Supports programs from 1-8 weeks.
 *
 * Example renders:
 * - "RIR 3"
 * - "RPE 7.5"
 * - null (if display mode is 'off' or block length is outside 1-8 range)
 */
export function ProgressionLabel({
  blockLength,
  weekNumber,
  displayMode
}: ProgressionLabelProps) {
  // Calculate label with memoization to avoid recalculating on every render
  const label = useMemo(() => {
    // Don't show label if display mode is 'off'
    if (displayMode === 'off') return ''

    // Validate blockLength is in valid range (1-8)
    if (!Number.isInteger(blockLength) || blockLength < 1 || blockLength > 8) {
      return ''
    }

    // Calculate the label
    try {
      const calculatedLabel = getProgressionLabel(
        blockLength as 4 | 5 | 6 | 7 | 8,  // Runtime supports 1-8, but type expects 4-8
        weekNumber,
        displayMode
      )
      return calculatedLabel
    } catch (error) {
      console.warn('[ProgressionLabel] Error calculating label:', error)
      return ''
    }
  }, [blockLength, weekNumber, displayMode])

  // Don't render anything if no label
  if (!label) return null

  return (
    <div className="text-xs font-mono text-gray-400 text-center w-full">
      {label}
    </div>
  )
}
