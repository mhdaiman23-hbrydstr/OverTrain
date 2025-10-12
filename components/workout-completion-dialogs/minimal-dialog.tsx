"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trophy, TrendingUp, Calendar } from "lucide-react"
import type { WorkoutSession } from "@/lib/workout-logger"
import { getExerciseMuscleGroup } from "@/lib/exercise-muscle-groups"

interface MinimalWorkoutDialogProps {
  workout: WorkoutSession | null
  open: boolean
  onClose: () => void
  onViewMuscleGroupStats: () => void
  onStartNextWorkout?: () => void
}

export function MinimalWorkoutDialog({
  workout,
  open,
  onClose,
  onViewMuscleGroupStats,
  onStartNextWorkout,
}: MinimalWorkoutDialogProps) {
  const [showCelebration, setShowCelebration] = useState(false)

  useEffect(() => {
    if (open && workout) {
      setShowCelebration(true)
      const timer = setTimeout(() => setShowCelebration(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [open, workout])

  if (!workout || !workout.exercises) return null

  const getWorkoutStats = () => {
    let totalSets = 0
    let completedSets = 0
    let totalVolume = 0

    workout.exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        totalSets++
        if (set.completed && set.reps > 0) {
          completedSets++
          totalVolume += set.weight * set.reps
        }
      })
    })

    const completionRate = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0

    return {
      totalSets,
      completedSets,
      totalVolume,
      completionRate,
      exercises: workout.exercises.length,
    }
  }

  const stats = getWorkoutStats()

  const getCompletionMessage = () => {
    if (stats.completionRate >= 90) return "Perfect! 💯"
    if (stats.completionRate >= 75) return "Great! 🔥"
    if (stats.completionRate >= 50) return "Good! 👍"
    return "Done! ✅"
  }

  const handleNextWorkout = () => {
    onClose()
    onStartNextWorkout?.()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md mx-auto p-6 text-center">
        <DialogHeader className="space-y-4">
          <div className={`mx-auto ${showCelebration ? "animate-bounce" : ""}`}>
            <Trophy className="h-16 w-16 text-yellow-500 mx-auto" />
          </div>
          <DialogTitle className="text-2xl font-bold">Workout Complete</DialogTitle>
          <div className="text-3xl font-bold text-primary">
            {getCompletionMessage()}
          </div>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* Key Metrics Only */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.exercises}</div>
              <div className="text-sm text-muted-foreground">Exercises</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.completionRate}%</div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {stats.totalVolume >= 1000 ? `${(stats.totalVolume / 1000).toFixed(1)}k` : stats.totalVolume}
              </div>
              <div className="text-sm text-muted-foreground">Volume</div>
            </div>
          </div>

          {/* Simple Achievement */}
          {stats.completionRate === 100 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-lg font-semibold text-yellow-800">Perfect Workout!</div>
              <div className="text-sm text-yellow-600">You completed every set</div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button 
            variant="outline" 
            onClick={onViewMuscleGroupStats}
            className="w-full"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            View Details
          </Button>
          <Button onClick={handleNextWorkout} className="w-full">
            <Calendar className="h-4 w-4 mr-2" />
            Next Workout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
