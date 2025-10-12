"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Calendar, 
  Zap, 
  Activity,
  Award,
  Flame,
  CheckCircle2,
  Circle,
  Star
} from "lucide-react"
import type { WorkoutSession } from "@/lib/workout-logger"
import { getExerciseMuscleGroup } from "@/lib/exercise-muscle-groups"

interface EnhancedWorkoutDialogProps {
  workout: WorkoutSession | null
  open: boolean
  onClose: () => void
  onViewMuscleGroupStats: () => void
  onStartNextWorkout?: () => void
}

export function EnhancedWorkoutDialog({
  workout,
  open,
  onClose,
  onViewMuscleGroupStats,
  onStartNextWorkout,
}: EnhancedWorkoutDialogProps) {
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
    const exerciseDetails: Array<{
      name: string
      sets: number
      volume: number
      muscleGroup: string
      completed: boolean
    }> = []

    workout.exercises.forEach((exercise) => {
      const muscleGroup = getExerciseMuscleGroup(exercise.exerciseName)
      let exerciseVolume = 0
      let exerciseCompletedSets = 0
      let exerciseCompleted = true

      exercise.sets.forEach((set) => {
        totalSets++
        if (set.completed) {
          if (set.reps === 0 && set.weight === 0) {
            skippedSets++
            exerciseCompleted = false
          } else {
            completedSets++
            const setVolume = set.weight * set.reps
            totalVolume += setVolume
            totalReps += set.reps
            exerciseVolume += setVolume
            exerciseCompletedSets++

            if (!volumeByMuscleGroup[muscleGroup]) {
              volumeByMuscleGroup[muscleGroup] = 0
            }
            volumeByMuscleGroup[muscleGroup] += setVolume
          }
        } else {
          exerciseCompleted = false
        }
      })

      exerciseDetails.push({
        name: exercise.exerciseName,
        sets: exerciseCompletedSets,
        volume: exerciseVolume,
        muscleGroup,
        completed: exerciseCompleted
      })
    })

    const completionRate = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0
    const workoutDuration = workout.endTime ? workout.endTime - workout.startTime : 0
    const durationMinutes = Math.round(workoutDuration / 60000)

    return {
      totalSets,
      completedSets,
      skippedSets,
      totalVolume,
      totalReps,
      completionRate,
      exercises: workout.exercises.length,
      volumeByMuscleGroup,
      exerciseDetails,
      durationMinutes,
    }
  }

  const stats = getWorkoutStats()

  const getCompletionMessage = () => {
    if (stats.completionRate === 100) return "Perfect Workout! 🎯"
    if (stats.completionRate >= 90) return "Outstanding Performance! ⭐"
    if (stats.completionRate >= 75) return "Excellent Work! 💪"
    if (stats.completionRate >= 50) return "Solid Effort! 👍"
    return "Keep Pushing! 🔥"
  }

  const getCompletionColor = () => {
    if (stats.completionRate === 100) return "text-green-600"
    if (stats.completionRate >= 90) return "text-blue-600"
    if (stats.completionRate >= 75) return "text-purple-600"
    if (stats.completionRate >= 50) return "text-orange-600"
    return "text-red-600"
  }

  const getWorkoutIntensity = () => {
    if (stats.totalVolume >= 8000) return { level: "High Intensity", color: "text-red-600 bg-red-50" }
    if (stats.totalVolume >= 4000) return { level: "Medium Intensity", color: "text-orange-600 bg-orange-50" }
    return { level: "Light Intensity", color: "text-green-600 bg-green-50" }
  }

  const handleNextWorkout = () => {
    onClose()
    onStartNextWorkout?.()
  }

  const intensity = getWorkoutIntensity()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-6">
          <div className="text-center space-y-4">
            <div className={`mx-auto ${showCelebration ? "animate-bounce" : ""}`}>
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto" />
            </div>
            <DialogTitle className="text-3xl font-bold">Workout Complete!</DialogTitle>
            <div className={`text-2xl font-semibold ${getCompletionColor()}`}>
              {getCompletionMessage()}
            </div>
            <div className="flex justify-center gap-2">
              <Badge className={intensity.color}>
                {intensity.level}
              </Badge>
              <Badge variant="outline">
                {stats.durationMinutes} minutes
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 px-1">
            {/* Primary Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-2 border-primary/20">
                <CardContent className="p-4 text-center">
                  <Target className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-3xl font-bold text-primary">{stats.completionRate}%</div>
                  <div className="text-sm text-muted-foreground font-medium">Completion</div>
                  <Progress value={stats.completionRate} className="mt-3 h-2" />
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-200">
                <CardContent className="p-4 text-center">
                  <Activity className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-blue-600">
                    {stats.totalVolume >= 1000 ? `${(stats.totalVolume / 1000).toFixed(1)}k` : stats.totalVolume}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">Volume (kg)</div>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-200">
                <CardContent className="p-4 text-center">
                  <Zap className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-green-600">{stats.exercises}</div>
                  <div className="text-sm text-muted-foreground font-medium">Exercises</div>
                </CardContent>
              </Card>

              <Card className="border-2 border-purple-200">
                <CardContent className="p-4 text-center">
                  <Flame className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-purple-600">{stats.totalSets}</div>
                  <div className="text-sm text-muted-foreground font-medium">Total Sets</div>
                </CardContent>
              </Card>
            </div>

            {/* Exercise Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Exercise Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.exerciseDetails.map((exercise, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {exercise.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{exercise.name}</div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {exercise.muscleGroup.toLowerCase()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {exercise.volume >= 1000 ? `${(exercise.volume / 1000).toFixed(1)}k` : exercise.volume} kg
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {exercise.sets} sets
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Muscle Group Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5" />
                  Muscle Group Focus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.volumeByMuscleGroup)
                    .sort(([, a], [, b]) => b - a)
                    .map(([muscleGroup, volume]) => {
                      const percentage = (volume / stats.totalVolume) * 100
                      return (
                        <div key={muscleGroup} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium capitalize">{muscleGroup.toLowerCase()}</span>
                            <span className="text-sm text-muted-foreground">
                              {volume >= 1000 ? `${(volume / 1000).toFixed(1)}k` : Math.round(volume)} kg
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={percentage} className="flex-1 h-3" />
                            <span className="text-sm font-medium w-12 text-right">
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {stats.completionRate === 100 && (
                    <Badge className="bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border-yellow-300 px-3 py-1">
                      <Trophy className="h-3 w-3 mr-1" /> Perfect Workout
                    </Badge>
                  )}
                  {stats.totalVolume >= 8000 && (
                    <Badge className="bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300 px-3 py-1">
                      <Flame className="h-3 w-3 mr-1" /> High Volume
                    </Badge>
                  )}
                  {stats.exercises >= 6 && (
                    <Badge className="bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300 px-3 py-1">
                      <Activity className="h-3 w-3 mr-1" /> Exercise Variety
                    </Badge>
                  )}
                  {stats.completedSets >= 20 && (
                    <Badge className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300 px-3 py-1">
                      <Target className="h-3 w-3 mr-1" /> Set Master
                    </Badge>
                  )}
                  {stats.durationMinutes >= 45 && (
                    <Badge className="bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-300 px-3 py-1">
                      <Zap className="h-3 w-3 mr-1" /> Endurance
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <Separator className="my-6" />

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={onViewMuscleGroupStats}
            className="flex-1 py-3"
            size="lg"
          >
            <TrendingUp className="h-5 w-5 mr-2" />
            View Analytics
          </Button>
          <Button onClick={handleNextWorkout} className="flex-1 py-3" size="lg">
            <Calendar className="h-5 w-5 mr-2" />
            Next Workout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
