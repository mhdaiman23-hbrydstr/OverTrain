'use client'

import { useState } from 'react'
import { RpeRirDisplayMode } from '@/lib/types/progression'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface RpeRirPreferenceToggleProps {
  currentMode: RpeRirDisplayMode
  onSave: (mode: RpeRirDisplayMode) => Promise<void>
}

/**
 * RIR/RPE Preference Toggle Component (Compact Dropdown)
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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    if (mode === currentMode) return

    setMessage(null)
    setIsLoading(true)
    try {
      await onSave(mode)
      setMessage({ type: 'success', text: 'Preference saved!' })
      setTimeout(() => setMessage(null), 2000)
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save preference'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getModeLabel = (value: RpeRirDisplayMode): string => {
    switch (value) {
      case 'rir':
        return 'RIR (Reps in Reserve) - 0-8 scale'
      case 'rpe':
        return 'RPE (Rate of Perceived Exertion) - 1-10 scale'
      case 'off':
        return 'Off - No labels'
      default:
        return value
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label htmlFor="intensity-select" className="text-sm font-medium mb-1.5 block text-foreground">
            Display Mode
          </label>
          <Select value={mode} onValueChange={(value) => setMode(value as RpeRirDisplayMode)} disabled={isLoading}>
            <SelectTrigger id="intensity-select" className="w-full overflow-hidden">
              <SelectValue placeholder="Select display mode" className="truncate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rir">RIR (Reps in Reserve) 0-8</SelectItem>
              <SelectItem value="rpe">RPE (Rate of Perceived Exertion) 1-10</SelectItem>
              <SelectItem value="off">Off - No labels</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleSave}
          disabled={isLoading || mode === currentMode}
          size="sm"
          className="whitespace-nowrap"
        >
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {message && (
        <div className={`text-sm p-2 rounded ${
          message.type === 'success'
            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
            : 'bg-red-500/10 text-red-600 dark:text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {getModeLabel(mode)}
      </p>
    </div>
  )
}
