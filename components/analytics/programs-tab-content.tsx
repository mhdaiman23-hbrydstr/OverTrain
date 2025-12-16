"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Target, Award, TrendingUp } from "lucide-react"
import { WorkoutLogger } from "@/lib/workout-logger"
import { ProgramHistoryPaginated } from "./program-history-paginated"

interface ProgramsTabContentProps {
  // This component uses internal state from app
  [key: string]: never
}

export function ProgramsTabContent({}: ProgramsTabContentProps) {
  const programHistory = useMemo(() => {
    // Get program history from localStorage
    try {
      const history = localStorage.getItem("liftlog_program_history")
      return history ? JSON.parse(history) : []
    } catch {
      return []
    }
  }, [])

  const stats = useMemo(() => {
    const allWorkouts = WorkoutLogger.getWorkoutHistory()
    const completedWorkouts = allWorkouts.filter(w => w.completed)

    const totalVolume = completedWorkouts.reduce((sum, w) =>
      sum + w.exercises.reduce((exSum, ex) =>
        exSum + ex.sets.filter(s => s.completed).reduce((setSum, set) =>
          setSum + set.weight * set.reps, 0), 0), 0)

    const avgDuration = completedWorkouts.length > 0
      ? Math.round(completedWorkouts.reduce((sum, w) =>
          sum + (w.endTime ? (w.endTime - w.startTime) / (1000 * 60) : 0), 0) /
        completedWorkouts.length)
      : 0

    return {
      programsCompleted: programHistory?.length || 0,
      totalWorkouts: completedWorkouts.length,
      totalVolume,
      avgDuration,
      avgCompletion: programHistory.length > 0
        ? Math.round(programHistory.reduce((sum: number, p: any) => sum + (p.completionRate || 0), 0) / programHistory.length)
        : 0
    }
  }, [programHistory])

  const formatVolume = (volume: number): string => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k kg`
    }
    return `${Math.round(volume)} kg`
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Program Statistics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Programs Completed</span>
            </div>
            <div className="text-3xl font-bold">{stats.programsCompleted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Avg Completion</span>
            </div>
            <div className="text-3xl font-bold">{stats.avgCompletion}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overall Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Total Workouts</span>
              <span className="font-medium">{stats.totalWorkouts}</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Total Volume</span>
              <span className="font-medium">{formatVolume(stats.totalVolume)}</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Avg Duration</span>
              <span className="font-medium">{stats.avgDuration} minutes</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Program History with Pagination */}
      {programHistory.length > 0 && (
        <ProgramHistoryPaginated programHistory={programHistory} formatVolume={formatVolume} />
      )}

      {programHistory.length === 0 && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="font-semibold text-muted-foreground mb-1">No programs completed yet</h3>
              <p className="text-sm text-muted-foreground">
                Start a program from the Programs tab to see your progress here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
