"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Plus, Minus, Calendar } from "lucide-react"
import { ProgramStateManager, type ActiveProgram } from "@/lib/program-state"
import { WorkoutLogger } from "@/lib/workout-logger"
import { useAuth } from "@/contexts/auth-context"
import { ProgramTemplateService } from "@/lib/services/program-template-service"
import type { GymTemplate } from "@/lib/gym-templates"

interface WorkoutCalendarProps {
  onWorkoutClick?: (week: number, day: number) => void
  selectedWeek?: number
  selectedDay?: number
  readOnly?: boolean
  historicalProgram?: {
    templateId: string
    instanceId: string
    name: string
    totalWeeks: number
    daysPerWeek: number
  }
  historicalWorkouts?: Array<{ week?: number; day?: number; completed: boolean }>
}

export function WorkoutCalendar({ onWorkoutClick, selectedWeek, selectedDay, readOnly, historicalProgram, historicalWorkouts }: WorkoutCalendarProps) {
  const { user } = useAuth()
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(null)
  const [totalWeeks, setTotalWeeks] = useState(historicalProgram?.totalWeeks || 6)
  const [completionStatus, setCompletionStatus] = useState<Map<string, boolean>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [historicalTemplate, setHistoricalTemplate] = useState<GymTemplate | null>(null)

  // CRITICAL FIX: Prevent infinite recalculation loops
  const isRecalculatingRef = useRef(false)
  const lastRecalculationTimeRef = useRef<number>(0)
  const RECALC_DEBOUNCE_MS = 2000 // Don't recalculate more than once every 2 seconds

  useEffect(() => {
    // Skip loading if in read-only mode (historical program viewer)
    if (readOnly) {
      console.log("[Calendar] Read-only mode, skipping active program load")
      setIsLoading(false)
      return
    }

    // Load active program instantly (database-first architecture handles data loading in auth)
    if (user?.id) {
      console.log("[Calendar] Loading active program instantly")
      loadActiveProgram()
    }

    // Listen for program changes (database sync, program state changes)
    const handleProgramChange = () => {
      console.log("[Calendar] Program changed, refreshing calendar")
      loadActiveProgram()
    }

    window.addEventListener("programChanged", handleProgramChange)

    // Listen for workout completion (optimistic update - instant UI feedback)
    const handleWorkoutCompleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ week: number; day: number; completed: boolean }>
      const { week, day, completed } = customEvent.detail

      console.log("[Calendar] Workout completed event received:", { week, day, completed })

      // Apply optimistic update immediately using functional update (no dependency needed)
      const key = `${week}-${day}`
      setCompletionStatus(prev => {
        const updatedMap = new Map(prev)
        updatedMap.set(key, completed)
        return updatedMap
      })
    }

    window.addEventListener("workoutCompleted", handleWorkoutCompleted)

    return () => {
      window.removeEventListener("programChanged", handleProgramChange)
      window.removeEventListener("workoutCompleted", handleWorkoutCompleted)
    }
  }, [user?.id])

  // Refresh calendar when user ID changes (login/logout) - skip in read-only mode
  useEffect(() => {
    if (readOnly || !user?.id) return

    // Only load if we haven't already loaded in the previous effect
    // This prevents double loading when user logs in
    const timeoutId = setTimeout(() => {
      if (!activeProgram) {
        console.log("[Calendar] No active program found after delay, loading...")
        loadActiveProgram()
      }
    }, 500) // Wait a bit to see if database sync loads it first

    return () => clearTimeout(timeoutId)
  }, [user?.id, readOnly])

  // CRITICAL FIX: Periodic refresh without forced recalculation
  // Only refresh UI data from localStorage, don't trigger recalc on every tick
  useEffect(() => {
    if (readOnly || !user?.id) return

    const refreshInterval = setInterval(() => {
      console.log("[Calendar] Periodic refresh - updating UI from cache")
      // Just reload the active program state, don't force recalculation
      ProgramStateManager.getActiveProgram({ skipDatabaseLoad: true }).then(program => {
        if (program) {
          setActiveProgram(program)
        }
      })
    }, 15000) // Refresh every 15 seconds

    return () => clearInterval(refreshInterval)
  }, [user?.id, readOnly])

  // In read-only mode, fetch template to get real day names from DB
  useEffect(() => {
    if (!readOnly) return
    const templateId = historicalProgram?.templateId
    if (!templateId) return

    let mounted = true
    ProgramTemplateService.getInstance()
      .getTemplate(templateId)
      .then((tpl) => {
        if (mounted) setHistoricalTemplate(tpl)
      })
      .catch(() => {})

    return () => {
      mounted = false
    }
  }, [readOnly, historicalProgram?.templateId])

  // Development tools for debugging calendar state
  useEffect(() => {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      ;(window as any).CalendarDev = {
        debugCalendarState: () => {
          console.log("=== Calendar Debug Info ===")
          console.log("Active Program:", activeProgram)
          console.log("User:", user)
          console.log("Current Week:", activeProgram?.currentWeek)
          console.log("Current Day:", activeProgram?.currentDay)
          console.log("Total Weeks:", totalWeeks)

          // Check completed workouts
          if (activeProgram && user?.id) {
            console.log("Completed workouts:")
            for (let week = 1; week <= activeProgram.currentWeek; week++) {
              for (let day = 1; day <= 3; day++) {
                const status = getWorkoutStatus(week, day)
                if (status === "completed") {
                  console.log(`  Week ${week}, Day ${day}: ${status}`)
                }
              }
            }

            // Debug Week 2 specifically
            console.log("Week 2 Day 1 Status:")
            console.log(`  Week 2 Day 1: ${getWorkoutStatus(2, 1)}`)
          }
          console.log("=== End Calendar Debug Info ===")
        },
        debugWeek2Day1: () => {
          console.log("=== Week 2 Day 1 Debug ===")
          if (!activeProgram || !user?.id) {
            console.log("No active program or user")
            return
          }

          console.log("Program State:", {
            currentWeek: activeProgram.currentWeek,
            currentDay: activeProgram.currentDay
          })

          console.log("Week 1 completions:")
          for (let day = 1; day <= 3; day++) {
            const completed = WorkoutLogger.hasCompletedWorkout(1, day, user.id, activeProgram.instanceId)
            console.log(`  Week 1 Day ${day}: ${completed}`)
          }

          console.log("Week 2 completions:")
          for (let day = 1; day <= 3; day++) {
            const completed = WorkoutLogger.hasCompletedWorkout(2, day, user.id, activeProgram.instanceId)
            console.log(`  Week 2 Day ${day}: ${completed}`)
          }

          console.log("Week 2 Day 1 details:")
          const workout = WorkoutLogger.getCompletedWorkout(2, 1, user.id, activeProgram.instanceId)
          console.log("  Completed workout:", workout)
          console.log("=== End Week 2 Day 1 Debug ===")
        },
        debugProgramProgress: async () => {
          console.log("=== Program Progress Debug ===")
          if (!user?.id) {
            console.log("No user found")
            return
          }

          const program = await ProgramStateManager.getActiveProgram()
          if (!program) {
            console.log("No active program found")
            return
          }

          console.log("Active Program:", {
            currentWeek: program.currentWeek,
            currentDay: program.currentDay,
            templateId: program.templateId,
            completedWorkouts: program.completedWorkouts
          })

          const daysPerWeek = Object.keys(program.template.schedule).length
          console.log("Days per week:", daysPerWeek)

          // Check completion status for all weeks up to current
          for (let week = 1; week <= Math.max(4, program.currentWeek); week++) {
            console.log(`\nWeek ${week}:`)
            for (let day = 1; day <= daysPerWeek; day++) {
              const completed = WorkoutLogger.hasCompletedWorkout(week, day, user.id, program.instanceId)
              const workout = WorkoutLogger.getCompletedWorkout(week, day, user.id, program.instanceId)
              console.log(`  Day ${day}: ${completed ? '✅ COMPLETED' : '❌ INCOMPLETE'}`)
              if (completed && workout) {
                console.log(`    Exercise count: ${workout.exercises.length}`)
                console.log(`    Completed at: ${new Date(workout.endTime || workout.startTime).toLocaleString()}`)
              }
            }
          }

          // Show week completion status
          for (let week = 1; week <= Math.max(4, program.currentWeek); week++) {
            const isWeekComplete = WorkoutLogger.isWeekCompleted(week, daysPerWeek, user.id, program.instanceId)
            console.log(`\nWeek ${week} is ${isWeekComplete ? '✅ COMPLETE' : '❌ INCOMPLETE'}`)
          }

          console.log("=== End Program Progress Debug ===")
        },
        forceRefresh: () => loadActiveProgram(),
        debugDay1Workout: async () => {
          console.log("=== Day 1 Workout Debug ===")
          if (!activeProgram || !user?.id) {
            console.log("No active program or user")
            return
          }

          console.log("Active Program:", {
            templateId: activeProgram.templateId,
            templateName: activeProgram.template.name,
            currentWeek: activeProgram.currentWeek,
            currentDay: activeProgram.currentDay
          })

          console.log("Template Schedule (raw):")
          Object.entries(activeProgram.template.schedule).forEach(([key, value]) => {
            console.log(`  ${key}: ${value.name}`)
          })

          console.log("Template Schedule (sorted):")
          if (template) {
            scheduleKeys.forEach((key, index) => {
              console.log(`  Day ${index + 1}: ${key} -> ${template.schedule[key]?.name}`)
            })
          }

          // Check what workout the calendar shows for Day 1
          const day1WorkoutName = getWorkoutName(1)
          console.log("Calendar Day 1 shows:", day1WorkoutName)

          // Check what the workout logger shows for current workout
          const currentWorkout = await WorkoutLogger.getInProgressWorkout(activeProgram.currentWeek, activeProgram.currentDay, user.id)
          if (currentWorkout) {
            console.log("Current workout from logger:", {
              workoutName: currentWorkout.workoutName,
              week: currentWorkout.week,
              day: currentWorkout.day
            })
          }

          // Check what program state thinks the current workout should be
          const expectedWorkout = await ProgramStateManager.getCurrentWorkout()
          if (expectedWorkout) {
            console.log("Expected workout from program state:", {
              name: expectedWorkout.name,
              week: activeProgram.currentWeek,
              day: activeProgram.currentDay
            })
          }

          // Check completion status for all weeks
          console.log("Completion status:")
          for (let week = 1; week <= Math.max(3, activeProgram.currentWeek); week++) {
            for (let day = 1; day <= 3; day++) {
              const completed = WorkoutLogger.hasCompletedWorkout(week, day, user.id, activeProgram.instanceId)
              if (completed || (week === activeProgram.currentWeek && day === activeProgram.currentDay)) {
                console.log(`  Week ${week} Day ${day}: ${completed ? '✅ COMPLETED' : '❌ INCOMPLETE'}`)
              }
            }
          }

          console.log("=== End Day 1 Workout Debug ===")
        }
      }
      console.log("[Calendar] Development tools available at window.CalendarDev")
    }
  }, [activeProgram, user])

  const loadActiveProgram = async () => {
    if (readOnly) return

    // Only show loading spinner if we don't have a program yet (cold start)
    // This prevents spinner flash when navigating between weeks/days
    if (!activeProgram) {
      setIsLoading(true)
    }

    const program = await ProgramStateManager.getActiveProgram()
    setActiveProgram(program)
    setIsLoading(false)
    if (program && program.template) {
      const baseWeeks = program.template.weeks || 4
      // Use exact week count from template (no +2 extension)
      setTotalWeeks(baseWeeks)
      console.log("[Calendar] Active program loaded:", {
        name: program.template.name,
        currentWeek: program.currentWeek,
        currentDay: program.currentDay,
        totalWeeks: baseWeeks
      })

      // CRITICAL FIX: Only recalculate progress if:
      // 1. Not already recalculating (prevent infinite loop)
      // 2. Enough time has passed since last recalculation (debounce)
      // 3. Current workout is actually completed (indicating we should advance)
      if (user?.id) {
        const now = Date.now()
        const timeSinceLastRecalc = now - lastRecalculationTimeRef.current

        // Skip if already recalculating or debounce period hasn't passed
        if (isRecalculatingRef.current) {
          console.log("[Calendar] Recalculation already in progress, skipping")
          return
        }

        if (timeSinceLastRecalc < RECALC_DEBOUNCE_MS) {
          console.log(`[Calendar] Debounce active (${timeSinceLastRecalc}ms < ${RECALC_DEBOUNCE_MS}ms), skipping recalculation`)
          return
        }

        // Check if current workout is already completed (indicating we should advance)
        // CRITICAL FIX: Use optimistic status first to avoid flickering during transitions
        const key = `${program.currentWeek}-${program.currentDay}`
        const optimisticCompleted = completionStatus.get(key)
        const currentWorkoutCompleted =
          optimisticCompleted ??
          WorkoutLogger.hasCompletedWorkout(
            program.currentWeek,
            program.currentDay,
            user.id,
            program.instanceId
          )

        if (currentWorkoutCompleted) {
          console.log("[Calendar] Current workout is already completed, recalculating to advance...")

          // Set recalculation guard
          isRecalculatingRef.current = true
          lastRecalculationTimeRef.current = now

          try {
            await ProgramStateManager.recalculateProgress({ silent: true })

            // Reload the program after recalculation
            const recalculatedProgram = await ProgramStateManager.getActiveProgram()
            setActiveProgram(recalculatedProgram)
            console.log("[Calendar] Program after recalculation:", {
              currentWeek: recalculatedProgram?.currentWeek,
              currentDay: recalculatedProgram?.currentDay
            })
          } finally {
            // Always clear the guard, even if recalculation fails
            isRecalculatingRef.current = false
          }
        } else {
          console.log("[Calendar] Program state appears consistent, no recalculation needed")
        }
      }
    } else {
      console.log("[Calendar] No active program found")
    }
  }

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <Spinner size="md" />
            <span className="text-sm text-muted-foreground">Loading calendar...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // In read-only mode, use historical program data instead of active program
  if (!activeProgram && !readOnly) {
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

  // Use activeProgram data if available, otherwise use historical program data
  const daysPerWeek = readOnly && historicalProgram
    ? historicalProgram.daysPerWeek
    : activeProgram
      ? Object.keys(activeProgram.template.schedule).length
      : 3 // fallback

  const currentWeek = activeProgram?.currentWeek || selectedWeek || 1
  const currentDay = activeProgram?.currentDay || selectedDay || 1
  const template = activeProgram?.template || (readOnly ? historicalTemplate || undefined : undefined)

  // For historical mode, create minimal schedule keys
  const scheduleKeys = template
    ? Object.keys(template.schedule).sort((a, b) => {
        const numA = parseInt(a.replace(/[^0-9]/g, ''))
        const numB = parseInt(b.replace(/[^0-9]/g, ''))
        return numA - numB
      })
    : Array.from({ length: daysPerWeek }, (_, i) => `day${i + 1}`)

  // Debug: Log the schedule order (only in development)
  if (process.env.NODE_ENV === "development" && template) {
    console.log('[Calendar] Schedule keys order:', scheduleKeys)
    scheduleKeys.forEach((key, index) => {
      console.log(`  Day ${index + 1}: ${key} -> ${template.schedule[key]?.name}`)
    })
  }

  const getRIRLabel = (week: number) => {
    if (week <= 2) return `${4 - week} RIR`
    if (week === 3) return "1 RIR"
    if (week === 4) return "0 RIR"
    return `${Math.max(0, 8 - week)} RIR`
  }

  const getFirstIncompleteDay = (week: number): number | null => {
    if (week !== currentWeek) return null

    for (let day = 1; day <= daysPerWeek; day++) {
      const hasCompleted = WorkoutLogger.hasCompletedWorkout(week, day, user?.id, activeProgram?.instanceId)
      if (!hasCompleted) {
        return day
      }
    }
    return null
  }

  const getWorkoutStatus = (week: number, day: number) => {
    // For read-only mode (historical programs), check historical workouts
    if (readOnly && historicalWorkouts) {
      const hasCompletedWorkout = historicalWorkouts.some(
        (w) => w.week === week && w.day === day && w.completed
      )
      return hasCompletedWorkout ? "completed" : "future"
    }

    // Check optimistic completion status first (instant updates)
    const key = `${week}-${day}`
    const optimisticCompleted = completionStatus.get(key)

    // Fall back to database check if no optimistic update
    const hasCompletedWorkout =
      optimisticCompleted ??
      WorkoutLogger.hasCompletedWorkout(week, day, user?.id, activeProgram?.instanceId)

    // Minimal debug logging (only for critical issues)
    if (week === 1 && day === 1 && process.env.NODE_ENV === "development") {
      console.log(`[Calendar] Day 1 status:`, {
        hasCompletedWorkout,
        userId: user?.id
      })
    }

    // The WorkoutLogger.hasCompletedWorkout method now includes proper validation
    if (hasCompletedWorkout) {
      return "completed"
    } else if (week === currentWeek) {
      // For current week, mark the first incomplete day as "current" (red)
      const firstIncompleteDay = getFirstIncompleteDay(week)

      // Debug for current week logic
      if (week === 2) {
        console.log("[Calendar] Week 2 debug:", {
          firstIncompleteDay,
          checkingDay: day,
          shouldMarkAsCurrent: day === firstIncompleteDay,
          allWeekCompletions: Array.from({ length: daysPerWeek }, (_, d) => ({
            day: d + 1,
            completed: WorkoutLogger.hasCompletedWorkout(week, d + 1, user?.id, activeProgram?.instanceId)
          }))
        })
      }

      if (day === firstIncompleteDay) {
        return "current"
      }

      // ADDITIONAL LOGIC: If this is the currentDay from program state, also mark as current
      if (day === currentDay) {
        console.log("[Calendar] Marking as current based on program state:", { week, day, currentDay })
        return "current"
      }
    }
    return "future"
  }

  const getWorkoutName = (dayIndex: number) => {
    // In read-only mode without template, just return day number
    if (readOnly && !template) {
      return `Day ${dayIndex}`
    }

    // More robust approach: directly use day1, day2, day3 keys
    const expectedKey = `day${dayIndex}`
    const workout = template?.schedule[expectedKey]
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
    setTotalWeeks((prev) => Math.min(prev + 1, 12))
  }

  const removeWeek = () => {
    setTotalWeeks((prev) => Math.max(prev - 1, 4))
  }

  return (
    <Card className="mb-0 border-0 shadow-none bg-transparent overflow-visible">
      <CardContent className="p-3 sm:p-4 overflow-visible">
        {/* Week controls */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground">WEEKS</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={removeWeek} disabled={totalWeeks <= 4}>
              <Minus className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={addWeek} disabled={totalWeeks >= 12}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto -mx-3 sm:-mx-4 px-3 sm:px-4">
          <div className="flex gap-1.5 sm:gap-2 pb-2 w-max">
            {Array.from({ length: totalWeeks }, (_, weekIndex) => {
              const week = weekIndex + 1
              const isDeloadWeek = week === 5 && totalWeeks >= 5

              return (
                <div key={week} className="flex flex-col gap-1.5 sm:gap-2 min-w-[60px] sm:min-w-[75px] flex-shrink-0">
                  {/* Week header */}
                  <div className="text-center border-b pb-2">
                    <div className="text-xs font-medium text-muted-foreground mb-1">{isDeloadWeek ? "DL" : week}</div>
                    <div className="text-xs text-muted-foreground">{isDeloadWeek ? "8 RIR" : getRIRLabel(week)}</div>
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
