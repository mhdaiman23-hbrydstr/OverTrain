"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarNavigation } from "@/components/sidebar-navigation"
import { BottomNavigation } from "@/components/bottom-navigation"
import { OverviewTabContent } from "@/components/analytics/overview-tab-content"
import { UsersManagement } from "./users-management"
import { ProgramsTabContent } from "@/components/analytics/programs-tab-content"
import { StrengthTabContent } from "@/components/analytics/strength-tab-content"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, TrendingUp, Users, Activity, Trophy, Dumbbell, Smartphone, Clock, Target, Zap } from "lucide-react"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface AppAnalytics {
  totalUsers: number
  activeUsers: number
  dailyActiveUsers: number
  totalWorkouts: number
  workoutsThisWeek: number
  workoutsThisMonth: number
  mostUsedExercise: string
  averageWorkoutDuration: number
  completionRate: number
  topTemplates: Array<{ name: string; usage: number }>
  userGrowth: Array<{ date: string; users: number }>
  workoutTrends: Array<{ date: string; workouts: number }>
  deviceUsage: { mobile: number; desktop: number }
  featureUsage: Array<{ feature: string; usage: number }>
}

const DEFAULT_VIEW = "dashboard"

export function AdminDashboardWithUsers() {
  const [currentView, setCurrentView] = useState<string>(DEFAULT_VIEW)
  const [analytics, setAnalytics] = useState<AppAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user?.isAdmin) {
      loadAppAnalytics()
    }
  }, [user])

  const loadAppAnalytics = async () => {
    try {
      if (!supabase) {
        console.error('Supabase client not available')
        return
      }

      // Get user analytics
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, created_at')

      // Get workout analytics
      const workoutsResult = await supabase
        .from('workout_sessions')
        .select(`
          *,
          exercises:workout_exercises(
            exercise_name,
            sets:workout_sets(*)
          )
        `)
        .order('start_time', { ascending: false })

      const workouts = workoutsResult.data || []
      const workoutsError = workoutsResult.error

      // Get template usage
      const templatesResult = await supabase
        .from('program_templates')
        .select('name, usage_count')

      const templates = templatesResult.data || []
      const templatesError = templatesResult.error

      if (usersError) {
        console.error('Error loading analytics data:')
        console.error('Users error:', usersError.message || usersError)
        return
      }

      // Log other errors but continue with empty arrays
      if (workoutsError) {
        console.warn('Workouts query failed, continuing with empty data:', workoutsError.message || workoutsError)
      }
      if (templatesError) {
        console.warn('Templates query failed, continuing with empty data:', templatesError.message || templatesError)
      }

      // Calculate app-level analytics
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const totalUsers = users?.length || 0
      const activeUsers = users?.filter(u => {
        const createdAt = new Date(u.created_at)
        return createdAt > monthAgo
      }).length || 0

      const dailyActiveUsers = users?.filter(u => {
        const createdAt = new Date(u.created_at)
        return createdAt > new Date(now.getTime() - 24 * 60 * 60 * 1000)
      }).length || 0

      const totalWorkouts = workouts?.length || 0
      const workoutsThisWeek = workouts?.filter(w => new Date(w.start_time) > weekAgo).length || 0
      const workoutsThisMonth = workouts?.filter(w => new Date(w.start_time) > monthAgo).length || 0

      // Calculate most used exercise
      const exerciseCounts: { [key: string]: number } = {}
      workouts?.forEach(workout => {
        workout.exercises?.forEach((exercise: any) => {
          exerciseCounts[exercise.exercise_name] = (exerciseCounts[exercise.exercise_name] || 0) + 1
        })
      })
      const mostUsedExercise = Object.entries(exerciseCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'

      // Calculate average workout duration
      const completedWorkouts = workouts?.filter(w => w.completed && w.end_time) || []
      const averageWorkoutDuration = completedWorkouts.length > 0
        ? Math.round(completedWorkouts.reduce((sum, w) => 
            sum + (new Date(w.end_time).getTime() - new Date(w.start_time).getTime()) / (1000 * 60), 0) / completedWorkouts.length)
        : 0

      // Calculate completion rate
      const completionRate = workouts?.length > 0
        ? Math.round((workouts.filter(w => w.completed).length / workouts.length) * 100)
        : 0

      // Get top templates
      const topTemplates = templates
        ?.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
        .slice(0, 5)
        .map(t => ({ name: t.name, usage: t.usage_count || 0 })) || []

      // Generate user growth data (last 30 days)
      const userGrowth = []
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        const usersOnDate = users?.filter(u => 
          new Date(u.created_at).toISOString().split('T')[0] <= dateStr
        ).length || 0
        userGrowth.push({ date: dateStr, users: usersOnDate })
      }

      // Generate workout trends (last 30 days)
      const workoutTrends = []
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        const workoutsOnDate = workouts?.filter(w => 
          new Date(w.start_time).toISOString().split('T')[0] === dateStr
        ).length || 0
        workoutTrends.push({ date: dateStr, workouts: workoutsOnDate })
      }

      // Mock device usage (would need user agent tracking in real implementation)
      const deviceUsage = { mobile: 65, desktop: 35 }

      // Mock feature usage (would need event tracking in real implementation)
      const featureUsage = [
        { feature: 'Workout Logger', usage: 89 },
        { feature: 'Program Templates', usage: 67 },
        { feature: 'Exercise Library', usage: 45 },
        { feature: 'Progress Analytics', usage: 78 },
        { feature: 'Personal Records', usage: 56 }
      ]

      setAnalytics({
        totalUsers,
        activeUsers,
        dailyActiveUsers,
        totalWorkouts,
        workoutsThisWeek,
        workoutsThisMonth,
        mostUsedExercise,
        averageWorkoutDuration,
        completionRate,
        topTemplates,
        userGrowth,
        workoutTrends,
        deviceUsage,
        featureUsage
      })
    } catch (error) {
      console.error('Error loading app analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewChange = (view: string) => {
    setCurrentView(view)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <SidebarNavigation currentView={currentView} onViewChange={handleViewChange} />
        <div className="flex-1 lg:pl-64">
          <main className="px-4 py-6 pb-24 lg:pb-10">
            <div className="flex items-center justify-center h-64">
              <p className="text-sm text-muted-foreground">Loading app analytics...</p>
            </div>
          </main>
        </div>
        <BottomNavigation currentView={currentView} onViewChange={handleViewChange} />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNavigation currentView={currentView} onViewChange={handleViewChange} />

      <div className="flex-1 lg:pl-64">
        <main className="px-4 py-6 pb-24 lg:pb-10 space-y-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">App Analytics Dashboard</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                Real-time app metrics
              </div>
            </div>

            {/* Key App Metrics Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">Registered users</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.dailyActiveUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">Last 24 hours</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.totalWorkouts || 0}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.completionRate || 0}%</div>
                  <p className="text-xs text-muted-foreground">Workout completion</p>
                </CardContent>
              </Card>
            </div>

            {/* Secondary Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Weekly Workouts</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.workoutsThisWeek || 0}</div>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.averageWorkoutDuration || 0}m</div>
                  <p className="text-xs text-muted-foreground">Minutes per workout</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Mobile Usage</CardTitle>
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.deviceUsage.mobile || 0}%</div>
                  <p className="text-xs text-muted-foreground">Mobile vs desktop</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Top Exercise</CardTitle>
                  <Dumbbell className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold truncate">{analytics?.mostUsedExercise || 'N/A'}</div>
                  <p className="text-xs text-muted-foreground">Most performed</p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analytics Tabs */}
            {analytics && (
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="users" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Users
                  </TabsTrigger>
                  <TabsTrigger value="workouts" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Workouts
                  </TabsTrigger>
                  <TabsTrigger value="features" className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Features
                  </TabsTrigger>
                  <TabsTrigger value="templates" className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Templates
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <OverviewTabContent analytics={analytics} />
                </TabsContent>

                <TabsContent value="users">
                  <UsersManagement />
                </TabsContent>

                <TabsContent value="workouts">
                  <div className="grid gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Workout Statistics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-muted/30 rounded">
                            <div className="text-2xl font-bold">{analytics.totalWorkouts}</div>
                            <div className="text-sm text-muted-foreground">Total Workouts</div>
                          </div>
                          <div className="p-4 bg-muted/30 rounded">
                            <div className="text-2xl font-bold">{analytics.workoutsThisWeek}</div>
                            <div className="text-sm text-muted-foreground">This Week</div>
                          </div>
                          <div className="p-4 bg-muted/30 rounded">
                            <div className="text-2xl font-bold">{analytics.workoutsThisMonth}</div>
                            <div className="text-sm text-muted-foreground">This Month</div>
                          </div>
                          <div className="p-4 bg-muted/30 rounded">
                            <div className="text-2xl font-bold">{analytics.completionRate}%</div>
                            <div className="text-sm text-muted-foreground">Completion Rate</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="features">
                  <Card>
                    <CardHeader>
                      <CardTitle>Feature Usage Analytics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analytics.featureUsage.map((feature, index) => (
                          <div key={feature.feature} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{feature.feature}</span>
                              <span className="text-sm text-muted-foreground">{feature.usage}% usage</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${feature.usage}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="templates">
                  <Card>
                    <CardHeader>
                      <CardTitle>Most Popular Templates</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.topTemplates.map((template, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                            <span className="font-medium">{template.name}</span>
                            <span className="text-sm text-muted-foreground">{template.usage} uses</span>
                          </div>
                        ))}
                        {analytics.topTemplates.length === 0 && (
                          <p className="text-center text-muted-foreground py-4">No template usage data available</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>
      </div>

      <BottomNavigation currentView={currentView} onViewChange={handleViewChange} />
    </div>
  )
}
