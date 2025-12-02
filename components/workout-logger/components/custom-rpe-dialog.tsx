'use client'

import { useState } from 'react'
import { RpeRirDisplayMode } from '@/lib/types/progression'
import { Button } from '@/components/ui/button'

interface CustomRpeDialogProps {
  exerciseName: string
  targetSets: number
  displayMode: RpeRirDisplayMode
  blockLevelRpe?: number
  blockLevelRir?: number
  initialRpes?: { [setNumber: number]: number }
  onSave: (rpesBySet: { [setNumber: number]: number }) => Promise<void>
  isOpen: boolean
  onClose: () => void
}

/**
 * Custom RPE Dialog Component
 * Modal for logging per-set RPE values.
 *
 * Features:
 * - Input field for each set (1-10, supports decimals like 8.5)
 * - Optional block-level RPE/RIR display for reference
 * - Save/Cancel buttons
 * - Input validation (1-10 range)
 */
export function CustomRpeDialog({
  exerciseName,
  targetSets,
  displayMode,
  blockLevelRpe,
  blockLevelRir,
  initialRpes,
  onSave,
  isOpen,
  onClose
}: CustomRpeDialogProps) {
  const [rpeValues, setRpeValues] = useState<{ [key: number]: number }>(initialRpes || {})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSetRpe = (setNumber: number, value: string) => {
    if (value === '') {
      // Remove value
      const newValues = { ...rpeValues }
      delete newValues[setNumber]
      setRpeValues(newValues)
      return
    }

    const num = parseFloat(value)
    if (isNaN(num)) return

    // Validate range
    if (num < 1 || num > 10) {
      setError(`RPE must be between 1 and 10 (got ${num})`)
      return
    }

    setError(null)
    setRpeValues(prev => ({ ...prev, [setNumber]: num }))
  }

  const handleSave = async () => {
    setError(null)
    setIsLoading(true)
    try {
      await onSave(rpeValues)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save RPE')
    } finally {
      setIsLoading(false)
    }
  }

  const blockLevelLabel = blockLevelRpe
    ? `RPE ${blockLevelRpe.toFixed(1)}`
    : blockLevelRir
      ? `RIR ${blockLevelRir}`
      : null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg max-w-md w-full shadow-lg border border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">RPE by Set: {exerciseName}</h2>

        {blockLevelLabel && (
          <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">Block-level: </span>
            {blockLevelLabel}
          </div>
        )}

        <div className="space-y-3 mb-6">
          {Array.from({ length: targetSets }, (_, i) => i + 1).map((set) => (
            <div key={set} className="flex items-center gap-3">
              <label className="w-12 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Set {set}:
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="1"
                max="10"
                step="0.5"
                value={rpeValues[set] ?? ''}
                onChange={(e) => handleSetRpe(set, e.target.value)}
                placeholder="1-10"
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={isLoading}
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-500 rounded text-red-800 dark:text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isLoading || Object.keys(rpeValues).length === 0}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save RPE'}
          </Button>
          <Button
            onClick={onClose}
            disabled={isLoading}
            variant="outline"
            className="px-4"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
