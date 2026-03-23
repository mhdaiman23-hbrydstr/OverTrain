"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { MobileAnalyticsHeader } from "./mobile-analytics-header"
import { EnhancedKPIGrid } from "./enhanced-kpi-grid"
import { WeeklyFocusCard } from "./weekly-focus-card"
import { OverviewTabContent } from "./analytics/overview-tab-content"
import { ProgramsTabContent } from "./analytics/programs-tab-content"
import { StrengthTabContent } from "./analytics/strength-tab-content"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { WorkoutLogger } from "@/lib/workout-logger"
import { AnalyticsEngine, type AdvancedAnalytics } from "@/lib/analytics"
import type { WorkoutSession } from "@/lib/workout-logger"
import { EmptyState } from "@/components/ui/empty-state"
import { BarChart3 } from "lucide-react"

interface MobileAnalyticsTabProps {
  onLogWorkout?: () => void
}

export function MobileAnalyticsTab({ onLogWorkout }: MobileAnalyticsTabProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("28d")
  const [activeTab, setActiveTab] = useState("overview")
  const [showCustomDateDialog, setShowCustomDateDialog] = useState(false)
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined)
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined)

  // Load workout data — use state instead of useMemo so we can refresh on events.
  // The keep-alive pattern means this component never unmounts, so useMemo([]) would
  // cache stale data forever.
  const [workouts, setWorkouts] = useState<WorkoutSession[]>(() => WorkoutLogger.getWorkoutHistory())

  const refreshWorkouts = useCallback(() => {
    setWorkouts(WorkoutLogger.getWorkoutHistory())
  }, [])

  // Refresh when a workout is completed or program state changes
  useEffect(() => {
    window.addEventListener("workoutCompleted", refreshWorkouts)
    window.addEventListener("programChanged", refreshWorkouts)
    return () => {
      window.removeEventListener("workoutCompleted", refreshWorkouts)
      window.removeEventListener("programChanged", refreshWorkouts)
    }
  }, [refreshWorkouts])

  // Calculate weekly goal (could be configurable)
  const weeklyGoal = 4

  // Handle period change and open custom date dialog if needed
  const handlePeriodChange = (period: string) => {
    if (period === "custom") {
      setShowCustomDateDialog(true)
    } else {
      setSelectedPeriod(period)
      setCustomStartDate(undefined)
      setCustomEndDate(undefined)
    }
  }

  // Apply custom date range
  const applyCustomDateRange = () => {
    if (customStartDate && customEndDate) {
      setSelectedPeriod("custom")
      setShowCustomDateDialog(false)
    }
  }

  // Filter workouts based on selected period
  const filteredWorkouts = useMemo(() => {
    const now = new Date()
    let startDate: Date
    let endDate: Date = now

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
      case "custom":
        if (!customStartDate || !customEndDate) {
          startDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)
        } else {
          startDate = customStartDate
          endDate = customEndDate
        }
        break
      default:
        startDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)
    }

    return workouts.filter(workout => {
      const workoutDate = new Date(workout.startTime)
      return workoutDate >= startDate && workoutDate <= endDate
    })
  }, [workouts, selectedPeriod, customStartDate, customEndDate])

  // Calculate advanced analytics
  const advancedAnalytics = useMemo<AdvancedAnalytics>(() => {
    if (filteredWorkouts.length === 0) {
      return {
        trainingLoad: [],
        acwr: { acuteLoad: 0, chronicLoad: 0, ratio: 0, zone: "safe" as const, recommendation: "No data available" },
        personalRecords: [],
        heatmap: [],
        insights: [],
        consistencyScore: 0,
        topExercises: [],
      }
    }
    return AnalyticsEngine.calculateAdvancedAnalytics(filteredWorkouts)
  }, [filteredWorkouts])

  const handleLogWorkout = onLogWorkout ?? (() => {})

  if (workouts.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobileAnalyticsHeader
          selectedPeriod={selectedPeriod}
          onPeriodChange={handlePeriodChange}
        />
        <EmptyState
          icon={BarChart3}
          title="No Workout Data Yet"
          description="Complete your first workout to start seeing analytics, progress trends, and personal records."
          action={{ label: "Start Training", onClick: handleLogWorkout }}
          className="mt-12"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <MobileAnalyticsHeader
        selectedPeriod={selectedPeriod}
        onPeriodChange={handlePeriodChange}
      />

      {/* Custom Date Range Dialog */}
      <Dialog open={showCustomDateDialog} onOpenChange={setShowCustomDateDialog}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Date Range</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Start Date</p>
              <Calendar
                mode="single"
                selected={customStartDate}
                onSelect={setCustomStartDate}
                disabled={(date) => customEndDate ? date > customEndDate : false}
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-2">End Date</p>
              <Calendar
                mode="single"
                selected={customEndDate}
                onSelect={setCustomEndDate}
                disabled={(date) => customStartDate ? date < customStartDate : false}
              />
            </div>

            {customStartDate && customEndDate && (
              <p className="text-xs text-muted-foreground">
                Selected: {customStartDate.toLocaleDateString()} to {customEndDate.toLocaleDateString()}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCustomDateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={applyCustomDateRange}
              disabled={!customStartDate || !customEndDate}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6 p-6 pt-6">
        {/* KPI Grid */}
        <EnhancedKPIGrid
          workouts={filteredWorkouts}
        />

        {/* Weekly Focus Card */}
        <WeeklyFocusCard
          workouts={filteredWorkouts}
          weeklyGoal={weeklyGoal}
          onLogWorkout={handleLogWorkout}
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
