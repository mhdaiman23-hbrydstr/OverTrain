"use client"

import { useState, useMemo } from "react"
import { ExerciseStatsCard } from "./exercise-stats-card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react"
import { MobileTooltip } from "@/components/ui/mobile-tooltip"
import type { ExerciseStats } from "@/lib/analytics"

interface TopExercisesPaginatedProps {
  topExercises: ExerciseStats[]
}

const ITEMS_PER_PAGE = 6

export function TopExercisesPaginated({ topExercises }: TopExercisesPaginatedProps) {
  const [expandedAll, setExpandedAll] = useState(false)

  const paginatedExercises = useMemo(() => {
    const itemsToShow = expandedAll ? topExercises.length : ITEMS_PER_PAGE
    return topExercises.slice(0, itemsToShow)
  }, [topExercises, expandedAll])

  const hasMore = topExercises.length > ITEMS_PER_PAGE
  const displayedCount = paginatedExercises.length
  const totalCount = topExercises.length

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-muted-foreground">
            Top Exercises
          </h3>
          <MobileTooltip
            content={
              <div className="space-y-1">
                <p className="font-semibold">How This List is Determined:</p>
                <p className="text-xs">
                  Exercises are ranked by total sets completed across all your workouts. The more frequently you train an exercise, the higher it appears in this list.
                </p>
                <p className="text-xs mt-2">
                  Use the search bar to find your best performance for any specific exercise.
                </p>
              </div>
            }
            side="bottom"
            className="max-w-sm"
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
          </MobileTooltip>
        </div>
        <div className="text-xs text-muted-foreground">
          {displayedCount} of {totalCount}
        </div>
      </div>
      <div className="space-y-3">
        {paginatedExercises.map((exercise) => (
          <ExerciseStatsCard key={exercise.exerciseId} exercise={exercise} />
        ))}
      </div>

      {hasMore && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpandedAll(!expandedAll)}
          className="w-full mt-4"
        >
          {expandedAll ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              View All {totalCount} Exercises
            </>
          )}
        </Button>
      )}
    </div>
  )
}
