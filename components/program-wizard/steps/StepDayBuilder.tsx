'use client'

import { useState, useEffect } from 'react'
import { ArrowLeftRight, Edit3, Trash2, ChevronDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { Exercise } from '@/lib/services/exercise-library-service'
import type { DayInWizard, ExerciseInWizard } from '../types'
import { DaySection } from '../components/DaySection'
import { ExerciseSelectionDialog } from '../components/ExerciseSelectionDialog'
import { ExerciseRow } from '../components/ExerciseRow'
import { programWizardDebugger } from '@/lib/program-wizard-debug'
import { cn } from '@/lib/utils'

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
  const { toast } = useToast()
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

  // State for day name editing
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null)
  const [tempDayName, setTempDayName] = useState('')

  // State for day collapse/expand
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set())


  const hasExerciseLibraryData = exercises.length > 0
  const isSelectionDisabled = isExerciseLoading && !hasExerciseLibraryData

  // Auto-suggest day names when component loads or exercises change
  useEffect(() => {
    days.forEach((day, index) => {
      // Only auto-suggest if day has generic name and exercises
      const isGenericName = day.dayName.match(/^Day \d+$/)
      if (isGenericName && day.exercises.length > 0) {
        const suggestion = getSmartDayNameSuggestion(day)
        if (suggestion !== day.dayName) {
          onRenameDay(index, suggestion)
        }
      }
    })
  }, [days.map(d => d.exercises.length).join(','), days.map(d => d.dayName).join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Smart suggestion logic for day names based on exercises
  const getSmartDayNameSuggestion = (day: DayInWizard): string => {
    const muscleGroups = day.exercises.map(ex => ex.muscleGroup?.toLowerCase()).filter(Boolean)
    const exerciseNames = day.exercises.map(ex => ex.exerciseName.toLowerCase()).filter(Boolean)
    
    // Push Day detection
    const pushMuscles = ['chest', 'shoulders', 'triceps']
    const hasPush = pushMuscles.some(muscle => muscleGroups.includes(muscle)) ||
                   exerciseNames.some(name => name.includes('bench') || name.includes('press') || name.includes('overhead'))
    
    // Pull Day detection  
    const pullMuscles = ['back', 'biceps']
    const hasPull = pullMuscles.some(muscle => muscleGroups.includes(muscle)) ||
                   exerciseNames.some(name => name.includes('row') || name.includes('pull') || name.includes('curl'))
    
    // Leg Day detection
    const legMuscles = ['quadriceps', 'hamstrings', 'glutes', 'calves']
    const hasLegs = legMuscles.some(muscle => muscleGroups.includes(muscle)) ||
                   exerciseNames.some(name => name.includes('squat') || name.includes('deadlift') || name.includes('lunge'))
    
    // Full Body detection
    const uniqueMuscleGroups = new Set(muscleGroups)
    const isFullBody = uniqueMuscleGroups.size >= 4 || (hasPush && hasPull && hasLegs)
    
    // Upper/Lower detection
    const upperMuscles = ['chest', 'back', 'shoulders', 'biceps', 'triceps']
    const lowerMuscles = ['quadriceps', 'hamstrings', 'glutes', 'calves']
    const hasUpper = upperMuscles.some(muscle => muscleGroups.includes(muscle))
    const hasLower = lowerMuscles.some(muscle => muscleGroups.includes(muscle))
    const isUpperLower = hasUpper && hasLower && !isFullBody
    
    // Return suggestions based on analysis
    if (isFullBody) return 'Full Body'
    if (hasPush && hasPull && !hasLegs) return 'Upper Body'
    if (hasLegs && !hasPush && !hasPull) return 'Lower Body'
    if (hasPush && !hasPull && !hasLegs) return 'Push Day'
    if (hasPull && !hasPush && !hasLegs) return 'Pull Day'
    if (hasLegs && (hasPush || hasPull)) return 'Leg Day + Upper'
    if (hasLegs) return 'Leg Day'
    if (isUpperLower) return 'Upper/Lower Split'
    
    // Fallback to primary muscle group
    if (muscleGroups.length > 0) {
      const primaryMuscle = muscleGroups[0]
      return `${primaryMuscle.charAt(0).toUpperCase() + primaryMuscle.slice(1)} Day`
    }
    
    return `Day ${day.dayNumber}`
  }

  // Day name editing functions
  const startEditingDayName = (index: number) => {
    setEditingDayIndex(index)
    setTempDayName(days[index].dayName)
  }

  const saveDayName = () => {
    if (editingDayIndex !== null && tempDayName.trim()) {
      onRenameDay(editingDayIndex, tempDayName.trim())
      setEditingDayIndex(null)
      setTempDayName('')
    }
  }

  const cancelEditingDayName = () => {
    setEditingDayIndex(null)
    setTempDayName('')
  }

  const handleDeleteDay = (index: number, dayName: string) => {
    onRemoveDay(index)
    toast({
      title: 'Day removed',
      description: `${dayName} has been deleted from your program.`,
    })
  }

  const toggleDayCollapse = (index: number) => {
    setCollapsedDays(prev => {
      const updated = new Set(prev)
      if (updated.has(index)) {
        updated.delete(index)
      } else {
        updated.add(index)
      }
      return updated
    })
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
        className="text-orange-500 hover:text-orange-600 touch-manipulation min-h-[44px] min-w-[44px]"
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
      <div className="sticky top-0 z-20 -mx-4 -mt-4 bg-background/95 px-4 py-4 sm:mx-0 sm:mt-0 sm:bg-transparent sm:px-0 sm:py-0 backdrop-blur-sm sm:backdrop-blur-none border-b sm:border-b-0 border-border/60">
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
      </div>

      <div className="space-y-4 pb-6">
        {days.map((day, index) => {
          const groupedByMuscle = day.muscleGroups?.map(group => ({
            label: `${group.group} x ${group.count} planned`,
            count: group.count,
          })) ?? []

          const isDayCollapsed = collapsedDays.has(index)

          return (
            <div key={day.dayNumber} className="rounded-lg border border-border/60 bg-card overflow-hidden">
              {/* Day Header - Always visible, clickable to collapse */}
              <div className="cursor-pointer transition-colors hover:bg-muted/30 px-3 py-3 sm:px-4 sm:py-4" onClick={() => toggleDayCollapse(index)}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center flex-1 min-w-0 gap-3">
                    {/* Collapse/Expand Icon */}
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform',
                        isDayCollapsed && '-rotate-90'
                      )}
                    />

                    {editingDayIndex === index ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center flex-1">
                        <Input
                          value={tempDayName}
                          onChange={(e) => setTempDayName(e.target.value)}
                          onBlur={saveDayName}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveDayName()
                            if (e.key === 'Escape') cancelEditingDayName()
                          }}
                          className="text-base font-semibold h-8"
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
                            disabled={!tempDayName.trim()}
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
                            startEditingDayName(index)
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteDay(index, day.dayName)
                      }}
                      aria-label={`Delete ${day.dayName}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
              {!isDayCollapsed && (
                <>
                  {/* Action Buttons - Separated from header */}
                  <div className="border-t border-border/40 px-3 py-3 sm:px-4 sm:py-4 bg-muted/20">
                    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none"
                        onClick={() => onRandomizeDay(index)}
                      >
                        Randomize day
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none"
                        onClick={() => openAddDialog(index)}
                        disabled={isSelectionDisabled}
                      >
                        Add exercise
                      </Button>
                    </div>
                  </div>

                  {/* Exercise List */}
                  <div className="px-3 py-3 sm:px-4 sm:py-4 space-y-3">
                    {day.exercises.length === 0 ? (
                      <div className="rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
                        No exercises added yet. Use the assignment step or randomize button to populate this day.
                      </div>
                    ) : (
                      day.exercises.map((exercise, exerciseIndex) => (
                        <ExerciseRow
                          key={exercise.tempId}
                          exercise={exercise}
                          onRemove={tempId => onRemoveExercise(index, tempId)}
                          actionSlot={renderReplaceActions({ exercise, dayIndex: index, exerciseIndex })}
                        />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
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
