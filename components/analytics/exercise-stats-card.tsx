"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ExerciseStats } from "@/lib/analytics"

interface ExerciseStatsCardProps {
  exercise: ExerciseStats
}

export function ExerciseStatsCard({ exercise }: ExerciseStatsCardProps) {
  const getTrendIcon = () => {
    switch (exercise.progressTrend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  const getTrendColor = () => {
    switch (exercise.progressTrend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-sm text-foreground">
              {exercise.exerciseName}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Last: {exercise.lastPerformed}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className={cn("text-xs font-medium", getTrendColor())}>
              {exercise.progressTrend === 'up' && 'Progressing'}
              {exercise.progressTrend === 'down' && 'Declining'}
              {exercise.progressTrend === 'stable' && 'Stable'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="p-2 bg-muted/30 rounded">
            <div className="text-xs text-muted-foreground">Max Weight</div>
            <div className="font-semibold text-sm">{exercise.maxWeight.toFixed(1)} kg</div>
          </div>
          <div className="p-2 bg-muted/30 rounded">
            <div className="text-xs text-muted-foreground">Avg Weight</div>
            <div className="font-semibold text-sm">{exercise.averageWeight.toFixed(1)} kg</div>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <Badge variant="secondary" className="text-xs">
            {exercise.totalSets} sets
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {exercise.frequency.toFixed(1)}x/month
          </Badge>
        </div>

        {exercise.bestSet.weight > 0 && (
          <div className="p-2 bg-primary/10 rounded-lg text-xs">
            <div className="text-muted-foreground">Best Set</div>
            <div className="font-medium text-foreground">
              {exercise.bestSet.weight}kg × {exercise.bestSet.reps} reps ({exercise.bestSet.date})
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
