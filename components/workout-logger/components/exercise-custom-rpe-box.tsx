'use client'

interface ExerciseCustomRpeBoxProps {
  exerciseName: string
  hasCustomRpe: boolean
  averageRpe?: number
  onOpen: () => void
}

/**
 * Exercise Custom RPE Box Component
 * Small clickable box next to exercise name for recording custom RPE.
 *
 * Visual style:
 * - Default (no RPE): Grey background (bg-gray-700)
 * - With RPE: Blue background (bg-blue-600)
 * - Shows RPE value when filled, "RPE" text when empty
 * - Small size: w-12 h-8
 */
export function ExerciseCustomRpeBox({
  exerciseName,
  hasCustomRpe,
  averageRpe,
  onOpen
}: ExerciseCustomRpeBoxProps) {
  return (
    <button
      onClick={onOpen}
      title={`Record custom RPE for ${exerciseName}`}
      className={`w-12 h-8 rounded border font-semibold text-sm transition flex items-center justify-center ${
        hasCustomRpe
          ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-700'
          : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
      }`}
    >
      {hasCustomRpe && averageRpe ? (
        <span>{averageRpe.toFixed(1)}</span>
      ) : (
        <span className="text-xs">RPE</span>
      )}
    </button>
  )
}
