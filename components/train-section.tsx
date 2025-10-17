"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { Calendar, Clock, Dumbbell, Plus, Play } from "lucide-react"
import { ProgramStateManager, type ActiveProgram } from "@/lib/program-state"

interface TrainSectionProps {
  onStartWorkout: () => void
  onAddProgram: () => void
}

export function TrainSection({ onStartWorkout, onAddProgram }: TrainSectionProps) {
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(null)
  const [currentWorkout, setCurrentWorkout] = useState<{ name: string; exercises: any[] } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProgramData = async () => {
    try {
      console.log("[TrainSection] Loading active program...")
      
      // Check localStorage first
      const stored = localStorage.getItem('liftlog_active_program')
      console.log("[TrainSection] localStorage has active program:", !!stored)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          console.log("[TrainSection] Active program templateId in localStorage:", parsed.templateId)
          console.log("[TrainSection] Has template data:", !!parsed.template)
        } catch (e) {
          console.error("[TrainSection] Failed to parse localStorage:", e)
        }
      }
      
      // Refresh template from database on load
      const program = await ProgramStateManager.getActiveProgram({ refreshTemplate: true })
      console.log("[TrainSection] Loaded active program:", program ? {
        templateId: program.templateId,
        templateName: program.template?.name,
        currentWeek: program.currentWeek,
        currentDay: program.currentDay
      } : null)

      if (program) {
        setActiveProgram(program)
        const workout = await ProgramStateManager.getCurrentWorkout()
        console.log("[TrainSection] Loaded current workout:", workout)
        setCurrentWorkout(workout)
      } else {
        console.warn("[TrainSection] No active program returned from ProgramStateManager")
        setActiveProgram(null)
        setCurrentWorkout(null)
      }

      setIsLoading(false)
    } catch (err) {
      console.error("[TrainSection] Error loading program data:", err)
      setError(err instanceof Error ? err.message : "Failed to load program data")
      setIsLoading(false)
    }
  }

  useEffect(() => {
    console.log("[TrainSection] Component mounted or updated, loading program data...")
    loadProgramData()

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "liftlog_active_program") {
        console.log("[TrainSection] Active program changed in localStorage, reloading...")
        loadProgramData()
      }
    }

    const handleProgramChange = () => {
      console.log("[TrainSection] Active program changed event received, reloading...")
      loadProgramData()
    }

    const handleProgramEnded = async () => {
      console.log("[TrainSection] Program ended event received, showing CTA...")
      // Immediately clear state to show CTA
      setActiveProgram(null)
      setCurrentWorkout(null)
      setIsLoading(false)

      // Force refresh from database to ensure no stale data
      setTimeout(() => {
        loadProgramData()
      }, 100) // Small delay to let database update complete
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("[TrainSection] Tab became visible, reloading program data...")
        loadProgramData()
      }
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("programChanged", handleProgramChange)
    window.addEventListener("programEnded", handleProgramEnded)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("programChanged", handleProgramChange)
      window.removeEventListener("programEnded", handleProgramEnded)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  const handleStartWorkout = () => {
    console.log("[v0] Starting workout with current workout data:", currentWorkout)
    onStartWorkout()
  }

  const handleWorkoutClick = (week: number, day: number) => {
    console.log("[v0] Clicked workout:", { week, day })
    // TODO: Implement historical workout view
    // This could open a modal or navigate to a detailed view of the completed workout
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner size="xl" className="mx-auto" />
          <div className="text-lg font-medium">Loading your program...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-lg font-medium text-red-500">Error loading program</div>
          <div className="text-sm text-muted-foreground">{error}</div>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  // For first-time users or when no program is active
  if (!activeProgram) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="space-y-6 pt-8">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Dumbbell className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Ready to Train?</h1>
              <p className="text-muted-foreground text-sm">
                You don't have an active program yet. Start by selecting a program that matches your goals.
              </p>
            </div>
          </div>

          <Card className="border-dashed border-2">
            <CardContent className="p-6 text-center space-y-4">
              <Plus className="h-8 w-8 text-primary mx-auto" />
              <div className="space-y-2">
                <h3 className="font-semibold">Add Your First Program</h3>
                <p className="text-sm text-muted-foreground">Choose from our library of proven workout programs</p>
              </div>
              <Button className="w-full gradient-primary text-primary-foreground" onClick={onAddProgram}>
                Browse Programs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // When user has an active program
  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 pt-4">
          <h1 className="text-2xl font-bold">Train</h1>
          <p className="text-muted-foreground text-sm">Your active program</p>
        </div>

        {/* Active Program Card */}
        <Card className="gradient-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{activeProgram.template.name}</CardTitle>
                <CardDescription>
                  Week {activeProgram.currentWeek} • Day {activeProgram.currentDay}
                </CardDescription>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Program Progress</span>
                <span>{Math.round(activeProgram.progress)}%</span>
              </div>
              <Progress value={activeProgram.progress} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {activeProgram.completedWorkouts} of {activeProgram.totalWorkouts} workouts completed
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Workout */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Today's Workout</CardTitle>
            <CardDescription>{currentWorkout?.name || "No workout scheduled"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Today</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>45-60 min</span>
              </div>
            </div>

            {currentWorkout && (
              <div className="text-sm text-muted-foreground">{currentWorkout.exercises.length} exercises scheduled</div>
            )}

            <Button
              className="w-full gradient-primary text-primary-foreground"
              onClick={handleStartWorkout}
              disabled={!currentWorkout}
            >
              <Play className="h-4 w-4 mr-2" />
              Start Workout
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground">QUICK ACTIONS</h3>

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="text-sm font-medium">View Schedule</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Plus className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="text-sm font-medium">Add Exercise</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Workouts */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground">RECENT WORKOUTS</h3>

          <div className="space-y-2">
            {[
              { name: "Upper Body", date: "Yesterday", duration: "52 min" },
              { name: "Lower Body", date: "2 days ago", duration: "48 min" },
              { name: "Upper Body", date: "4 days ago", duration: "55 min" },
            ].map((workout, index) => (
              <Card key={index}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{workout.name}</div>
                      <div className="text-xs text-muted-foreground">{workout.date}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{workout.duration}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
