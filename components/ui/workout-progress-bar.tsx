"use client"

import { cn } from "@/lib/utils"

interface WorkoutProgressBarProps {
  completedPercent: number
  skippedPercent?: number
  totalPercent?: number
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

/**
 * Reusable progress bar component for workout/program tracking
 * Displays completed (green), skipped (orange), and remaining (gray) segments
 *
 * Used in:
 * - Workout Logger (WorkoutHeader)
 * - Historical Program Viewer (Programs > History Tab)
 * - Program History Analytics (Analytics > Programs Tab)
 */
export function WorkoutProgressBar({
  completedPercent,
  skippedPercent = 0,
  totalPercent = 100,
  showLabel = true,
  size = "md",
  className,
}: WorkoutProgressBarProps) {
  // Ensure values don't exceed totalPercent
  const completed = Math.max(0, Math.min(totalPercent, completedPercent))
  const skipped = Math.max(0, Math.min(totalPercent - completed, skippedPercent))
  const remaining = Math.max(0, totalPercent - completed - skipped)

  const heightClass = {
    sm: "h-1",
    md: "h-1.5 sm:h-2",
    lg: "h-2 sm:h-3",
  }[size]

  return (
    <div className={cn("flex items-center gap-2 w-full", className)}>
      <div className={cn("relative flex-1 bg-muted rounded-full overflow-hidden", heightClass)}>
        {/* Completed portion (green) */}
        {completed > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0 bg-green-500 transition-all duration-300"
            style={{ width: `${completed}%` }}
            aria-label={`${completed}% completed`}
          />
        )}

        {/* Skipped portion (orange) */}
        {skipped > 0 && (
          <div
            className="absolute top-0 bottom-0 bg-orange-500 transition-all duration-300"
            style={{ left: `${completed}%`, width: `${skipped}%` }}
            aria-label={`${skipped}% skipped`}
          />
        )}

        {/* Remaining portion (gray) - implicit, no div needed */}
      </div>

      {showLabel && (
        <span className="text-[11px] sm:text-xs font-medium text-muted-foreground tabular-nums shrink-0">
          {Math.round(completed + skipped)}%
        </span>
      )}
    </div>
  )
}
