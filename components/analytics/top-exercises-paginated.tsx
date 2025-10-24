"use client"

import { useState, useMemo } from "react"
import { ExerciseStatsCard } from "./exercise-stats-card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
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
        <h3 className="font-semibold text-sm text-muted-foreground">
          Top Exercises
        </h3>
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
