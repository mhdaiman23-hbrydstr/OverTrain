"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { WorkoutProgressBar } from "@/components/ui/workout-progress-bar"
import { Calendar, ChevronLeft, Check, Minus, MoreVertical } from "lucide-react"
import type { WorkoutSession } from "@/lib/workout-logger"
import type { ProgramHistoryEntry } from "@/lib/program-state"
import { buildHistoricalProgram } from "@/lib/history"
import { WorkoutCalendar } from "@/components/workout-calendar"
import {
  getExerciseMuscleGroup,
  getMuscleGroupAccentClass,
  getMuscleGroupLabel,
  getMuscleGroupTextClass,
} from "@/lib/exercise-muscle-groups"
import { Fragment } from "react"

interface HistoricalProgramViewerProps {
  historyEntry: ProgramHistoryEntry
  workouts: WorkoutSession[]
  onClose: () => void
}

export function HistoricalProgramViewer({ historyEntry, workouts, onClose }: HistoricalProgramViewerProps) {
  const [showCalendar, setShowCalendar] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [selectedDay, setSelectedDay] = useState(1)

  // Historical program info derived from history + workouts
  const historicalProgram = buildHistoricalProgram(historyEntry, workouts)

  // Find the current workout to display
  const currentWorkout = workouts.find(
    (w) => w.week === selectedWeek && w.day === selectedDay
  )

  // Group exercises by muscle group (same logic as workout logger)
  const groupedExercises: Record<string, WorkoutSession["exercises"]> = {}
  if (currentWorkout) {
    currentWorkout.exercises.forEach((exercise) => {
      const muscleGroup = (exercise as any).muscleGroup || getExerciseMuscleGroup(exercise.exerciseName)
      if (!groupedExercises[muscleGroup]) {
        groupedExercises[muscleGroup] = []
      }
      groupedExercises[muscleGroup].push(exercise)
    })
  }

  const handleWorkoutClick = (week: number, day: number) => {
    setSelectedWeek(week)
    setSelectedDay(day)
    setShowCalendar(false)
  }

  // Calculate progress (completed vs skipped) for current workout
  const totalSets = currentWorkout?.exercises.reduce((total, ex) => total + ex.sets.length, 0) || 0
  const { completedSets, skippedSets } = ((): { completedSets: number; skippedSets: number } => {
    if (!currentWorkout) return { completedSets: 0, skippedSets: 0 }
    let c = 0
    let sk = 0
    currentWorkout.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.completed) {
          if ((s as any).skipped || (s.reps === 0 && s.weight === 0)) sk++
          else c++
        }
      })
    })
    return { completedSets: c, skippedSets: sk }
  })()
  const progress = totalSets > 0 ? Math.round(((completedSets + skippedSets) / totalSets) * 100) : 0
  const completedPct = totalSets > 0 ? (completedSets / totalSets) * 100 : 0
  const skippedPct = totalSets > 0 ? (skippedSets / totalSets) * 100 : 0

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header - matches WorkoutHeader */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/50 z-[60] shadow-sm" style={{ paddingTop: 'var(--safe-area-inset-top)' }}>
        <div className="flex items-center justify-between px-4 py-3 sm:py-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 rounded-full flex-shrink-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">{historyEntry.name}</h1>
              <p className="text-xs text-muted-foreground">
                {currentWorkout ? (
                  <>
                    Week {currentWorkout.week}, Day {currentWorkout.day}
                    {currentWorkout.endTime && (
                      <> • {new Date(currentWorkout.endTime).toLocaleDateString()}</>
                    )}
                  </>
                ) : (
                  "Select a workout"
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCalendar(!showCalendar)}
              className={`h-9 w-9 rounded-full ${showCalendar ? "bg-muted" : ""}`}
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        {currentWorkout && (
          <div className="px-4 pb-2 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">
                {completedSets + skippedSets}/{totalSets} sets
              </span>
            </div>
            <WorkoutProgressBar
              completedPercent={completedPct}
              skippedPercent={skippedPct}
              size="md"
              showLabel={true}
            />
          </div>
        )}
      </div>

      {/* Calendar (when toggled) */}
      {showCalendar && (
        <div className="border-b border-border/50 bg-background/95 backdrop-blur-sm w-full sticky top-[100px] sm:top-[120px] z-50 shadow-sm">
          <WorkoutCalendar
            onWorkoutClick={handleWorkoutClick}
            selectedWeek={selectedWeek}
            selectedDay={selectedDay}
            readOnly={true}
            historicalProgram={historicalProgram}
            historicalWorkouts={workouts}
          />
        </div>
      )}

      {/* Workout Content */}
      {!currentWorkout ? (
        <div className="px-4 py-12 text-center text-muted-foreground max-w-4xl mx-auto">
          <p>No workout found for Week {selectedWeek}, Day {selectedDay}</p>
          <p className="text-sm mt-2">Select a different workout from the calendar</p>
        </div>
      ) : (
        <div className="w-full max-w-full mx-auto px-3 sm:px-4 overflow-x-hidden">
          {Object.entries(groupedExercises).map(([muscleGroup, exercises]) => (
            <div key={muscleGroup}>
              {exercises.map((exercise, index) => {
                const currentMuscleGroup = (exercise as any).muscleGroup || getExerciseMuscleGroup(exercise.exerciseName)
                const previousExercise = index > 0 ? exercises[index - 1] : null
                const previousMuscleGroup = previousExercise
                  ? ((previousExercise as any).muscleGroup || getExerciseMuscleGroup(previousExercise.exerciseName))
                  : null
            const isNewMuscleGroup = currentMuscleGroup !== previousMuscleGroup
            const groupLabel = getMuscleGroupLabel(currentMuscleGroup)
            const accentClass = getMuscleGroupAccentClass(currentMuscleGroup)
            const textClass = getMuscleGroupTextClass(currentMuscleGroup)

            return (
              <Fragment key={exercise.id}>
                {isNewMuscleGroup && (
                  <div className="flex items-center gap-2 py-3 px-1 mt-4">
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`w-1 h-5 rounded-full ${accentClass}`} />
                      <h3 className={`text-xs font-bold uppercase tracking-wide ${textClass}`}>
                        {groupLabel.toUpperCase()}
                      </h3>
                    </div>
                  </div>
                )}

                    <div className="border-b border-border/30 relative bg-background hover:bg-muted/20 transition-colors">
                      <div className="py-3 px-1 sm:py-4 sm:px-2">
                        <div className="flex items-center justify-between pb-3">
                          <div className="flex-1">
                            <h4 className="text-base font-medium">{exercise.exerciseName}</h4>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>{exercise.equipmentType || "Unknown"}</span>
                            </div>
                          </div>
                          {exercise.notes && (
                            <div className="text-xs text-muted-foreground italic max-w-[200px] truncate">
                              {exercise.notes}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-12 gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground uppercase tracking-wider pb-2">
                          <div className="col-span-1 text-center">
                            <span>#</span>
                          </div>
                          <div className="col-span-1" />
                          <div className="col-span-4 text-center">
                            <span>Weight</span>
                          </div>
                          <div className="col-span-3 text-center">
                            <span>Reps</span>
                          </div>
                          <div className="col-span-3 text-center">
                            <span className="sr-only sm:not-sr-only">Status</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {exercise.sets.map((set, setIndex) => {
                            return (
                              <div key={set.id} className="rounded-lg border border-border/40 bg-card p-2 sm:p-3">
                                <div className="grid grid-cols-12 items-center gap-2 sm:gap-3">
                                  <div className="col-span-1 text-center">
                                    <span className="text-sm font-medium text-muted-foreground">{setIndex + 1}</span>
                                  </div>
                                  <div className="col-span-1" />
                                  <div className="col-span-4">
                                    <div className="text-center h-10 flex items-center justify-center bg-muted/30 border border-border/50 rounded-md">
                                      <span className="text-sm font-medium">
                                        {set.weight > 0 ? `${set.weight} lbs` : set.skipped ? "—" : "0 lbs"}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="col-span-3">
                                    <div className="text-center h-10 flex items-center justify-center bg-muted/30 border border-border/50 rounded-md">
                                      <span className="text-sm font-medium">
                                        {set.reps > 0 ? set.reps : set.skipped ? "—" : "0"}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="col-span-3">
                                    <div
                                      className={`w-full h-10 border-2 rounded-md flex items-center justify-center ${
                                        set.completed
                                          ? (set.reps === 0 && set.weight === 0) || set.skipped
                                            ? "bg-blue-50 border-blue-500 text-blue-700"
                                            : "bg-green-50 border-green-500 text-green-700"
                                          : "border-border/50 bg-muted/20"
                                      }`}
                                    >
                                      {set.completed ? (
                                        (set.reps === 0 && set.weight === 0) || set.skipped ? (
                                          <Minus className="h-5 w-5 text-blue-600" />
                                        ) : (
                                          <Check className="h-5 w-5 text-green-600" />
                                        )
                                      ) : (
                                        <div className="w-5 h-5 border-2 border-border rounded" />
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {set.notes && (
                                  <div className="mt-2 text-xs text-muted-foreground italic px-1">
                                    Note: {set.notes}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {exercise.notes && (
                          <div className="mt-3 pt-3 border-t border-border/30">
                            <p className="text-xs text-muted-foreground italic">
                              Exercise Note: {exercise.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Fragment>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Bottom Info Bar */}
      {currentWorkout && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border/50 z-40 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="font-medium text-foreground">{currentWorkout.workoutName}</span>
              </div>
              <div className="text-muted-foreground">
                {currentWorkout.endTime ? (
                  <>
                    <span className="hidden sm:inline">Completed on </span>
                    {new Date(currentWorkout.endTime).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    <span className="ml-1 text-muted-foreground/70">
                      at {new Date(currentWorkout.endTime).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </>
                ) : (
                  "In Progress"
                )}
              </div>
            </div>
            {currentWorkout.notes && (
              <div className="mt-2 text-xs text-muted-foreground italic">
                Workout Note: {currentWorkout.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
