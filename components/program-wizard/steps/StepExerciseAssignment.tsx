import { useMemo, useState } from 'react'
import { ArrowLeftRight, ChevronDown, Edit3, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BottomActionBar } from '@/components/ui/bottom-action-bar'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import type { DayInWizard, ExerciseInWizard } from '../types'
import type { Exercise } from '@/lib/services/exercise-library-service'
import { ExerciseRow } from '../components/ExerciseRow'
import { ExerciseSelectionDialog } from '../components/ExerciseSelectionDialog'
import { cn } from '@/lib/utils'

interface StepExerciseAssignmentProps {
  days: DayInWizard[]
  exercises: Exercise[]
  isLoading: boolean
  error: string | null
  onAddExercise: (dayIndex: number, exercise: Exercise) => void
  onRemoveExercise: (dayIndex: number, tempId: string) => void
  onRandomizeDay: (dayIndex: number) => void
  onReplaceExercise: (dayIndex: number, tempId: string, exercise: Exercise) => void
  onRenameDay: (dayIndex: number, newName: string) => void
  onRemoveDay?: (dayIndex: number) => void
  onBack: () => void
  onNext: () => void
}

const filterExercisesForDay = (day: DayInWizard, exercises: Exercise[]): Exercise[] => {
  if (!day.muscleGroups || day.muscleGroups.length === 0) {
    return exercises
  }

  const groups = day.muscleGroups.map(group => group.group.toLowerCase())
  return exercises.filter(exercise => groups.includes(exercise.muscleGroup.toLowerCase()))
}

export function StepExerciseAssignment({
  days,
  exercises,
  isLoading,
  error,
  onAddExercise,
  onRemoveExercise,
  onRandomizeDay,
  onReplaceExercise,
  onRenameDay,
  onRemoveDay,
  onBack,
  onNext,
}: StepExerciseAssignmentProps) {
  const { toast } = useToast()
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set(days.map((_, index) => index)))
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null)
  const [editingDayName, setEditingDayName] = useState('')
  const [dialogContext, setDialogContext] = useState<
    | {
        mode: 'replace'
        dayIndex: number
        exercise: ExerciseInWizard
      }
    | {
        mode: 'add'
        dayIndex: number
        presetMuscleGroups: string[]
      }
    | null
  >(null)

  const allDaysHaveExercises = days.every(day => day.exercises.length > 0)

  const toggleDayExpansion = (dayIndex: number) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev)
      if (newSet.has(dayIndex)) {
        newSet.delete(dayIndex)
      } else {
        newSet.add(dayIndex)
      }
      return newSet
    })
  }

  const startEditingDayName = (dayIndex: number, currentName: string) => {
    setEditingDayIndex(dayIndex)
    setEditingDayName(currentName)
  }

  const cancelEditingDayName = () => {
    setEditingDayIndex(null)
    setEditingDayName('')
  }

  const saveDayName = () => {
    if (editingDayIndex !== null && editingDayName.trim()) {
      onRenameDay(editingDayIndex, editingDayName.trim())
      cancelEditingDayName()
    }
  }

  const handleDeleteDay = (index: number, dayName: string) => {
    if (onRemoveDay) {
      onRemoveDay(index)
      toast({
        title: 'Day removed',
        description: `${dayName} has been deleted from your program.`,
      })
    }
  }

  const handleDayNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveDayName()
    } else if (e.key === 'Escape') {
      cancelEditingDayName()
    }
  }


  const openReplaceDialog = (payload: {
    dayIndex: number
    exercise: ExerciseInWizard
  }) => {
    setDialogContext({
      mode: 'replace',
      dayIndex: payload.dayIndex,
      exercise: payload.exercise,
    })
  }

  const closeDialog = () => {
    setDialogContext(null)
  }

  const handleExerciseSelection = (exercise: Exercise) => {
    if (!dialogContext) return

    if (dialogContext.mode === 'replace' && dialogContext.exercise) {
      onReplaceExercise(dialogContext.dayIndex, dialogContext.exercise.tempId, exercise)
    } else if (dialogContext.mode === 'add') {
      onAddExercise(dialogContext.dayIndex, exercise)
    }

    closeDialog()
  }

  const renderReplaceActions = (params: { exercise: ExerciseInWizard; dayIndex: number; exerciseIndex: number }) => {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-orange-500 hover:text-orange-600"
        onClick={event => {
          event.preventDefault()
          event.stopPropagation()
          openReplaceDialog({
            dayIndex: params.dayIndex,
            exercise: params.exercise,
          })
        }}
        aria-label={`Replace ${params.exercise.exerciseName}`}
      >
        <ArrowLeftRight className="size-4" />
      </Button>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold sm:text-xl">Assign exercises</h2>
        <p className="text-sm text-muted-foreground">
          Choose exercises for each muscle group. Use randomize to quickly populate a day and fine-tune afterward.
        </p>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border/60 py-10 text-center">
          <Spinner />
          <p className="text-sm text-muted-foreground">Loading exercise library...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-4">
          {days.map((day, dayIndex) => {
            const groupedByMuscle = day.muscleGroups?.map(group => ({
              label: `${group.group} x ${group.count} planned`,
              count: group.count,
            })) ?? []
            const isDayExpanded = expandedDays.has(dayIndex)

            return (
              <Card key={day.dayNumber} className="overflow-hidden">
                {/* Day Header - Always visible, clickable to expand */}
                <div className="cursor-pointer transition-colors hover:bg-muted/30 px-4 py-3 sm:py-4" onClick={() => toggleDayExpansion(dayIndex)}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center flex-1 min-w-0 gap-3">
                      {/* Collapse/Expand Icon */}
                      <ChevronDown
                        className={cn(
                          'h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform',
                          !isDayExpanded && '-rotate-90'
                        )}
                      />

                      {editingDayIndex === dayIndex ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center flex-1">
                          <Input
                            value={editingDayName}
                            onChange={(e) => setEditingDayName(e.target.value)}
                            onKeyDown={handleDayNameKeyDown}
                            onBlur={saveDayName}
                            className="h-8 text-base font-semibold"
                            placeholder="Enter day name..."
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                saveDayName()
                              }}
                              className="h-8 px-2"
                              disabled={!editingDayName.trim()}
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                cancelEditingDayName()
                              }}
                              className="h-8 px-2"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <h3 className="text-base font-semibold truncate">{day.dayName}</h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              startEditingDayName(dayIndex, day.dayName)
                            }}
                            aria-label={`Edit ${day.dayName} name`}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Right side: Badge and Delete button */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {day.exercises.length} exercises
                      </Badge>
                      {onRemoveDay && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteDay(dayIndex, day.dayName)
                          }}
                          aria-label={`Delete ${day.dayName}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Metadata shown in header */}
                  {groupedByMuscle.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-2 ml-8">
                      {groupedByMuscle.map(item => (
                        <span key={item.label} className="rounded bg-muted/60 px-2 py-1">
                          {item.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expandable Content */}
                {isDayExpanded && (
                  <>
                    {/* Action Buttons - Separated from header */}
                    <div className="border-t border-border/40 px-3 py-3 sm:px-4 sm:py-4 bg-muted/20">
                      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-none"
                          onClick={() => onRandomizeDay(dayIndex)}
                        >
                          Randomize day
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-none"
                          onClick={() => {
                            const presetGroups = day.muscleGroups?.map(group => group.group) ?? []
                            setDialogContext({
                              mode: 'add',
                              dayIndex: dayIndex,
                              presetMuscleGroups: presetGroups,
                            })
                          }}
                        >
                          Add exercise
                        </Button>
                      </div>
                    </div>

                    {/* Exercise List */}
                    <div className="px-3 py-3 sm:px-4 sm:py-4 space-y-3">
                      {day.exercises.length === 0 ? (
                        <div className="rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
                          No exercises assigned. Add them manually or randomize the day to get suggestions.
                        </div>
                      ) : (
                        day.exercises.map((exercise, exerciseIndex) => (
                          <ExerciseRow
                            key={exercise.tempId}
                            exercise={exercise}
                            onRemove={tempId => onRemoveExercise(dayIndex, tempId)}
                            actionSlot={renderReplaceActions({ exercise, dayIndex, exerciseIndex })}
                          />
                        ))
                      )}
                    </div>
                  </>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <ExerciseSelectionDialog
        isOpen={dialogContext !== null}
        mode={dialogContext?.mode ?? 'replace'}
        onClose={closeDialog}
        exercises={exercises}
        isLoading={isLoading}
        error={error}
        currentExerciseName={dialogContext?.mode === 'replace' ? dialogContext.exercise.exerciseName : undefined}
        presetMuscleGroup={dialogContext?.mode === 'replace' ? dialogContext.exercise.muscleGroup : undefined}
        presetMuscleGroups={dialogContext?.mode === 'add' ? (dialogContext as any).presetMuscleGroups : undefined}
        onSelectExercise={handleExerciseSelection}
      />

      <BottomActionBar
        leftContent={
          <Button variant="ghost" onClick={onBack} className="w-full">
            Back
          </Button>
        }
        rightContent={
          <Button
            className="w-full gradient-primary text-primary-foreground h-auto py-2 px-4 text-center"
            onClick={onNext}
            disabled={!allDaysHaveExercises}
          >
            Continue
          </Button>
        }
        showFixed={false}
      />
    </div>
  )
}






