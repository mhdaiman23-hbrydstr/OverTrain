"use client"

import { useState, useEffect, useRef } from "react"
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
  shouldAutoStart?: boolean
}

// Helper: Synchronously load initial program state from localStorage
// This prevents "flash of empty state" when transitioning back to Train tab
// (Pattern 9: Conditional Loading Spinners - DEVELOPMENT_RULES.md)
function getInitialActiveProgram(): ActiveProgram | null {
  try {
    const stored = localStorage.getItem('liftlog_active_program')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed as ActiveProgram
    }
  } catch (e) {
    console.error("[TrainSection] Failed to parse initial program state:", e)
  }
  return null
}

// Helper: Synchronously load initial workout from cache
// Extracts the currentWorkout from the cached active program
function getInitialCurrentWorkout(): { name: string; exercises: any[] } | null {
  const program = getInitialActiveProgram()
  if (program) {
    try {
      // Reconstruct the current workout name from the template
      // This is a best-effort approach using cached template data
      const workoutDay = program.template?.schedule?.[program.currentDay]
      if (workoutDay) {
        return {
          name: workoutDay.name || `Day ${program.currentDay}`,
          exercises: workoutDay.exercises || []
        }
      }
    } catch (e) {
      console.error("[TrainSection] Failed to load initial workout:", e)
    }
  }
  return null
}

export function TrainSection({ onStartWorkout, onAddProgram, shouldAutoStart = false }: TrainSectionProps) {
  // FIXED: Use lazy initializer to load from localStorage synchronously
  // This prevents rendering "Ready to Train?" when data exists in cache
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(getInitialActiveProgram)
  const [currentWorkout, setCurrentWorkout] = useState<{ name: string; exercises: any[] } | null>(getInitialCurrentWorkout)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // FIX: Use ref to track current shouldAutoStart value to prevent race conditions
  // This prevents stale closures in event listeners when shouldAutoStart prop changes
  const shouldAutoStartRef = useRef(shouldAutoStart)

  useEffect(() => {
    shouldAutoStartRef.current = shouldAutoStart
  }, [shouldAutoStart])

  const loadProgramData = async (options?: { refreshTemplate?: boolean }) => {
    try {
      console.log("[TrainSection] Loading active program...")

      // CONDITIONAL LOADING: Only show spinner on cold start (no cached data)
      // This prevents spinner flicker when returning to tab with cached data
      // (Pattern 9: Conditional Loading Spinners - DEVELOPMENT_RULES.md)
      if (!activeProgram && !currentWorkout) {
        setIsLoading(true)
      }

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

      // OPTIMIZATION: Skip database call if we have cached data and not explicitly refreshing
      // This makes switching to Train tab INSTANT when coming from Programs tab (Pattern 8)
      // When user clicks "CURRENT" program from Programs tab and switches to Train tab,
      // the data is already in state from getInitialActiveProgram() + localStorage
      const shouldRefresh = options?.refreshTemplate ?? false
      if (activeProgram && !shouldRefresh) {
        console.log("[TrainSection] INSTANT: Using cached program data, skipping database call")
        setIsLoading(false)
        return
      }

      const program = await ProgramStateManager.getActiveProgram({ refreshTemplate: shouldRefresh })
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

        // CRITICAL: Auto-start workout immediately when active program exists
        // This skips the summary screen and goes directly to workout logger
        // FIX: Use shouldAutoStartRef to prevent stale closure race conditions
        setIsLoading(false)
        if (shouldAutoStartRef.current) {
          console.log("[TrainSection] Active program found - auto-starting workout")
          onStartWorkout()
        } else {
          console.log("[TrainSection] Active program loaded but auto-start deferred (tab hidden)")
        }
      } else {
        console.warn("[TrainSection] No active program returned from ProgramStateManager")
        setActiveProgram(null)
        setCurrentWorkout(null)
        setIsLoading(false)
      }
    } catch (err) {
      console.error("[TrainSection] Error loading program data:", err)
      setError(err instanceof Error ? err.message : "Failed to load program data")
      setIsLoading(false)
    }
  }

  useEffect(() => {
    console.log("[TrainSection] Component mounted, loading program data...")
    // INSTANT: Load once on mount, not on every shouldAutoStart change
    // This prevents unnecessary database calls when user switches tabs
    loadProgramData({ refreshTemplate: false })

    // BACKGROUND: Preload next workout data while viewing current
    // This makes the next workout load instantly when user completes current
    const preloadNextWorkout = async () => {
      if (activeProgram) {
        try {
          // Calculate next workout coordinates
          let nextDay = activeProgram.currentDay + 1
          let nextWeek = activeProgram.currentWeek
          // LAZY-LOAD FIX: Use cached metadata instead of full template
          const daysPerWeek = activeProgram.templateMetadata?.days || 4

          if (nextDay > daysPerWeek) {
            nextWeek += 1
            nextDay = 1
          }

          // Only preload if within program bounds
          // LAZY-LOAD FIX: Use cached metadata for weeks
          if (nextWeek <= (activeProgram.templateMetadata?.weeks || 0)) {
            console.log("[TrainSection] Preloading next workout: Week " + nextWeek + ", Day " + nextDay)
            await ProgramStateManager.getCurrentWorkout({ week: nextWeek, day: nextDay }).catch(() => {})
          }
        } catch (error) {
          // Ignore preload errors - it's just an optimization
          console.debug("[TrainSection] Next workout preload failed (ignored):", error)
        }
      }
    }

    // Preload on a slight delay to avoid blocking current load
    const preloadTimer = setTimeout(preloadNextWorkout, 500)

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
      // Extended timeout to 1500ms to allow database deletion to complete
      // (finalizeActiveProgram() can take 500-1000ms to delete from database)
      // This prevents race condition where user navigates to Programs while deletion is in progress
      setTimeout(() => {
        loadProgramData()
      }, 1500) // Increased from 100ms to ensure database cleanup completes
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
      // Clean up preload timer
      clearTimeout(preloadTimer)

      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("programChanged", handleProgramChange)
      window.removeEventListener("programEnded", handleProgramEnded)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, []) // INSTANT: Empty deps = load only once on mount, not on tab switches

  useEffect(() => {
    // FIX: Check ref instead of prop to avoid race conditions with event listeners
    if (shouldAutoStartRef.current && activeProgram && currentWorkout) {
      console.log("[TrainSection] Auto-start triggered from visibility change")
      onStartWorkout()
    }
  }, [shouldAutoStart, activeProgram, currentWorkout, onStartWorkout])

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
                {/* LAZY-LOAD FIX: Use cached metadata for template name */}
                <CardTitle className="text-lg">{activeProgram.templateMetadata?.name || 'My Program'}</CardTitle>
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
