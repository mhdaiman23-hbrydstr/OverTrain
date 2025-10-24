"use client"

import { useState, useMemo } from "react"
import { MobileAnalyticsHeader } from "./mobile-analytics-header"
import { EnhancedKPIGrid } from "./enhanced-kpi-grid"
import { WeeklyFocusCard } from "./weekly-focus-card"
import { OverviewTabContent } from "./analytics/overview-tab-content"
import { ProgramsTabContent } from "./analytics/programs-tab-content"
import { StrengthTabContent } from "./analytics/strength-tab-content"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkoutLogger } from "@/lib/workout-logger"
import { AnalyticsEngine } from "@/lib/analytics"
import type { WorkoutSession } from "@/lib/workout-logger"

interface MobileAnalyticsTabProps {
  onLogWorkout?: () => void
}

export function MobileAnalyticsTab({ onLogWorkout }: MobileAnalyticsTabProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("28d")
  const [activeTab, setActiveTab] = useState("overview")

  // Load workout data
  const workouts = useMemo(() => {
    return WorkoutLogger.getWorkoutHistory()
  }, [])

  // Calculate weekly goal (could be configurable)
  const weeklyGoal = 4

  // Filter workouts based on selected period
  const filteredWorkouts = useMemo(() => {
    const now = new Date()
    let startDate: Date

    switch (selectedPeriod) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "28d":
        startDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)
        break
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case "ytd":
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)
    }

    return workouts.filter(workout => new Date(workout.startTime) >= startDate)
  }, [workouts, selectedPeriod])

  // Calculate advanced analytics
  const advancedAnalytics = useMemo(() => {
    if (filteredWorkouts.length === 0) {
      return {
        trainingLoad: [],
        acwr: { acuteLoad: 0, chronicLoad: 0, ratio: 0, zone: "safe", recommendation: "No data available" },
        personalRecords: [],
        heatmap: [],
        insights: [],
        consistencyScore: 0,
        topExercises: [],
      }
    }
    return AnalyticsEngine.calculateAdvancedAnalytics(filteredWorkouts)
  }, [filteredWorkouts])

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <MobileAnalyticsHeader 
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      <div className="space-y-6 p-4 pt-6">
        {/* KPI Grid */}
        <EnhancedKPIGrid
          workouts={filteredWorkouts}
        />

        {/* Weekly Focus Card */}
        <WeeklyFocusCard
          workouts={filteredWorkouts}
          weeklyGoal={weeklyGoal}
          onLogWorkout={onLogWorkout}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview" className="text-sm font-medium">
              Overview
            </TabsTrigger>
            <TabsTrigger value="programs" className="text-sm font-medium">
              Programs
            </TabsTrigger>
            <TabsTrigger value="strength" className="text-sm font-medium">
              Strength
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-4">
            <OverviewTabContent analytics={advancedAnalytics} />
          </TabsContent>

          <TabsContent value="programs" className="space-y-6 mt-4">
            <ProgramsTabContent />
          </TabsContent>

          <TabsContent value="strength" className="space-y-6 mt-4">
            <StrengthTabContent analytics={advancedAnalytics} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
