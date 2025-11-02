'use client'

interface ExerciseCustomRpeBoxProps {
  exerciseName: string
  hasCustomRpe: boolean
  averageRpe?: number
  onOpen: () => void
  disabled?: boolean
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
  onOpen,
  disabled = false
}: ExerciseCustomRpeBoxProps) {
  if (!hasCustomRpe) {
    // When empty: show subtle dot indicator only
    return (
      <button
        onClick={disabled ? undefined : onOpen}
        disabled={disabled}
        title={`Record custom RPE for ${exerciseName}`}
        className={`inline-flex items-center justify-center w-2 h-2 rounded-full bg-gray-600 transition ${
          disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-500 cursor-pointer"
        }`}
      />
    )
  }

  // When filled: show minimal badge with value
  return (
    <button
      onClick={disabled ? undefined : onOpen}
      disabled={disabled}
      title={`${averageRpe?.toFixed(1)} - Click to edit`}
      className={`inline-flex items-center justify-center px-1.5 h-5 rounded text-xs font-normal bg-blue-500/20 text-blue-600 dark:bg-blue-500/30 dark:text-blue-400 transition border border-blue-500/30 dark:border-blue-500/20 ${
        disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-blue-500/30 dark:hover:bg-blue-500/40 cursor-pointer"
      }`}
    >
      {averageRpe?.toFixed(1)}
    </button>
  )
}
