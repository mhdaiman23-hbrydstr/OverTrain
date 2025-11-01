"use client"

import { ExerciseStatsCard } from "./exercise-stats-card"
import type { ExerciseStats } from "@/lib/analytics"

interface ExercisesGridProps {
  exercises: ExerciseStats[]
}

export function ExercisesGrid({ exercises }: ExercisesGridProps) {
  if (exercises.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No exercise data available</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {exercises.map((exercise) => (
        <ExerciseStatsCard key={exercise.exerciseId} exercise={exercise} />
      ))}
    </div>
  )
}
