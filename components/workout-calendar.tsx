"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Minus, Calendar } from "lucide-react"
import { ProgramStateManager, type ActiveProgram } from "@/lib/program-state"
import { WorkoutLogger } from "@/lib/workout-logger"
import { useAuth } from "@/contexts/auth-context"

interface WorkoutCalendarProps {
  onWorkoutClick?: (week: number, day: number) => void
  selectedWeek?: number
  selectedDay?: number
}

const DEFAULT_TEMPLATE_WEEKS = 6
const MIN_VISIBLE_WEEKS = 4
const MAX_VISIBLE_WEEKS = 12

export function WorkoutCalendar({ onWorkoutClick, selectedWeek, selectedDay }: WorkoutCalendarProps) {
  const { user } = useAuth()
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(null)
  const [totalWeeks, setTotalWeeks] = useState(DEFAULT_TEMPLATE_WEEKS)
  const [completionStatus, setCompletionStatus] = useState<Map<string, boolean>>(new Map())
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)

  // Instant load: Load active program immediately from localStorage
  useEffect(() => {
    console.log("[Calendar] Loading active program instantly")
    loadActiveProgram()
  }, [])

  // Load completion status asynchronously in background
  useEffect(() => {
    if (activeProgram && user?.id) {
      loadCompletionStatus()
    }
  }, [activeProgram, user?.id])

  // Listen for program changes
  useEffect(() => {
    const handleProgramChange = () => {
      console.log("[Calendar] Program changed, refreshing")
      // Clear completion status cache to prevent stale data
      setCompletionStatus(new Map())
      loadActiveProgram()
    }

    window.addEventListener("programChanged", handleProgramChange)
    return () => window.removeEventListener("programChanged", handleProgramChange)
  }, [])

  // Background data sync (non-blocking)
  useEffect(() => {
    if (user?.id) {
      // Run data operations in background with low priority
      setTimeout(() => {
        performBackgroundDataSync()
      }, 1000) // Delay to not block initial render
    }
  }, [user?.id])

  // Development tools for debugging calendar state (single consolidated effect)
  useEffect(() => {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      const devTools = {
        debugCalendarState: () => {
          console.log("=== Calendar Debug Info ===")
          console.log("Active Program:", activeProgram)
          console.log("User:", user)
          console.log("Current Week:", activeProgram?.currentWeek)
          console.log("Current Day:", activeProgram?.currentDay)
          console.log("Total Weeks:", totalWeeks)
          console.log("Completion Status Cache Size:", completionStatus.size)
          console.log("Loading Status:", isLoadingStatus)
          console.log("=== End Calendar Debug Info ===")
        },
        debugCompletionCache: () => {
          console.log("=== Completion Status Cache ===")
          completionStatus.forEach((completed, key) => {
            console.log(`  ${key}: ${completed ? '✅' : '❌'}`)
          })
          console.log("=== End Cache Debug ===")
        },
        forceRefresh: () => {
          loadActiveProgram()
          loadCompletionStatus()
        },
        forceBackgroundSync: () => {
          performBackgroundDataSync()
        }
      }

      ;(window as any).CalendarDev = devTools
      console.log("[Calendar] Development tools available at window.CalendarDev")
    }
  }, [activeProgram, user, completionStatus, isLoadingStatus, totalWeeks])

  const loadActiveProgram = () => {
    // Instant load from localStorage only
    const program = ProgramStateManager.getActiveProgram()
    setActiveProgram(program)

    if (program) {
      const templateWeeks = program.template.weeks || DEFAULT_TEMPLATE_WEEKS
      const initialWeeks = Math.max(templateWeeks, MIN_VISIBLE_WEEKS)
      setTotalWeeks(initialWeeks)
      console.log("[Calendar] Active program loaded instantly:", {
        name: program.template.name,
        currentWeek: program.currentWeek,
        currentDay: program.currentDay,
        templateWeeks,
        totalWeeks: initialWeeks
      })
    } else {
      console.log("[Calendar] No active program found")
    }
  }

  const loadCompletionStatus = async () => {
    if (!activeProgram || !user?.id) return

    setIsLoadingStatus(true)
    const statusMap = new Map<string, boolean>()

    try {
      // Load completion status for ALL visible weeks (not just currentWeek + 2)
      for (let week = 1; week <= totalWeeks; week++) {
        for (let day = 1; day <= 3; day++) {
          const key = `${week}-${day}`
          const isCompleted = WorkoutLogger.hasCompletedWorkout(week, day, user.id)
          statusMap.set(key, isCompleted)
        }
      }

      setCompletionStatus(statusMap)
      console.log("[Calendar] Completion status loaded for", statusMap.size, "workouts")
    } catch (error) {
      console.error("[Calendar] Failed to load completion status:", error)
    } finally {
      setIsLoadingStatus(false)
    }
  }

  const performBackgroundDataSync = async () => {
    if (!user?.id) return

    try {
      console.log("[Calendar] Performing background data sync")

      // Run cleanup operations in background
      await WorkoutLogger.migrateGlobalToUserSpecific(user.id)
      await WorkoutLogger.migrateCompletedWorkoutsToHistory(user.id)
      await WorkoutLogger.cleanupCorruptedWorkouts(user.id)
      await WorkoutLogger.cleanupFalseSkippedSets(user.id)
      await WorkoutLogger.validateAndRepairWorkoutIntegrity(user.id)

      // Sync with database
      await WorkoutLogger.loadFromDatabase(user.id, false) // false = don't block UI

      // Check if program needs recalculation (background only)
      const program = ProgramStateManager.getActiveProgram()
      if (program && user?.id) {
        const currentWorkoutCompleted = WorkoutLogger.hasCompletedWorkout(program.currentWeek, program.currentDay, user.id)

        if (currentWorkoutCompleted) {
          console.log("[Calendar] Background: Current workout completed, triggering recalculation")
          ProgramStateManager.recalculateProgress()

          // Reload program if it changed
          setTimeout(() => {
            const updatedProgram = ProgramStateManager.getActiveProgram()
            if (updatedProgram && (
              updatedProgram.currentWeek !== program.currentWeek ||
              updatedProgram.currentDay !== program.currentDay
            )) {
              console.log("[Calendar] Background: Program updated, refreshing display")
              setActiveProgram(updatedProgram)
              loadCompletionStatus() // Reload completion status
            }
          }, 100)
        }
      }

      // Reload completion status after sync
      loadCompletionStatus()

      console.log("[Calendar] Background data sync completed")
    } catch (error) {
      console.error("[Calendar] Background data sync failed:", error)
    }
  }

  if (!activeProgram) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">No active program</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { template, currentWeek, currentDay } = activeProgram
  const templateWeekCount = template.weeks || DEFAULT_TEMPLATE_WEEKS
  // Ensure schedule keys are sorted correctly (day1, day2, day3, etc.)
  const scheduleKeys = Object.keys(template.schedule).sort((a, b) => {
    // Extract numbers from keys like "day1", "day2", etc.
    const numA = parseInt(a.replace(/[^0-9]/g, ''))
    const numB = parseInt(b.replace(/[^0-9]/g, ''))
    return numA - numB
  })
  const daysPerWeek = scheduleKeys.length

  // Debug: Log the schedule order (only in development)
  if (process.env.NODE_ENV === "development") {
    console.log('[Calendar] Schedule keys order:', scheduleKeys)
    scheduleKeys.forEach((key, index) => {
      console.log(`  Day ${index + 1}: ${key} -> ${template.schedule[key]?.name}`)
    })
  }

  const getRIRLabel = (week: number) => {
    if (week === templateWeekCount) return "Deload"

    const rirSchedule = ["3 RIR", "2 RIR", "1 RIR", "0 RIR", "0 RIR"]
    return rirSchedule[Math.min(week - 1, rirSchedule.length - 1)] || "3 RIR"
  }

  const getFirstIncompleteDay = (week: number): number | null => {
    if (week !== currentWeek) return null

    for (let day = 1; day <= daysPerWeek; day++) {
      const statusKey = `${week}-${day}`
      const hasCompleted = completionStatus.has(statusKey)
        ? completionStatus.get(statusKey)
        : WorkoutLogger.hasCompletedWorkout(week, day, user?.id) // Fallback

      if (!hasCompleted) {
        return day
      }
    }
    return null
  }

  const getWorkoutStatus = (week: number, day: number) => {
    // Use cached completion status for instant display
    const statusKey = `${week}-${day}`
    const hasCompletedWorkout = completionStatus.has(statusKey)
      ? completionStatus.get(statusKey)
      : WorkoutLogger.hasCompletedWorkout(week, day, user?.id) // Fallback to direct check

    // Debug logging (only for critical issues in development)
    if (week === 1 && day === 1 && process.env.NODE_ENV === "development") {
      console.log(`[Calendar] Day 1 status:`, {
        hasCompletedWorkout,
        fromCache: completionStatus.has(statusKey),
        userId: user?.id
      })
    }

    if (hasCompletedWorkout) {
      return "completed"
    } else if (week === currentWeek) {
      // For current week, mark the first incomplete day as "current" (red)
      const firstIncompleteDay = getFirstIncompleteDay(week)

      if (day === firstIncompleteDay) {
        return "current"
      }

      // If this is the currentDay from program state, also mark as current
      if (day === currentDay) {
        return "current"
      }
    }
    return "future"
  }

  const getWorkoutName = (dayIndex: number) => {
    // More robust approach: directly use day1, day2, day3 keys
    const expectedKey = `day${dayIndex}`
    const workout = template.schedule[expectedKey]
    const workoutName = workout?.name || `Day ${dayIndex}`

    // Debug logging (only for Day 1 in development)
    if (dayIndex === 1 && process.env.NODE_ENV === "development") {
      console.log(`[Calendar] getWorkoutName for Day ${dayIndex}:`, {
        dayIndex,
        expectedKey,
        workoutName,
        found: !!workout
      })
    }

    return workoutName
  }

  const isWorkoutBlocked = (week: number, day: number): boolean => {
    // The blocking will be handled in the workout-logger component
    return false
  }

  const handleWorkoutClick = (week: number, day: number) => {
    console.log("[v0] Calendar click:", { week, day, currentWeek, currentDay })

    console.log("[v0] Allowing click - calling onWorkoutClick")
    onWorkoutClick?.(week, day)
  }

  const addWeek = () => {
    setTotalWeeks((prev) => Math.min(prev + 1, MAX_VISIBLE_WEEKS))
  }

  const removeWeek = () => {
    setTotalWeeks((prev) => Math.max(prev - 1, MIN_VISIBLE_WEEKS))
  }

  return (
    <Card className="mb-0 border-0 shadow-none bg-transparent overflow-visible">
      <CardContent className="p-3 sm:p-4 overflow-visible">
        {/* Week controls with optional loading indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">WEEKS</span>
            {isLoadingStatus && (
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" title="Updating completion status..." />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={removeWeek} disabled={totalWeeks <= MIN_VISIBLE_WEEKS}>
              <Minus className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={addWeek} disabled={totalWeeks >= MAX_VISIBLE_WEEKS}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto -mx-3 sm:-mx-4 px-3 sm:px-4">
          <div className="flex gap-1.5 sm:gap-2 pb-2 w-max">
            {Array.from({ length: totalWeeks }, (_, weekIndex) => {
              const week = weekIndex + 1
              const isDeloadWeek = week === templateWeekCount

              return (
                <div key={week} className="flex flex-col gap-1.5 sm:gap-2 min-w-[60px] sm:min-w-[75px] flex-shrink-0">
                  {/* Week header */}
                  <div className="text-center border-b pb-2">
                    <div className="text-xs font-medium text-muted-foreground mb-1">{isDeloadWeek ? "DL" : week}</div>
                    <div className="text-xs text-muted-foreground">{isDeloadWeek ? "Deload" : getRIRLabel(week)}</div>
                  </div>

                  {/* Day buttons for this week */}
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: daysPerWeek }, (_, dayIndex) => {
                      const day = dayIndex + 1
                      const dayName = getWorkoutName(day)
                      const status = getWorkoutStatus(week, day)
                      const isSelected = selectedWeek === week && selectedDay === day
                      const blocked = isWorkoutBlocked(week, day)

                      return (
                        <Button
                          key={`${week}-${day}`}
                          variant="outline"
                          size="sm"
                          className={`h-8 sm:h-9 text-xs font-medium transition-colors cursor-pointer ${
                            status === "completed"
                              ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
                              : status === "current"
                                ? "bg-red-100 text-red-800 border-red-200 hover:bg-red-200"
                                : "bg-background text-muted-foreground border-border hover:bg-muted"
                          } ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""}`}
                          onClick={() => handleWorkoutClick(week, day)}
                        >
                          {dayName.split(" ")[0]}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

