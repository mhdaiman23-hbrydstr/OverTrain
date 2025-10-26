'use client'

interface ExerciseCustomRpeBoxProps {
  exerciseName: string
  hasCustomRpe: boolean
  averageRpe?: number
  onOpen: () => void
}

/**
 * Exercise Custom RPE Box Component
 * Subtle badge indicator next to exercise name for recording custom RPE.
 *
 * Visual design (minimalist):
 * - Default (no RPE): Subtle grey dot indicator
 * - With RPE: Shows value in muted blue badge (8px font, minimal padding)
 * - Highly minimal to reduce visual clutter
 * - Hover state for discoverability
 */
export function ExerciseCustomRpeBox({
  exerciseName,
  hasCustomRpe,
  averageRpe,
  onOpen
}: ExerciseCustomRpeBoxProps) {
  if (!hasCustomRpe) {
    // When empty: show subtle dot indicator only
    return (
      <button
        onClick={onOpen}
        title={`Record custom RPE for ${exerciseName}`}
        className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-gray-600 hover:bg-gray-500 transition cursor-pointer"
      />
    )
  }

  // When filled: show minimal badge with value
  return (
    <button
      onClick={onOpen}
      title={`${averageRpe?.toFixed(1)} - Click to edit`}
      className="inline-flex items-center justify-center px-1.5 h-5 rounded text-xs font-normal bg-blue-500/20 text-blue-600 dark:bg-blue-500/30 dark:text-blue-400 hover:bg-blue-500/30 dark:hover:bg-blue-500/40 transition border border-blue-500/30 dark:border-blue-500/20"
    >
      {averageRpe?.toFixed(1)}
    </button>
  )
}
