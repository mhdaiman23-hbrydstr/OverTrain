"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  getExerciseMuscleGroup,
  getMuscleGroupAccentClass,
  getMuscleGroupLabel,
  getMuscleGroupTextClass,
} from "@/lib/exercise-muscle-groups"
import type { WorkoutSession } from "@/lib/workout-logger"
import { ExerciseNotesBanner } from "@/components/workout-logger/components/exercise-notes-banner"
import { ExerciseNotesDialog } from "@/components/workout-logger/components/exercise-notes-dialog"
import { ExerciseCustomRpeBox } from "@/components/workout-logger/components/exercise-custom-rpe-box"
import { CustomRpeDialog } from "@/components/workout-logger/components/custom-rpe-dialog"
import type { ExerciseNote } from "@/lib/types/progression"
import type { RpeRirDisplayMode } from "@/lib/types/progression"
import {
  MoreVertical,
  FileText,
  Replace,
  ArrowUp,
  ArrowDown,
  SkipForward,
  Trash2,
  Plus,
  Minus,
  Check,
} from "lucide-react"
import React, { ReactNode, Fragment, useState } from "react"

interface ExerciseGroupsProps {
  groupedExercises: Record<string, WorkoutSession["exercises"]>
  workout: WorkoutSession
  isWorkoutBlocked: boolean
  outOfBoundsExercises: Record<string, { min: number; max: number; setNumber: number }>
  volumeCompensation: Record<string, { adjustedReps: number; strategy: string; message?: string }>
  userOverrides: Record<string, boolean>
  onSetUpdate: (exerciseId: string, setId: string, field: "reps" | "weight", value: number) => void
  onWeightBlur: (exerciseId: string, setId: string) => void
  onCompleteSet: (exerciseId: string, setId: string) => void
  onAddSet: (exerciseId: string, afterSetId: string) => void
  onDeleteSet: (exerciseId: string, setId: string) => void
  onSkipSet: (exerciseId: string, setId: string) => void
  onExerciseNotes: (exerciseId: string) => void
  onSaveExerciseNotes: () => void
  onReplaceExercise: (exerciseId: string) => void
  onMoveExerciseUp: (exerciseId: string) => void
  onMoveExerciseDown: (exerciseId: string) => void
  onSkipAllSets: (exerciseId: string) => void
  onDeleteExercise: (exerciseId: string) => void
  notesFooter?: ReactNode
  // New props for notes and RPE
  exerciseNotes?: { [exerciseId: string]: ExerciseNote }
  customRpes?: { [exerciseId: string]: { [setNumber: number]: number } }
  displayMode?: RpeRirDisplayMode
  blockLevelRpe?: number
  blockLevelRir?: number
  onSaveExerciseNote?: (exerciseId: string, noteText: string, isPinned: boolean) => Promise<void>
  onSaveCustomRpe?: (exerciseId: string, rpesBySet: { [setNumber: number]: number }) => Promise<void>
}

export function ExerciseGroups({
  groupedExercises,
  workout,
  isWorkoutBlocked,
  outOfBoundsExercises,
  volumeCompensation,
  userOverrides,
  onSetUpdate,
  onWeightBlur,
  onCompleteSet,
  onAddSet,
  onDeleteSet,
  onSkipSet,
  onExerciseNotes,
  onReplaceExercise,
  onMoveExerciseUp,
  onMoveExerciseDown,
  onSkipAllSets,
  onDeleteExercise,
  exerciseNotes = {},
  customRpes = {},
  displayMode = 'rir',
  blockLevelRpe,
  blockLevelRir,
  onSaveExerciseNote,
  onSaveCustomRpe,
}: ExerciseGroupsProps) {
  // State for exercise notes and RPE dialogs
  const [selectedExerciseForNotes, setSelectedExerciseForNotes] = useState<string | null>(null)
  const [selectedExerciseForRpe, setSelectedExerciseForRpe] = useState<string | null>(null)
  return (
    <div className="w-full max-w-full mx-auto px-3 sm:px-4 overflow-x-hidden">
      {Object.entries(groupedExercises).map(([muscleGroup, exercises]) => (
        <div key={muscleGroup}>
          {exercises.map((exercise, index) => {
            // Use database muscle group if available, fallback to name-based detection
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
                    {/* Exercise Notes Banner */}
                    {exerciseNotes[exercise.id] && (
                      <ExerciseNotesBanner
                        note={exerciseNotes[exercise.id]}
                        onEdit={() => setSelectedExerciseForNotes(exercise.id)}
                      />
                    )}

                    <div className="flex items-center justify-between pb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-base font-medium">{exercise.exerciseName}</h4>
                          <ExerciseCustomRpeBox
                            exerciseName={exercise.exerciseName}
                            hasCustomRpe={!!customRpes[exercise.id] && Object.keys(customRpes[exercise.id]).length > 0}
                            averageRpe={
                              customRpes[exercise.id]
                                ? Object.values(customRpes[exercise.id]).reduce((a, b) => a + b, 0) /
                                  Object.keys(customRpes[exercise.id]).length
                                : undefined
                            }
                            onOpen={() => setSelectedExerciseForRpe(exercise.id)}
                          />
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>{exercise.equipmentType || "Unknown"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-[100]">
                            <DropdownMenuItem onClick={() => setSelectedExerciseForNotes(exercise.id)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Exercise notes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onReplaceExercise(exercise.id)}>
                              <Replace className="h-4 w-4 mr-2" />
                              Replace
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onMoveExerciseUp(exercise.id)} disabled={workout.exercises.findIndex((ex) => ex.id === exercise.id) <= 0}>
                              <ArrowUp className="h-4 w-4 mr-2" />
                              Move up
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onMoveExerciseDown(exercise.id)}
                              disabled={workout.exercises.findIndex((ex) => ex.id === exercise.id) >= workout.exercises.length - 1}
                            >
                              <ArrowDown className="h-4 w-4 mr-2" />
                              Move down
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onSkipAllSets(exercise.id)}>
                              <SkipForward className="h-4 w-4 mr-2" />
                              Skip all sets
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDeleteExercise(exercise.id)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete exercise
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
                        <span className="sr-only sm:not-sr-only">Complete</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {exercise.sets.map((set, setIndex) => {
                        const volumeKey = `${exercise.id}_${set.id}`
                        const compensation = volumeCompensation[volumeKey]

                        return (
                          <div key={set.id} className="rounded-lg border border-border/40 bg-card p-2 sm:p-3">
                            <div className="grid grid-cols-12 items-center gap-2 sm:gap-3">
                              <div className="col-span-1 text-center">
                                <span className="text-sm font-medium text-muted-foreground">{setIndex + 1}</span>
                              </div>
                              <div className="col-span-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="z-[100]">
                                    <DropdownMenuItem onClick={() => onAddSet(exercise.id, set.id)}>
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add set below
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onSkipSet(exercise.id, set.id)}>
                                      <SkipForward className="h-4 w-4 mr-2" />
                                      Skip set
                                    </DropdownMenuItem>
                                    {exercise.sets.length > 1 && (
                                      <DropdownMenuItem onClick={() => onDeleteSet(exercise.id, set.id)} className="text-red-600">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete set
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <div className="col-span-4">
                                <Input
                                  type="number"
                                  value={set.weight || ""}
                                  onChange={(e) => onSetUpdate(exercise.id, set.id, "weight", Number.parseFloat(e.target.value) || 0)}
                                  onBlur={() => onWeightBlur(exercise.id, set.id)}
                                  className="text-center h-10 bg-muted/30 border-border/50"
                                  placeholder={(exercise as any).suggestedWeight && (exercise as any).suggestedWeight > 0 ? `${(exercise as any).suggestedWeight}` : ""}
                                  step="2.5"
                                  disabled={isWorkoutBlocked}
                                  title={(exercise as any).progressionNote ||
                                    ((exercise as any).suggestedWeight && (exercise as any).suggestedWeight > 0
                                      ? `Suggested: ${(exercise as any).suggestedWeight}`
                                      : "")}
                                />
                              </div>
                              <div className="col-span-3">
                                <Input
                                  type="number"
                                  value={set.reps || ""}
                                  onChange={(e) => onSetUpdate(exercise.id, set.id, "reps", Number.parseInt(e.target.value) || 0)}
                                  className="text-center h-10 bg-muted/30 border-border/50"
                                  placeholder=""
                                  disabled={isWorkoutBlocked}
                                />
                              </div>
                              <div className="col-span-3">
                                <Button
                                  size="sm"
                                  onClick={() => onCompleteSet(exercise.id, set.id)}
                                  disabled={isWorkoutBlocked}
                                  variant="ghost"
                                  className={`w-full h-10 border-2 ${set.completed ? ((set.reps === 0 && set.weight === 0) || set.skipped ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-green-50 border-green-500 text-green-700") : "border-border/50 hover:border-primary"}`}
                                >
                                  {(() => {
                                    const showingMinus = set.completed && ((set.reps === 0 && set.weight === 0) || set.skipped)
                                    if (showingMinus) {
                                      console.log("[v0] Rendering minus indicator for set", {
                                        exerciseName: exercise.exerciseName,
                                        setIndex,
                                        setId: set.id,
                                        reps: set.reps,
                                        weight: set.weight,
                                        completed: set.completed,
                                        skipped: set.skipped,
                                        reason: set.skipped ? "skipped=true" : "reps=0 AND weight=0",
                                      })
                                    }
                                    if (set.completed) {
                                      if ((set.reps === 0 && set.weight === 0) || set.skipped) {
                                        return <Minus className="h-5 w-5 text-blue-600" />
                                      }
                                      return <Check className="h-5 w-5 text-green-600" />
                                    }
                                    return <div className="w-5 h-5 border-2 border-border rounded" />
                                  })()}
                                </Button>
                              </div>
                            </div>

                            {compensation && (
                              <div className={`mt-2 text-xs rounded px-3 py-2 ${
                                compensation.strategy === 'out_of_bounds'
                                  ? 'text-yellow-800 bg-yellow-50 border border-yellow-200'
                                  : 'text-green-700 bg-green-50 border border-green-200'
                              }`}>
                                {compensation.message || `Adjusted to ${compensation.adjustedReps} reps based on weight change`}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </Fragment>
            )
          })}
        </div>
      ))}

      {/* Exercise Notes Dialog */}
      {selectedExerciseForNotes && (
        <ExerciseNotesDialog
          exerciseName={workout.exercises.find(ex => ex.id === selectedExerciseForNotes)?.exerciseName || "Exercise"}
          initialNote={exerciseNotes[selectedExerciseForNotes]}
          onSave={async (noteText, isPinned) => {
            if (onSaveExerciseNote) {
              await onSaveExerciseNote(selectedExerciseForNotes, noteText, isPinned)
            }
          }}
          onDelete={async () => {
            // Note deletion handled by parent component if needed
            setSelectedExerciseForNotes(null)
          }}
          isOpen={!!selectedExerciseForNotes}
          onClose={() => setSelectedExerciseForNotes(null)}
        />
      )}

      {/* Custom RPE Dialog */}
      {selectedExerciseForRpe && (
        <CustomRpeDialog
          exerciseName={workout.exercises.find(ex => ex.id === selectedExerciseForRpe)?.exerciseName || "Exercise"}
          targetSets={workout.exercises.find(ex => ex.id === selectedExerciseForRpe)?.sets.length || 0}
          displayMode={displayMode}
          blockLevelRpe={blockLevelRpe}
          blockLevelRir={blockLevelRir}
          initialRpes={customRpes[selectedExerciseForRpe]}
          onSave={async (rpesBySet) => {
            if (onSaveCustomRpe) {
              await onSaveCustomRpe(selectedExerciseForRpe, rpesBySet)
            }
          }}
          isOpen={!!selectedExerciseForRpe}
          onClose={() => setSelectedExerciseForRpe(null)}
        />
      )}
    </div>
  )
}
