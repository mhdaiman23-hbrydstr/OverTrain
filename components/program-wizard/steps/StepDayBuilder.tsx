import { useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Exercise } from '@/lib/services/exercise-library-service'
import type { DayInWizard, ExerciseInWizard } from '../types'
import { DaySection } from '../components/DaySection'
import { ExerciseSelectionDialog } from '../components/ExerciseSelectionDialog'
import { programWizardDebugger } from '@/lib/program-wizard-debug'

interface StepDayBuilderProps {
  days: DayInWizard[]
  onRenameDay: (index: number, name: string) => void
  onEditMuscleGroups?: (index: number) => void
  onRandomizeDay: (index: number) => void
  onRemoveDay: (index: number) => void
  onRemoveExercise: (dayIndex: number, tempId: string) => void
  onReorderExercise: (dayIndex: number, fromIndex: number, toIndex: number) => void
  onAddDay: () => void
  onAddExercise: (dayIndex: number, exercise: Exercise) => void
  exercises: Exercise[]
  isExerciseLoading: boolean
  exerciseError: string | null
  onReplaceExercise: (dayIndex: number, tempId: string, exercise: Exercise) => void
  onBack: () => void
  onNext: () => void
}

export function StepDayBuilder({
  days,
  onRenameDay,
  onEditMuscleGroups,
  onRandomizeDay,
  onRemoveDay,
  onRemoveExercise,
  onReorderExercise,
  onAddDay,
  onAddExercise,
  exercises,
  isExerciseLoading,
  exerciseError,
  onReplaceExercise,
  onBack,
  onNext,
}: StepDayBuilderProps) {
  const hasAtLeastOneExercise = days.every(day => day.exercises.length > 0)
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

  const hasExerciseLibraryData = exercises.length > 0
  const isSelectionDisabled = isExerciseLoading && !hasExerciseLibraryData

  const openReplaceDialog = (payload: {
    dayIndex: number
    exercise: ExerciseInWizard
  }) => {
    if (isSelectionDisabled) return
    programWizardDebugger.logDropdownOpen(payload.exercise.exerciseName)
    setDialogContext({
      mode: 'replace',
      dayIndex: payload.dayIndex,
      exercise: payload.exercise,
    })
  }

  const openAddDialog = (dayIndex: number) => {
    if (isSelectionDisabled) return
    programWizardDebugger.logDropdownOpen('add-exercise')
    setDialogContext({
      mode: 'add',
      dayIndex,
    })
  }

  const closeDialog = () => {
    setDialogContext(null)
    programWizardDebugger.logDropdownClose()
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

  const presetMuscleGroup = (() => {
    if (!dialogContext) return null
    if (dialogContext.mode === 'replace') {
      return dialogContext.exercise.muscleGroup
    }
    const day = days[dialogContext.dayIndex]
    if (!day) return null
    if (day.exercises.length > 0) {
      return day.exercises[0].muscleGroup
    }
    if (day.muscleGroups && day.muscleGroups.length > 0) {
      return day.muscleGroups[0].group
    }
    return null
  })()

  const renderReplaceActions = (params: { exercise: ExerciseInWizard; dayIndex: number; exerciseIndex: number }) => {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground touch-manipulation min-h-[44px] min-w-[44px]"
        disabled={isSelectionDisabled}
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold sm:text-xl">Fine-tune your program</h2>
          <p className="text-sm text-muted-foreground">
            Rename days, reorder exercises, and make final adjustments before saving.
          </p>
        </div>
        <Button variant="outline" className="self-start sm:self-auto" onClick={onAddDay}>
          Add training day
        </Button>
      </div>

      <div className="space-y-4 pb-6">
        {days.map((day, index) => (
          <DaySection
            key={day.dayNumber}
            index={index}
            day={day}
            onRename={onRenameDay}
            onEditMuscleGroups={onEditMuscleGroups}
            onRandomize={onRandomizeDay}
            onRemoveDay={days.length > 1 ? onRemoveDay : undefined}
            onRemoveExercise={onRemoveExercise}
            onReorderExercise={onReorderExercise}
            renderExerciseActions={renderReplaceActions}
            onAddExercise={openAddDialog}
            disableAddExercise={isSelectionDisabled}
          />
        ))}
      </div>

      <div
        className="sticky bottom-0 z-10 border-t border-border/60 bg-background/95 py-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext} disabled={!hasAtLeastOneExercise}>
            Continue
          </Button>
        </div>
      </div>

      <ExerciseSelectionDialog
        isOpen={dialogContext !== null}
        mode={dialogContext?.mode ?? 'replace'}
        onClose={closeDialog}
        exercises={exercises}
        isLoading={isExerciseLoading}
        error={exerciseError}
        currentExerciseName={dialogContext?.mode === 'replace' ? dialogContext.exercise.exerciseName : undefined}
        presetMuscleGroup={presetMuscleGroup}
        onSelectExercise={handleExerciseSelection}
      />
    </div>
  )
}
