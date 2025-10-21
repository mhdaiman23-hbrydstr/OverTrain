import { useMemo, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import type { DayInWizard, ExerciseInWizard } from '../types'
import type { Exercise } from '@/lib/services/exercise-library-service'
import { ExerciseRow } from '../components/ExerciseRow'
import { ExerciseSelectionDialog } from '../components/ExerciseSelectionDialog'

interface StepExerciseAssignmentProps {
  days: DayInWizard[]
  exercises: Exercise[]
  isLoading: boolean
  error: string | null
  onAddExercise: (dayIndex: number, exercise: Exercise) => void
  onRemoveExercise: (dayIndex: number, tempId: string) => void
  onRandomizeDay: (dayIndex: number) => void
  onReplaceExercise: (dayIndex: number, tempId: string, exercise: Exercise) => void
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
  onBack,
  onNext,
}: StepExerciseAssignmentProps) {
  const [pickerDayIndex, setPickerDayIndex] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogContext, setDialogContext] = useState<
    | {
        mode: 'replace'
        dayIndex: number
        exercise: ExerciseInWizard
      }
    | {
        mode: 'add'
        dayIndex: number
      }
    | null
  >(null)

  const allDaysHaveExercises = days.every(day => day.exercises.length > 0)

  const filteredExercises = useMemo(() => {
    if (pickerDayIndex === null) return []
    const day = days[pickerDayIndex]
    const baseList = filterExercisesForDay(day, exercises)
    if (!searchTerm) return baseList
    const normalized = searchTerm.trim().toLowerCase()
    return baseList.filter(exercise => exercise.name.toLowerCase().includes(normalized))
  }, [pickerDayIndex, days, exercises, searchTerm])

  const handleSelectExercise = (exercise: Exercise) => {
    if (pickerDayIndex === null) return
    onAddExercise(pickerDayIndex, exercise)
    setSearchTerm('')
    setPickerDayIndex(null)
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

  const openAddDialog = (dayIndex: number) => {
    setDialogContext({
      mode: 'add',
      dayIndex,
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
        className="text-orange-500 hover:text-orange-600 touch-manipulation min-h-[44px] min-w-[44px]"
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

            return (
              <div key={day.dayNumber} className="rounded-lg border border-border/60 bg-card px-3 py-3 sm:px-4 sm:py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold">{day.dayName}</h3>
                      <Badge variant="outline" className="text-xs">
                        {day.exercises.length} exercises
                      </Badge>
                    </div>
                    {groupedByMuscle.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {groupedByMuscle.map(item => (
                          <span key={item.label} className="rounded bg-muted/60 px-2 py-1">
                            {item.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => onRandomizeDay(dayIndex)}
                    >
                      Randomize day
                    </Button>
                    <Popover
                      open={pickerDayIndex === dayIndex}
                      onOpenChange={open => setPickerDayIndex(open ? dayIndex : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">
                          Add exercise
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[min(18rem,calc(100vw-2rem))] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput
                            value={searchTerm}
                            onValueChange={setSearchTerm}
                            placeholder="Search exercises..."
                          />
                          <CommandList>
                            <CommandEmpty>No exercises found.</CommandEmpty>
                            <CommandGroup>
                              {filteredExercises.map(exercise => (
                                <CommandItem
                                  key={exercise.id}
                                  value={exercise.name}
                                  onSelect={() => handleSelectExercise(exercise)}
                                >
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">{exercise.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {exercise.muscleGroup} - {exercise.equipmentType}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
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
              </div>
            )
          })}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!allDaysHaveExercises}>
          Continue
        </Button>
      </div>

      <ExerciseSelectionDialog
        isOpen={dialogContext !== null}
        mode={dialogContext?.mode ?? 'replace'}
        onClose={closeDialog}
        exercises={exercises}
        isLoading={isLoading}
        error={error}
        currentExerciseName={dialogContext?.mode === 'replace' ? dialogContext.exercise.exerciseName : undefined}
        presetMuscleGroup={dialogContext?.mode === 'replace' ? dialogContext.exercise.muscleGroup : undefined}
        onSelectExercise={handleExerciseSelection}
      />
    </div>
  )
}






