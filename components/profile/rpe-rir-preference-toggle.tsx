'use client'

import { useState } from 'react'
import { RpeRirDisplayMode } from '@/lib/types/progression'
import { Button } from '@/components/ui/button'

interface RpeRirPreferenceToggleProps {
  currentMode: RpeRirDisplayMode
  onSave: (mode: RpeRirDisplayMode) => Promise<void>
}

/**
 * RIR/RPE Preference Toggle Component
 * Allows user to choose display preference in profile settings.
 *
 * Options:
 * - RIR (Reps in Reserve) - shows how many reps could be done in reserve
 * - RPE (Rate of Perceived Exertion) - shows perceived effort on 1-10 scale
 * - Off - no intensity labels shown
 */
export function RpeRirPreferenceToggle({
  currentMode,
  onSave
}: RpeRirPreferenceToggleProps) {
  const [mode, setMode] = useState<RpeRirDisplayMode>(currentMode)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    if (mode === currentMode) return

    setError(null)
    setSuccess(false)
    setIsLoading(true)
    try {
      await onSave(mode)
      setSuccess(true)
      // Clear success message after 2 seconds
      setTimeout(() => setSuccess(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preference')
    } finally {
      setIsLoading(false)
    }
  }

  const options: Array<{
    value: RpeRirDisplayMode
    label: string
    description: string
  }> = [
    {
      value: 'rir',
      label: 'Show RIR (Reps in Reserve)',
      description: 'Display how many reps you could have done (0-8)'
    },
    {
      value: 'rpe',
      label: 'Show RPE (Rate of Perceived Exertion)',
      description: 'Display perceived effort level (1-10)'
    },
    {
      value: 'off',
      label: 'Off',
      description: 'No intensity labels shown'
    }
  ]

  return (
    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
      <h3 className="text-lg font-semibold mb-2 text-white">Intensity Display</h3>
      <p className="text-sm text-gray-400 mb-4">
        Choose how you'd like to see exercise intensity in your workouts
      </p>

      <div className="space-y-3 mb-6">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-start gap-3 p-3 rounded border border-gray-700 hover:border-gray-600 cursor-pointer transition"
          >
            <input
              type="radio"
              name="intensity-display"
              value={option.value}
              checked={mode === option.value}
              onChange={() => setMode(option.value)}
              disabled={isLoading}
              className="w-4 h-4 mt-0.5 accent-blue-500"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{option.label}</p>
              <p className="text-xs text-gray-400 mt-1">{option.description}</p>
            </div>
          </label>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-200 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-500 rounded text-green-200 text-sm">
          Preference saved successfully!
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={isLoading || mode === currentMode}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : 'Save Preference'}
      </Button>
    </div>
  )
}
