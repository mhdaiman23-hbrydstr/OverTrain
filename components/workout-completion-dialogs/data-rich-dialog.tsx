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
  BarChart3,
  Award,
  Flame,
  Clock
} from "lucide-react"
import type { WorkoutSession } from "@/lib/workout-logger"
import { getExerciseMuscleGroup } from "@/lib/exercise-muscle-groups"

interface DataRichWorkoutDialogProps {
  workout: WorkoutSession | null
  open: boolean
  onClose: () => void
  onViewMuscleGroupStats: () => void
  onStartNextWorkout?: () => void
}

export function DataRichWorkoutDialog({
  workout,
  open,
  onClose,
  onViewMuscleGroupStats,
  onStartNextWorkout,
}: DataRichWorkoutDialogProps) {
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
    const setsByMuscleGroup: Record<string, number> = {}
    const exerciseDetails: Array<{
      name: string
      sets: number
      volume: number
      muscleGroup: string
    }> = []

    workout.exercises.forEach((exercise) => {
      const muscleGroup = getExerciseMuscleGroup(exercise.exerciseName)
      let exerciseVolume = 0
      let exerciseCompletedSets = 0

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
            exerciseVolume += setVolume
            exerciseCompletedSets++

            if (!volumeByMuscleGroup[muscleGroup]) {
              volumeByMuscleGroup[muscleGroup] = 0
            }
            volumeByMuscleGroup[muscleGroup] += setVolume

            if (!setsByMuscleGroup[muscleGroup]) {
              setsByMuscleGroup[muscleGroup] = 0
            }
            setsByMuscleGroup[muscleGroup]++
          }
        }
      })

      exerciseDetails.push({
        name: exercise.exerciseName,
        sets: exerciseCompletedSets,
        volume: exerciseVolume,
        muscleGroup
      })
    })

    const completionRate = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0
    const avgRepsPerSet = completedSets > 0 ? Math.round(totalReps / completedSets) : 0
    const avgWeightPerSet = completedSets > 0 ? Math.round(totalVolume / completedSets) : 0
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
      setsByMuscleGroup,
      exerciseDetails,
      avgRepsPerSet,
      avgWeightPerSet,
      durationMinutes,
    }
  }

  const stats = getWorkoutStats()

  const getPerformanceLevel = () => {
    if (stats.completionRate === 100 && stats.totalVolume >= 5000) return "Elite"
    if (stats.completionRate >= 90 && stats.totalVolume >= 3000) return "Advanced"
    if (stats.completionRate >= 75) return "Intermediate"
    return "Beginner"
  }

  const getPerformanceColor = (level: string) => {
    switch (level) {
      case "Elite": return "text-purple-600 bg-purple-50"
      case "Advanced": return "text-blue-600 bg-blue-50"
      case "Intermediate": return "text-green-600 bg-green-50"
      default: return "text-orange-600 bg-orange-50"
    }
  }

  const getIntensityLevel = () => {
    if (stats.avgWeightPerSet >= 50) return "High"
    if (stats.avgWeightPerSet >= 30) return "Medium"
    return "Low"
  }

  const handleNextWorkout = () => {
    onClose()
    onStartNextWorkout?.()
  }

  const performanceLevel = getPerformanceLevel()
  const intensityLevel = getIntensityLevel()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl max-h-[95vh] overflow-hidden mx-4 sm:mx-auto">
        <DialogHeader className="pb-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 sm:p-3 rounded-full ${showCelebration ? "animate-bounce" : ""}`}>
                <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-bold">Workout Analytics</DialogTitle>
                <p className="text-muted-foreground text-sm">Comprehensive performance analysis</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge className={`${getPerformanceColor(performanceLevel)}`}>
                {performanceLevel}
              </Badge>
              <Badge variant="outline">
                {intensityLevel} Intensity
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6">
            {/* Key Performance Indicators */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary mx-auto mb-1 sm:mb-2" />
                  <div className="text-xl sm:text-2xl font-bold">{stats.completionRate}%</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Completion</div>
                  <Progress value={stats.completionRate} className="mt-2 h-2" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary mx-auto mb-1 sm:mb-2" />
                  <div className="text-xl sm:text-2xl font-bold">
                    {stats.totalVolume >= 1000 ? `${(stats.totalVolume / 1000).toFixed(1)}k` : stats.totalVolume}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Volume (kg)</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary mx-auto mb-1 sm:mb-2" />
                  <div className="text-xl sm:text-2xl font-bold">{stats.totalReps}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Total Reps</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary mx-auto mb-1 sm:mb-2" />
                  <div className="text-xl sm:text-2xl font-bold">{stats.durationMinutes}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Duration (min)</div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Flame className="h-4 w-4 sm:h-5 sm:w-5" />
                    Muscle Group Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 sm:space-y-4">
                    {Object.entries(stats.setsByMuscleGroup)
                      .sort(([, a], [, b]) => b - a)
                      .map(([muscleGroup, sets]) => {
                        const maxSets = Math.max(...Object.values(stats.setsByMuscleGroup))
                        const barWidth = maxSets > 0 ? (sets / maxSets) * 100 : 0
                        return (
                          <div key={muscleGroup} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm font-medium capitalize">{muscleGroup.toLowerCase()}</span>
                              <span className="text-xs sm:text-sm font-semibold bg-blue-100 text-blue-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                                {sets} sets
                              </span>
                            </div>
                            <div className="relative">
                              <div className="w-full bg-gray-200 rounded-lg h-4 sm:h-6 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-lg transition-all duration-500 ease-out flex items-center justify-end pr-1 sm:pr-2"
                                  style={{ width: `${barWidth}%` }}
                                >
                                  {barWidth > 25 && (
                                    <span className="text-xs text-white font-medium">
                                      {sets}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Award className="h-4 w-4 sm:h-5 sm:w-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm">Avg Weight per Set</span>
                      <span className="font-semibold text-sm sm:text-base">{stats.avgWeightPerSet} kg</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm">Avg Reps per Set</span>
                      <span className="font-semibold text-sm sm:text-base">{stats.avgRepsPerSet}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm">Exercise Efficiency</span>
                      <span className="font-semibold text-sm sm:text-base">{Math.round(stats.totalVolume / stats.exercises)} kg/ex</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm">Set Completion Rate</span>
                      <span className="font-semibold text-sm sm:text-base">{stats.completedSets}/{stats.totalSets}</span>
                    </div>
                    {stats.skippedSets > 0 && (
                      <div className="flex justify-between items-center text-orange-600">
                        <span className="text-xs sm:text-sm">Skipped Sets</span>
                        <span className="font-semibold text-sm sm:text-base">{stats.skippedSets}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Exercise Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Exercise Performance Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 sm:space-y-3">
                  {stats.exerciseDetails
                    .sort((a, b) => b.volume - a.volume)
                    .map((exercise, index) => (
                      <div key={index} className="flex items-center justify-between p-2 sm:p-3 rounded-lg border">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm sm:text-base truncate">{exercise.name}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground capitalize">
                            {exercise.muscleGroup.toLowerCase()}
                          </div>
                        </div>
                        <div className="text-right ml-2 sm:ml-3">
                          <div className="font-semibold text-sm sm:text-base">
                            {exercise.volume >= 1000 ? `${(exercise.volume / 1000).toFixed(1)}k` : exercise.volume} kg
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            {exercise.sets} sets
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Achievements Earned</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {stats.completionRate === 100 && (
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs sm:text-sm">
                      <Trophy className="h-3 w-3 mr-1" /> Perfect Workout
                    </Badge>
                  )}
                  {stats.totalVolume >= 10000 && (
                    <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs sm:text-sm">
                      <BarChart3 className="h-3 w-3 mr-1" /> Volume Beast
                    </Badge>
                  )}
                  {stats.totalVolume >= 5000 && stats.totalVolume < 10000 && (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs sm:text-sm">
                      <Zap className="h-3 w-3 mr-1" /> High Volume
                    </Badge>
                  )}
                  {stats.exercises >= 8 && (
                    <Badge className="bg-green-100 text-green-800 border-green-200 text-xs sm:text-sm">
                      <Activity className="h-3 w-3 mr-1" /> Exercise Master
                    </Badge>
                  )}
                  {stats.avgWeightPerSet >= 50 && (
                    <Badge className="bg-red-100 text-red-800 border-red-200 text-xs sm:text-sm">
                      <Flame className="h-3 w-3 mr-1" /> Heavy Lifter
                    </Badge>
                  )}
                  {stats.completedSets >= 25 && (
                    <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs sm:text-sm">
                      <Target className="h-3 w-3 mr-1" /> Set Champion
                    </Badge>
                  )}
                  {stats.durationMinutes >= 60 && (
                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-xs sm:text-sm">
                      <Clock className="h-3 w-3 mr-1" /> Endurance Warrior
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <Separator className="my-4" />

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button 
            variant="outline" 
            onClick={onViewMuscleGroupStats}
            className="w-full sm:flex-1"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Detailed Analytics
          </Button>
          <Button onClick={handleNextWorkout} className="w-full sm:flex-1">
            <Calendar className="h-4 w-4 mr-2" />
            Next Workout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
