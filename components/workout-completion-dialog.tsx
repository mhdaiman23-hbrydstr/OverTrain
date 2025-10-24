"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Trophy, Target, TrendingUp, Calendar, Zap } from "lucide-react"
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
  const [hasNext, setHasNext] = useState(false)

  useEffect(() => {
    if (open && workout) {
      setShowCelebration(true)
      const timer = setTimeout(() => setShowCelebration(false), 2000)
      
      // Check if there's a next workout
      hasNextWorkout().then(setHasNext)
      
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

    const completionRate = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0

    return {
      totalSets,
      completedSets,
      skippedSets,
      totalVolume,
      totalReps,
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

  const handleViewProgramSummary = () => {
    // For now, just close the dialog
    // TODO: Implement program summary view
    onClose()
  }

  const handleStartNewProgram = () => {
    // Clear the active program and close dialog
    ProgramStateManager.clearActiveProgram()
    onClose()
    // TODO: Navigate to program selection
  }

  const hasNextWorkout = async () => {
    const activeProgram = await ProgramStateManager.getActiveProgram()
    if (!activeProgram) return false

    // Check if we haven't completed all workouts yet
    return activeProgram.completedWorkouts < activeProgram.totalWorkouts
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] sm:max-h-[90vh] flex flex-col !p-3 sm:!p-4 lg:left-[calc(256px+50%)]">
        <DialogHeader className="dialog-header text-center sm:text-center flex-shrink-0 pb-2 sm:pb-3 space-y-2">
          <div className="mx-auto mb-1 sm:mb-2 md:mb-4">
            {showCelebration ? (
              <div className="animate-bounce">
                <Trophy className="trophy-icon h-8 w-8 sm:h-10 sm:w-10 md:h-16 md:w-16 text-yellow-500 mx-auto" />
              </div>
            ) : (
              <Trophy className="trophy-icon h-8 w-8 sm:h-10 sm:w-10 md:h-16 md:w-16 text-yellow-500 mx-auto" />
            )}
          </div>
          <DialogTitle className="dialog-title text-base sm:text-lg md:text-2xl">Workout Complete!</DialogTitle>
          <DialogDescription className={`dialog-description text-xs sm:text-sm md:text-lg font-medium ${getCompletionColor()}`}>
            {getCompletionMessage()}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="dialog-content flex-1 min-h-0 pr-2 sm:pr-3">
          <div className="space-y-1.5 sm:space-y-2 md:space-y-4 pr-2 sm:pr-2">
            {/* Responsive summary cards - stack on very small screens */}
            <div className="summary-cards grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-1 md:gap-3">
              <Card className="w-full">
                <CardContent className="card-content p-1.5 sm:p-2 md:p-4 text-center">
                  <div className="h-3 w-3 sm:h-4 sm:w-4 md:h-6 md:w-6 text-primary mx-auto mb-1 sm:mb-1 md:mb-2 flex items-center justify-center font-bold">#</div>
                  <div className="stats-value text-xs sm:text-sm md:text-xl font-bold">{stats.totalSets}</div>
                  <div className="stats-label text-[10px] sm:text-xs md:text-sm text-muted-foreground">Total Sets</div>
                </CardContent>
              </Card>

              <Card className="w-full">
                <CardContent className="card-content p-1.5 sm:p-2 md:p-4 text-center">
                  <Target className="h-3 w-3 sm:h-4 sm:w-4 md:h-6 md:w-6 text-primary mx-auto mb-1 sm:mb-1 md:mb-2" />
                  <div className="stats-value text-xs sm:text-sm md:text-xl font-bold">{stats.completionRate}%</div>
                  <div className="stats-label text-[10px] sm:text-xs md:text-sm text-muted-foreground">Completed</div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Breakdown */}
            <Card>
              <CardContent className="p-2 sm:p-3 md:p-4">
                <h4 className="section-title font-semibold mb-1.5 sm:mb-2 md:mb-3 text-xs sm:text-sm md:text-base">Workout Summary</h4>
                <div className="workout-summary space-y-0.5 sm:space-y-1 md:space-y-2 text-[10px] sm:text-xs md:text-sm">
                  <div className="flex justify-between">
                    <span className="text-xs sm:text-sm md:text-sm">Sets Completed</span>
                    <span className="font-medium text-green-600 text-xs sm:text-sm md:text-sm">{stats.completedSets}</span>
                  </div>
                  {stats.skippedSets > 0 && (
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm md:text-sm">Sets Skipped</span>
                      <span className="font-medium text-orange-600 text-xs sm:text-sm md:text-sm">{stats.skippedSets}</span>
                    </div>
                  )}
                </div>

                <Separator className="my-2 sm:my-3 md:my-4" />

                <h4 className="section-title font-semibold mb-1.5 sm:mb-2 md:mb-3 text-xs sm:text-sm md:text-base">Volume by Muscle Group</h4>
                <div className="workout-summary space-y-0.5 sm:space-y-1 md:space-y-2 text-[10px] sm:text-xs md:text-sm">
                  {Object.entries(stats.volumeByMuscleGroup)
                    .sort(([, a], [, b]) => b - a)
                    .map(([muscleGroup, volume]) => (
                      <div key={muscleGroup} className="flex justify-between">
                        <span className="capitalize text-xs sm:text-sm md:text-sm">{muscleGroup.toLowerCase()}</span>
                        <span className="font-medium text-xs sm:text-sm md:text-sm">
                          {volume >= 1000 ? `${(volume / 1000).toFixed(1)}k` : Math.round(volume)} kg
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Achievement Badges */}
            <div className="flex flex-wrap gap-1 sm:gap-1.5 md:gap-2 justify-center">
              {stats.completionRate === 100 && (
                <Badge className="achievement-badge bg-yellow-100 text-yellow-800 border-yellow-200 text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1">Perfect Workout</Badge>
              )}
              {stats.totalVolume >= 5000 && (
                <Badge className="achievement-badge bg-purple-100 text-purple-800 border-purple-200 text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1">Volume King</Badge>
              )}
              {stats.exercises >= 7 && (
                <Badge className="achievement-badge bg-green-100 text-green-800 border-green-200 text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1">Exercise Variety</Badge>
              )}
              {stats.completedSets >= 20 && (
                <Badge className="achievement-badge bg-orange-100 text-orange-800 border-orange-200 text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1">Set Master</Badge>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="dialog-footer flex-col space-y-2 flex-shrink-0 pt-2 sm:pt-3 mt-2 sm:mt-3 border-t border-border/40">
          <Button variant="outline" onClick={onViewMuscleGroupStats} size="touch" className="w-full">
            <TrendingUp className="h-4 w-4 mr-2" />
            <span className="truncate">View Muscle Group Stats</span>
          </Button>
          {hasNext ? (
            <Button onClick={handleNextWorkout} size="touch" className="w-full">
              <Calendar className="h-4 w-4 mr-2" />
              <span className="truncate">Start Next Workout</span>
            </Button>
          ) : (
            <>
              <Button onClick={handleViewProgramSummary} size="touch" className="w-full">
                <Trophy className="h-4 w-4 mr-2" />
                <span className="truncate">View Program Summary</span>
              </Button>
              <Button onClick={handleStartNewProgram} variant="outline" size="touch" className="w-full">
                <Zap className="h-4 w-4 mr-2" />
                <span className="truncate">Start New Program</span>
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
