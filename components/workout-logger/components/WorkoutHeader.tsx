"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Calendar, MoreVertical, FileText, BarChart3, Plus, Check, AlertTriangle } from "lucide-react"
import { ConnectionStatus } from "@/components/workout-logger/hooks/use-connection-status"

interface WorkoutHeaderProps {
  programName?: string
  workoutName?: string
  week?: number
  day?: number
  progress: number
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
  showCalendar,
  onToggleCalendar,
  onOpenNotes,
  onOpenSummary,
  onOpenAddExercise,
  onOpenEndWorkout,
  onOpenEndProgram,
}: WorkoutHeaderProps) {
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
              onClick={onToggleCalendar}
              className={`h-9 w-9 sm:h-10 sm:w-10 p-0 ${showCalendar ? "bg-muted" : ""}`}
            >
              <Calendar className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-md hover:bg-accent hover:text-accent-foreground">
                  <MoreVertical className="h-4 w-4" />
                </button>
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
          <Progress value={progress} className="w-full h-1.5 sm:h-2" />
        </div>
      </div>
    </div>
  )
}
