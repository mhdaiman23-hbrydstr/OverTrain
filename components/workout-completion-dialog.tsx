"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Trophy, Clock, Target, TrendingUp, Calendar, Zap } from "lucide-react"
import type { WorkoutSession } from "@/lib/workout-logger"
import { ProgramStateManager } from "@/lib/program-state"
import { getExerciseMuscleGroup } from "@/lib/exercise-muscle-groups"

interface WorkoutCompletionDialogProps {
  workout: WorkoutSession | null
  open: boolean
  onClose: () => void
  onViewMuscleGroupStats: () => void
  onStartNextWorkout?: () => void
}

export function WorkoutCompletionDialog({
  workout,
  open,
  onClose,
  onViewMuscleGroupStats,
  onStartNextWorkout,
}: WorkoutCompletionDialogProps) {
  const [showCelebration, setShowCelebration] = useState(false)

  useEffect(() => {
    if (open && workout) {
      setShowCelebration(true)
      const timer = setTimeout(() => setShowCelebration(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [open, workout])

  if (!workout || !workout.exercises) return null

  const getWorkoutStats = () => {
    let totalSets = 0
    let completedSets = 0
    let skippedSets = 0
    let totalVolume = 0
    let totalReps = 0
    const volumeByMuscleGroup: Record<string, number> = {}

    workout.exercises.forEach((exercise) => {
      const muscleGroup = getExerciseMuscleGroup(exercise.exerciseName)

      exercise.sets.forEach((set) => {
        totalSets++
        if (set.completed) {
          if (set.reps === 0 && set.weight === 0) {
            skippedSets++
          } else {
            completedSets++
            const setVolume = set.weight * set.reps
            totalVolume += setVolume
            totalReps += set.reps

            // Track volume by muscle group
            if (!volumeByMuscleGroup[muscleGroup]) {
              volumeByMuscleGroup[muscleGroup] = 0
            }
            volumeByMuscleGroup[muscleGroup] += setVolume
          }
        }
      })
    })

    const duration = workout.endTime ? Math.floor((workout.endTime - workout.startTime) / 1000 / 60) : 0
    const completionRate = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0

    return {
      totalSets,
      completedSets,
      skippedSets,
      totalVolume,
      totalReps,
      duration,
      completionRate,
      exercises: workout.exercises.length,
      volumeByMuscleGroup,
    }
  }

  const stats = getWorkoutStats()

  const getCompletionMessage = () => {
    if (stats.completionRate >= 90) return "Outstanding workout! 🔥"
    if (stats.completionRate >= 75) return "Great job! 💪"
    if (stats.completionRate >= 50) return "Good effort! 👍"
    return "Every workout counts! 💯"
  }

  const getCompletionColor = () => {
    if (stats.completionRate >= 90) return "text-green-600"
    if (stats.completionRate >= 75) return "text-blue-600"
    if (stats.completionRate >= 50) return "text-orange-600"
    return "text-purple-600"
  }

  const handleNextWorkout = () => {
    // The program state is now updated in page.tsx's handleWorkoutComplete

    // Close dialog and start next workout
    onClose()
    onStartNextWorkout?.()
  }

  const hasNextWorkout = () => {
    const activeProgram = ProgramStateManager.getActiveProgram()
    if (!activeProgram) return false

    // Check if we haven't completed all workouts yet
    return activeProgram.completedWorkouts < activeProgram.totalWorkouts
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4">
            {showCelebration ? (
              <div className="animate-bounce">
                <Trophy className="h-16 w-16 text-yellow-500 mx-auto" />
              </div>
            ) : (
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto" />
            )}
          </div>
          <DialogTitle className="text-2xl">Workout Complete!</DialogTitle>
          <DialogDescription className={`text-lg font-medium ${getCompletionColor()}`}>
            {getCompletionMessage()}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="text-xl font-bold">{stats.duration}m</div>
                  <div className="text-xs text-muted-foreground">Duration</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Target className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="text-xl font-bold">{stats.completionRate}%</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Breakdown */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3">Workout Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Sets Completed</span>
                    <span className="font-medium text-green-600">{stats.completedSets}</span>
                  </div>
                  {stats.skippedSets > 0 && (
                    <div className="flex justify-between">
                      <span>Sets Skipped</span>
                      <span className="font-medium text-orange-600">{stats.skippedSets}</span>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                <h4 className="font-semibold mb-3">Volume by Muscle Group</h4>
                <div className="space-y-2 text-sm">
                  {Object.entries(stats.volumeByMuscleGroup)
                    .sort(([, a], [, b]) => b - a)
                    .map(([muscleGroup, volume]) => (
                      <div key={muscleGroup} className="flex justify-between">
                        <span className="capitalize">{muscleGroup.toLowerCase()}</span>
                        <span className="font-medium">
                          {volume >= 1000 ? `${(volume / 1000).toFixed(1)}k` : Math.round(volume)} kg
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Achievement Badges */}
            <div className="flex flex-wrap gap-2 justify-center">
              {stats.completionRate === 100 && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Perfect Workout</Badge>
              )}
              {stats.duration >= 60 && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">Endurance Beast</Badge>
              )}
              {stats.totalVolume >= 5000 && (
                <Badge className="bg-purple-100 text-purple-800 border-purple-200">Volume King</Badge>
              )}
              {stats.exercises >= 7 && (
                <Badge className="bg-green-100 text-green-800 border-green-200">Exercise Variety</Badge>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col space-y-2">
          <Button variant="outline" onClick={onViewMuscleGroupStats} className="w-full bg-transparent">
            <TrendingUp className="h-4 w-4 mr-2" />
            View Muscle Group Stats
          </Button>
          {hasNextWorkout() ? (
            <Button onClick={handleNextWorkout} className="w-full gradient-primary text-primary-foreground">
              <Calendar className="h-4 w-4 mr-2" />
              Start Next Workout
            </Button>
          ) : (
            <>
              <Button onClick={onClose} className="w-full gradient-primary text-primary-foreground">
                <Trophy className="h-4 w-4 mr-2" />
                View Program Summary
              </Button>
              <Button onClick={onClose} variant="outline" className="w-full">
                <Zap className="h-4 w-4 mr-2" />
                Start New Program
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
