"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Minus, Calendar, Weight, Clock, Target, ArrowLeft } from "lucide-react"
import { WorkoutLogger } from "@/lib/workout-logger"
import { AnalyticsEngine, type ProgressMetrics, type ExerciseStats } from "@/lib/analytics"

interface ProgressAnalyticsProps {
  onBack?: () => void
}

export function ProgressAnalytics({ onBack }: ProgressAnalyticsProps) {
  const [metrics, setMetrics] = useState<ProgressMetrics | null>(null)
  const [exerciseStats, setExerciseStats] = useState<ExerciseStats[]>([])
  const [selectedTimeframe, setSelectedTimeframe] = useState<"week" | "month" | "all">("month")

  useEffect(() => {
    const workouts = WorkoutLogger.getWorkoutHistory()
    const calculatedMetrics = AnalyticsEngine.calculateProgressMetrics(workouts)
    const calculatedStats = AnalyticsEngine.getExerciseStats(workouts)

    setMetrics(calculatedMetrics)
    setExerciseStats(calculatedStats)
  }, [])

  const formatVolume = (volume: number): string => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k kg`
    }
    return `${Math.round(volume)} kg`
  }

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  const getTrendColor = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return "text-green-600"
      case "down":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-muted-foreground">Loading analytics...</div>
        </div>
      </div>
    )
  }

  if (metrics.totalWorkouts === 0) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Progress Analytics</h1>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <div className="space-y-4">
                <Target className="h-16 w-16 text-muted-foreground mx-auto" />
                <h3 className="text-xl font-semibold">No Workout Data Yet</h3>
                <p className="text-muted-foreground">
                  Complete some workouts to see your progress analytics and track your fitness journey.
                </p>
                <Button onClick={onBack} className="gradient-primary text-primary-foreground">
                  Start Your First Workout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Progress Analytics</h1>
            <p className="text-muted-foreground">Track your fitness journey and celebrate your achievements</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{metrics.totalWorkouts}</div>
              <div className="text-sm text-muted-foreground">Total Workouts</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Weight className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{formatVolume(metrics.totalVolume)}</div>
              <div className="text-sm text-muted-foreground">Total Volume</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{formatDuration(metrics.averageWorkoutDuration)}</div>
              <div className="text-sm text-muted-foreground">Avg Duration</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{Object.keys(metrics.strengthGains).length}</div>
              <div className="text-sm text-muted-foreground">Exercises Tracked</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="exercises">Exercise Stats</TabsTrigger>
            <TabsTrigger value="progress">Progress Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Weekly Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Progress</CardTitle>
                <CardDescription>Your workout frequency and volume over the past 8 weeks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.weeklyProgress.map((week, index) => (
                    <div key={week.week} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">Week of {new Date(week.week).toLocaleDateString()}</div>
                        <div className="text-sm text-muted-foreground">
                          {week.workouts} workouts • {formatVolume(week.volume)} volume
                        </div>
                      </div>
                      <div className="w-32">
                        <Progress value={(week.workouts / 7) * 100} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Strength Gains */}
            {Object.keys(metrics.strengthGains).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Strength Gains</CardTitle>
                  <CardDescription>Percentage increase in maximum weight lifted</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {Object.entries(metrics.strengthGains).map(([exerciseId, gain]) => (
                      <div key={exerciseId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="font-medium capitalize">{exerciseId.replace("-", " ")}</div>
                        <Badge
                          variant={gain > 0 ? "default" : "secondary"}
                          className={gain > 0 ? "bg-green-100 text-green-800" : ""}
                        >
                          {gain > 0 ? "+" : ""}
                          {gain}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="exercises" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Exercise Statistics</CardTitle>
                <CardDescription>Detailed breakdown of your performance by exercise</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {exerciseStats.map((stat) => (
                    <Card key={stat.exerciseId}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{stat.exerciseName}</h4>
                            <p className="text-sm text-muted-foreground">
                              Last performed: {stat.lastPerformed || "Never"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getTrendIcon(stat.progressTrend)}
                            <span className={`text-sm font-medium ${getTrendColor(stat.progressTrend)}`}>
                              {stat.progressTrend === "up"
                                ? "Improving"
                                : stat.progressTrend === "down"
                                  ? "Declining"
                                  : "Stable"}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="font-medium">{stat.totalSets}</div>
                            <div className="text-muted-foreground">Total Sets</div>
                          </div>
                          <div>
                            <div className="font-medium">{stat.totalReps}</div>
                            <div className="text-muted-foreground">Total Reps</div>
                          </div>
                          <div>
                            <div className="font-medium">{stat.maxWeight} kg</div>
                            <div className="text-muted-foreground">Max Weight</div>
                          </div>
                          <div>
                            <div className="font-medium">{stat.averageWeight} kg</div>
                            <div className="text-muted-foreground">Avg Weight</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Progress Trends</CardTitle>
                <CardDescription>Track your improvement over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(metrics.exerciseProgress).map(([exerciseId, progress]) => (
                    <div key={exerciseId} className="space-y-3">
                      <h4 className="font-semibold capitalize">{exerciseId.replace("-", " ")}</h4>
                      <div className="space-y-2">
                        {progress.slice(-5).map((point, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="text-sm">{new Date(point.date).toLocaleDateString()}</span>
                            <div className="flex gap-4 text-sm">
                              <span>Max: {point.maxWeight}kg</span>
                              <span>Reps: {point.totalReps}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
