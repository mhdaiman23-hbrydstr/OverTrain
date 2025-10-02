"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, Calendar, Trophy, Flame, Clock, Weight } from "lucide-react"

export function AnalyticsSection() {
  const [selectedPeriod, setSelectedPeriod] = useState("month")

  // Mock analytics data based on program completion
  const analyticsData = {
    programsCompleted: 3,
    currentStreak: 12,
    totalWorkouts: 47,
    totalVolume: 15420, // kg
    avgWorkoutDuration: 52, // minutes
    completionRate: 89, // percentage
    weeklyGoal: 4,
    weeklyCompleted: 3,
    monthlyStats: {
      workoutsCompleted: 16,
      programsFinished: 1,
      strengthGains: 8.5, // percentage
      consistencyScore: 92,
    },
  }

  const recentPrograms = [
    {
      name: "Upper/Lower Split",
      completedDate: "2024-01-15",
      duration: "6 weeks",
      completionRate: 100,
      workouts: 24,
      avgDuration: 52,
    },
    {
      name: "Push/Pull/Legs",
      completedDate: "2023-11-20",
      duration: "8 weeks",
      completionRate: 87,
      workouts: 28,
      avgDuration: 48,
    },
  ]

  const strengthProgress = [
    { exercise: "Bench Press", improvement: 12.5, unit: "kg" },
    { exercise: "Squat", improvement: 18.0, unit: "kg" },
    { exercise: "Deadlift", improvement: 22.5, unit: "kg" },
    { exercise: "Overhead Press", improvement: 7.5, unit: "kg" },
  ]

  const formatVolume = (volume: number): string => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k kg`
    }
    return `${Math.round(volume)} kg`
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 pt-4">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm">Track your fitness progress</p>
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="gradient-card">
            <CardContent className="p-4 text-center">
              <Trophy className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-xl font-bold">{analyticsData.programsCompleted}</div>
              <div className="text-xs text-muted-foreground">Programs Completed</div>
            </CardContent>
          </Card>

          <Card className="gradient-card">
            <CardContent className="p-4 text-center">
              <Flame className="h-6 w-6 text-orange-500 mx-auto mb-2" />
              <div className="text-xl font-bold">{analyticsData.currentStreak}</div>
              <div className="text-xs text-muted-foreground">Day Streak</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-xl font-bold">{analyticsData.totalWorkouts}</div>
              <div className="text-xs text-muted-foreground">Total Workouts</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Weight className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-xl font-bold">{formatVolume(analyticsData.totalVolume)}</div>
              <div className="text-xs text-muted-foreground">Total Volume</div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">This Week</CardTitle>
            <CardDescription>Your weekly workout goal progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Workouts Completed</span>
              <span className="text-sm text-muted-foreground">
                {analyticsData.weeklyCompleted}/{analyticsData.weeklyGoal}
              </span>
            </div>
            <Progress value={(analyticsData.weeklyCompleted / analyticsData.weeklyGoal) * 100} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {analyticsData.weeklyGoal - analyticsData.weeklyCompleted} more to reach your goal
            </div>
          </CardContent>
        </Card>

        {/* Tabs for detailed analytics */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="programs">Programs</TabsTrigger>
            <TabsTrigger value="strength">Strength</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Monthly Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">This Month</CardTitle>
                <CardDescription>Your monthly performance summary</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {analyticsData.monthlyStats.workoutsCompleted}
                    </div>
                    <div className="text-xs text-muted-foreground">Workouts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{analyticsData.monthlyStats.programsFinished}</div>
                    <div className="text-xs text-muted-foreground">Programs Finished</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Consistency Score</span>
                    <span className="font-medium">{analyticsData.monthlyStats.consistencyScore}%</span>
                  </div>
                  <Progress value={analyticsData.monthlyStats.consistencyScore} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Average Workout Duration */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">Avg Workout Duration</div>
                      <div className="text-sm text-muted-foreground">Per session</div>
                    </div>
                  </div>
                  <div className="text-xl font-bold">{analyticsData.avgWorkoutDuration}m</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="programs" className="space-y-4 mt-4">
            {/* Program Completion Rate */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Program Completion</CardTitle>
                <CardDescription>Your overall program completion rate</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{analyticsData.completionRate}%</div>
                  <div className="text-sm text-muted-foreground">Average completion rate</div>
                </div>
                <Progress value={analyticsData.completionRate} className="h-3" />
              </CardContent>
            </Card>

            {/* Recent Programs */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">RECENT PROGRAMS</h3>
              {recentPrograms.map((program, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{program.name}</h4>
                      <Badge variant={program.completionRate === 100 ? "default" : "secondary"}>
                        {program.completionRate}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>{program.duration}</div>
                      <div>{program.workouts} workouts</div>
                      <div>{program.avgDuration}m avg</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="strength" className="space-y-4 mt-4">
            {/* Strength Gains */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Strength Progress</CardTitle>
                <CardDescription>Weight improvements over time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-green-600">+{analyticsData.monthlyStats.strengthGains}%</div>
                  <div className="text-sm text-muted-foreground">Average strength gain</div>
                </div>

                <div className="space-y-3">
                  {strengthProgress.map((exercise, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="font-medium text-sm">{exercise.exercise}</div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">
                          +{exercise.improvement}
                          {exercise.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Personal Records */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Personal Records</CardTitle>
                <CardDescription>Your best lifts this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Bench Press</span>
                    <span className="font-medium">85kg</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Squat</span>
                    <span className="font-medium">120kg</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Deadlift</span>
                    <span className="font-medium">140kg</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
