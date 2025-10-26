'use client'

import { useState, useEffect } from 'react'
import { RpeRirDisplayMode } from '@/lib/types/progression'
import { getProgressionLabel } from '@/lib/utils/progression-label'

interface ProgressionLabelProps {
  blockLength: 4 | 5 | 6 | 7 | 8
  weekNumber: number
  displayMode: RpeRirDisplayMode
}

/**
 * Progression Label Component
 * Displays RIR or RPE label next to week number in calendar modal.
 *
 * Example renders:
 * - "RIR 3"
 * - "RPE 7.5"
 * - "" (if display mode is 'off')
 */
export function ProgressionLabel({
  blockLength,
  weekNumber,
  displayMode
}: ProgressionLabelProps) {
  const [label, setLabel] = useState<string>('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const newLabel = getProgressionLabel(blockLength, weekNumber, displayMode)
    setLabel(newLabel)
  }, [blockLength, weekNumber, displayMode])

  // Avoid hydration mismatch
  if (!mounted) return null
  if (!label) return null

  return (
    <span className="text-xs font-mono text-gray-400 ml-2">
      · {label}
    </span>
  )
}
