"use client"

import { Button } from "@/components/ui/button"
import { WorkoutProgressBar } from "@/components/ui/workout-progress-bar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { Calendar, MoreVertical, FileText, BarChart3, Plus, Check, AlertTriangle } from "lucide-react"
import { ConnectionStatus } from "@/components/workout-logger/hooks/use-connection-status"
import { useState } from "react"

interface WorkoutHeaderProps {
  programName?: string
  workoutName?: string
  week?: number
  day?: number
  progress: number
  completedPercent?: number
  skippedPercent?: number
  showCalendar: boolean
  onToggleCalendar: () => void
  onOpenNotes: () => void
  onOpenSummary: () => void
  onOpenAddExercise: () => void
  onOpenEndWorkout: () => void
  onOpenEndProgram: () => void
  connectionStatus: ConnectionStatus
}

export function WorkoutHeader({
  programName,
  workoutName,
  week,
  day,
  progress,
  completedPercent,
  skippedPercent,
  showCalendar,
  onToggleCalendar,
  onOpenNotes,
  onOpenSummary,
  onOpenAddExercise,
  onOpenEndWorkout,
  onOpenEndProgram,
}: WorkoutHeaderProps) {
  const [isCalendarLoading, setIsCalendarLoading] = useState(false)

  const handleCalendarToggle = async () => {
    setIsCalendarLoading(true)
    try {
      await onToggleCalendar()
    } finally {
      // Small delay to show spinner even for fast operations
      setTimeout(() => setIsCalendarLoading(false), 200)
    }
  }

  return (
    <div className="sticky top-0 bg-background border-b border-border/50 z-[60] shadow-sm backdrop-blur-sm bg-background/95">
      <div className="w-full px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
            {programName && (
              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide truncate">{programName}</div>
            )}
            <h1 className="text-lg sm:text-xl font-bold truncate leading-tight">{workoutName}</h1>
            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Week {week || 1}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>Day {day || 1}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCalendarToggle}
              disabled={isCalendarLoading}
              className={`h-9 w-9 sm:h-10 sm:w-10 p-0 ${showCalendar ? "bg-muted" : ""}`}
            >
              {isCalendarLoading ? <Spinner size="sm" /> : <Calendar className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[100]">
                <DropdownMenuItem onClick={onOpenNotes}>
                  <FileText className="h-4 w-4 mr-2" />
                  Workout Notes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenSummary}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Summary
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenAddExercise}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Exercise
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onOpenEndWorkout} className="text-orange-600 focus:text-orange-600">
                  <Check className="h-4 w-4 mr-2" />
                  End Workout
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenEndProgram} className="text-red-600 focus:text-red-600">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  End Program
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="mt-2 sm:mt-3">
          <WorkoutProgressBar
            completedPercent={completedPercent ?? progress}
            skippedPercent={skippedPercent}
            size="md"
            showLabel={true}
          />
        </div>
      </div>
    </div>
  )
}
