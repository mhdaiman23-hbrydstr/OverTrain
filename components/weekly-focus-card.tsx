"use client"

import { Target, Plus, HelpCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { MobileTooltip } from "@/components/ui/mobile-tooltip"
import { cn } from "@/lib/utils"
import type { WorkoutSession } from "@/lib/workout-logger"

interface WeeklyFocusCardProps {
  workouts: WorkoutSession[]
  weeklyGoal: number
  onLogWorkout: () => void
}

export function WeeklyFocusCard({ workouts, weeklyGoal, onLogWorkout }: WeeklyFocusCardProps) {
  const completedWorkouts = workouts.filter(w => w.completed)
  
  // Calculate this week's progress
  const getThisWeeksWorkouts = () => {
    const now = new Date()
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    
    return completedWorkouts.filter(workout => {
      const workoutDate = new Date(workout.startTime)
      return workoutDate >= weekStart && workoutDate <= weekEnd
    })
  }

  const thisWeeksWorkouts = getThisWeeksWorkouts()
  const workoutsCompleted = thisWeeksWorkouts.length
  const remainingWorkouts = Math.max(0, weeklyGoal - workoutsCompleted)
  const progressPercentage = (workoutsCompleted / weeklyGoal) * 100

  // Generate smart microcopy
  const getMicrocopy = () => {
    if (workoutsCompleted >= weeklyGoal) {
      return "Goal achieved! Great job this week! 🎉"
    } else if (remainingWorkouts === 1) {
      return "1 more to reach your goal"
    } else if (remainingWorkouts > 1) {
      return `${remainingWorkouts} more to reach your goal`
    } else {
      return "All workouts completed! Keep it up! 🔥"
    }
  }

  // Calculate weekly stats
  const weeklyVolume = thisWeeksWorkouts.reduce((sum, workout) =>
    sum + workout.exercises.reduce((exSum, ex) =>
      exSum + ex.sets.filter(s => s.completed).reduce((setSum, set) => setSum + set.weight * set.reps, 0), 0), 0)

  const formatVolume = (volume: number): string => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k kg`
    }
    return `${Math.round(volume)} kg`
  }

  // Get workout days for progress visualization
  const getWorkoutDays = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const today = new Date()
    // JavaScript getDay(): 0=Sunday … 6=Saturday. Shift so Monday=0.
    const currentDayIndex = (today.getDay() + 6) % 7

    return days.map((day, index) => {
      const hasWorkout = thisWeeksWorkouts.some(workout => {
        const workoutDay = new Date(workout.startTime).getDay()
        return ((workoutDay + 6) % 7) === index
      })
      
      const isPastDay = index < currentDayIndex
      const isToday = index === currentDayIndex
      
      return {
        day,
        hasWorkout,
        isPastDay,
        isToday
      }
    })
  }

  const workoutDays = getWorkoutDays()

  return (
    <Card className="gradient-card border-primary/20 shadow-lg">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">This Week</h3>
              <MobileTooltip
                content={
                  <>
                    <p>The circular chart shows your progress toward your weekly goal.</p>
                    <p className="text-xs mt-1">Blue = In progress | Green = Goal achieved</p>
                  </>
                }
              >
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
              </MobileTooltip>
            </div>
            <p className="text-sm text-muted-foreground">Your weekly workout goal progress</p>
          </div>

            {/* Progress Circle */}
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-4 border-primary/20">
                  <div
                    className="absolute inset-0 rounded-full flex items-center justify-center"
                    style={{
                      background: `conic-gradient(from-0deg, ${progressPercentage >= 100 ? '#10b981' : '#3b82f6'} 0deg, ${progressPercentage >= 100 ? '#10b981' : '#3b82f6'} ${progressPercentage * 3.6}deg, transparent 360deg)`
                    }}
                  >
                    <div className="w-28 h-28 rounded-full bg-background flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-foreground tabular-nums">
                          {workoutsCompleted}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          /{weeklyGoal}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress ring */}
                <svg className="absolute inset-0 w-32 h-32 -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="60"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-primary/20"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="60"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 60}`}
                    strokeDashoffset={`${2 * Math.PI * 60 * (1 - progressPercentage / 100)}`}
                    className="text-primary transition-all duration-500 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

          {/* Microcopy */}
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {getMicrocopy()}
            </p>
            <div className="mt-2">
              <Badge 
                variant={progressPercentage >= 100 ? "default" : "secondary"}
                className={cn(
                  "text-xs px-3 py-1",
                  progressPercentage >= 100 && "bg-green-600 text-white"
                )}
              >
                {progressPercentage >= 100 ? "Goal Achieved" : `${Math.round(progressPercentage)}% Complete`}
              </Badge>
            </div>
          </div>

          {/* Weekly Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-muted-foreground">Total Volume</div>
              <div className="font-semibold text-foreground">{formatVolume(weeklyVolume)}</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-muted-foreground">Avg per Workout</div>
              <div className="font-semibold text-foreground">
                {thisWeeksWorkouts.length > 0 ? formatVolume(weeklyVolume / thisWeeksWorkouts.length) : "0 kg"}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <Button
            onClick={onLogWorkout}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            size="lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Log Workout
          </Button>

          {/* Workout Days Visualization */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Workout Days</span>
                <MobileTooltip
                  content={
                    <>
                      <p>Your workouts for this week:</p>
                      <p className="text-xs mt-1">Blue = Had workout | Red = Missed | Gray = Future</p>
                    </>
                  }
                >
                  <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                </MobileTooltip>
              </div>
              <div className="flex gap-1">
                {workoutDays.map((day, index) => (
                  <div
                    key={index}
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                      day.hasWorkout
                        ? "bg-primary text-primary-foreground"
                        : day.isPastDay && !day.hasWorkout
                          ? "bg-destructive/20 text-destructive"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {day.day.charAt(0)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
