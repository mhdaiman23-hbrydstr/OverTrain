"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Trophy, 
  TrendingUp, 
  Calendar, 
  Star,
  Heart,
  ThumbsUp,
  Sparkles
} from "lucide-react"
import type { WorkoutSession } from "@/lib/workout-logger"
import { getExerciseMuscleGroup } from "@/lib/exercise-muscle-groups"

interface BeginnerFriendlyWorkoutDialogProps {
  workout: WorkoutSession | null
  open: boolean
  onClose: () => void
  onViewMuscleGroupStats: () => void
  onStartNextWorkout?: () => void
}

export function BeginnerFriendlyWorkoutDialog({
  workout,
  open,
  onClose,
  onViewMuscleGroupStats,
  onStartNextWorkout,
}: BeginnerFriendlyWorkoutDialogProps) {
  const [showCelebration, setShowCelebration] = useState(false)

  useEffect(() => {
    if (open && workout) {
      setShowCelebration(true)
      const timer = setTimeout(() => setShowCelebration(false), 2500)
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

  const getEncouragingMessage = () => {
    if (stats.completionRate === 100) {
      return {
        title: "Amazing! You Did It! 🎉",
        subtitle: "Perfect workout - every set completed!",
        emoji: "🏆"
      }
    }
    if (stats.completionRate >= 75) {
      return {
        title: "Great Job! 💪",
        subtitle: "You're making fantastic progress!",
        emoji: "⭐"
      }
    }
    if (stats.completionRate >= 50) {
      return {
        title: "Good Work! 👍",
        subtitle: "Every workout helps you get stronger!",
        emoji: "💪"
      }
    }
    return {
      title: "Keep Going! 🌟",
      subtitle: "You're building a great habit!",
      emoji: "❤️"
    }
  }

  const getEncouragingTips = () => {
    const tips = [
      "Great job showing up today!",
      "Consistency is more important than perfection!",
      "You're stronger than you think!",
      "Every rep counts towards your goals!",
      "Proud of you for putting in the work!"
    ]
    return tips[Math.floor(Math.random() * tips.length)]
  }

  const handleNextWorkout = () => {
    onClose()
    onStartNextWorkout?.()
  }

  const message = getEncouragingMessage()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md mx-auto p-6 text-center">
        <DialogHeader className="space-y-4">
          <div className={`text-6xl ${showCelebration ? "animate-bounce" : ""}`}>
            {message.emoji}
          </div>
          <DialogTitle className="text-2xl font-bold text-green-600">
            {message.title}
          </DialogTitle>
          <p className="text-lg text-muted-foreground">
            {message.subtitle}
          </p>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* Simple, Friendly Stats */}
          <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
            <div className="text-3xl font-bold text-green-700 mb-2">
              {stats.completionRate}% Complete
            </div>
            <div className="text-green-600">
              You finished {stats.completedSets} out of {stats.totalSets} sets
            </div>
          </div>

          {/* What You Accomplished */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-center mb-3">
                <Star className="h-6 w-6 text-blue-500 mr-2" />
                <h3 className="font-semibold text-blue-900">What You Accomplished</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-700">{stats.exercises}</div>
                  <div className="text-sm text-blue-600">Exercises</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-700">
                    {stats.totalVolume >= 1000 ? `${(stats.totalVolume / 1000).toFixed(1)}k` : stats.totalVolume}
                  </div>
                  <div className="text-sm text-blue-600">Total Weight</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Encouraging Tip */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-start">
              <Sparkles className="h-5 w-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium text-yellow-800 mb-1">Quick Tip</div>
                <div className="text-sm text-yellow-700">{getEncouragingTips()}</div>
              </div>
            </div>
          </div>

          {/* Achievement Badge */}
          {stats.completionRate === 100 && (
            <div className="flex justify-center">
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-lg px-4 py-2">
                <Trophy className="h-4 w-4 mr-2" />
                Perfect Workout!
              </Badge>
            </div>
          )}

          {stats.completionRate >= 75 && stats.completionRate < 100 && (
            <div className="flex justify-center">
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-lg px-4 py-2">
                <ThumbsUp className="h-4 w-4 mr-2" />
                Great Effort!
              </Badge>
            </div>
          )}

          {stats.completionRate < 75 && (
            <div className="flex justify-center">
              <Badge className="bg-green-100 text-green-800 border-green-200 text-lg px-4 py-2">
                <Heart className="h-4 w-4 mr-2" />
                Keep Going!
              </Badge>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Button 
            variant="outline" 
            onClick={onViewMuscleGroupStats}
            className="w-full text-base py-3"
            size="lg"
          >
            <TrendingUp className="h-5 w-5 mr-2" />
            See My Progress
          </Button>
          <Button 
            onClick={handleNextWorkout} 
            className="w-full text-base py-3 bg-green-600 hover:bg-green-700"
            size="lg"
          >
            <Calendar className="h-5 w-5 mr-2" />
            Ready for Next Workout!
          </Button>
        </div>

        {/* Motivational Footer */}
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground italic">
            "You're one workout closer to your goals! 💪"
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
