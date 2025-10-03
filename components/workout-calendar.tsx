"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Minus, Calendar } from "lucide-react"
import { ProgramStateManager, type ActiveProgram } from "@/lib/program-state"
import { WorkoutLogger } from "@/lib/workout-logger"

interface WorkoutCalendarProps {
  onWorkoutClick?: (week: number, day: number) => void
  selectedWeek?: number
  selectedDay?: number
}

export function WorkoutCalendar({ onWorkoutClick, selectedWeek, selectedDay }: WorkoutCalendarProps) {
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(null)
  const [totalWeeks, setTotalWeeks] = useState(6)

  useEffect(() => {
    const program = ProgramStateManager.getActiveProgram()
    setActiveProgram(program)
    if (program) {
      const baseWeeks = program.template.weeks || 4
      setTotalWeeks(baseWeeks + 2)
    }
  }, [])

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
  const scheduleKeys = Object.keys(template.schedule)
  const daysPerWeek = scheduleKeys.length

  const getRIRLabel = (week: number) => {
    if (week <= 2) return `${4 - week} RIR`
    if (week === 3) return "1 RIR"
    if (week === 4) return "0 RIR"
    return `${Math.max(0, 8 - week)} RIR`
  }

  const getFirstIncompleteDay = (week: number): number | null => {
    if (week !== currentWeek) return null

    for (let day = 1; day <= daysPerWeek; day++) {
      const hasCompleted = WorkoutLogger.hasCompletedWorkout(week, day)
      if (!hasCompleted) {
        return day
      }
    }
    return null
  }

  const getWorkoutStatus = (week: number, day: number) => {
    const hasCompletedWorkout = WorkoutLogger.hasCompletedWorkout(week, day)

    if (hasCompletedWorkout) {
      return "completed"
    } else if (week === currentWeek) {
      // For current week, mark the first incomplete day as "current" (red)
      const firstIncompleteDay = getFirstIncompleteDay(week)
      if (day === firstIncompleteDay) {
        return "current"
      }
    }
    return "future"
  }

  const getWorkoutName = (dayIndex: number) => {
    const scheduleKey = scheduleKeys[dayIndex - 1]
    return template.schedule[scheduleKey]?.name || `Day ${dayIndex}`
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
    <Card className="mb-0 border-0 shadow-none bg-transparent">
      <CardContent className="p-3 sm:p-4">
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
