import { useMemo, useState } from 'react'
import { RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import type { Exercise } from '@/lib/services/exercise-library-service'
import type { DayInWizard, ExerciseInWizard } from '../types'
import { DaySection } from '../components/DaySection'

interface StepDayBuilderProps {
  days: DayInWizard[]
  onRenameDay: (index: number, name: string) => void
  onEditMuscleGroups?: (index: number) => void
  onRandomizeDay: (index: number) => void
  onRemoveDay: (index: number) => void
  onRemoveExercise: (dayIndex: number, tempId: string) => void
  onReorderExercise: (dayIndex: number, fromIndex: number, toIndex: number) => void
  onAddDay: () => void
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
  exercises,
  isExerciseLoading,
  exerciseError,
  onReplaceExercise,
  onBack,
  onNext,
}: StepDayBuilderProps) {
  const hasAtLeastOneExercise = days.every(day => day.exercises.length > 0)
  const [replaceTarget, setReplaceTarget] = useState<{
    dayIndex: number
    exercise: ExerciseInWizard
    exerciseIndex: number
  } | null>(null)
  const [searchValue, setSearchValue] = useState('')

  const { recommendedOptions, allOptions } = useMemo(() => {
    if (!replaceTarget) {
      return { recommendedOptions: [] as Exercise[], allOptions: [] as Exercise[] }
    }

    const normalized = searchValue.trim().toLowerCase()
    const matchesSearch = (exercise: Exercise) => {
      if (!normalized) return true
      return (
        exercise.name.toLowerCase().includes(normalized) ||
        exercise.muscleGroup.toLowerCase().includes(normalized) ||
        (exercise.equipmentType?.toLowerCase() ?? '').includes(normalized)
      )
    }

    const allMatches = exercises.filter(matchesSearch)

    const currentMuscle = replaceTarget.exercise.muscleGroup?.toLowerCase()
    const recommended = currentMuscle
      ? allMatches.filter(item => item.muscleGroup.toLowerCase() === currentMuscle)
      : allMatches.slice(0, 20)

    const recommendedIds = new Set(recommended.map(item => item.id))
    const rest = allMatches.filter(item => !recommendedIds.has(item.id))

    return { recommendedOptions: recommended, allOptions: rest }
  }, [replaceTarget, exercises, searchValue])

  const handleSelectReplacement = (exercise: Exercise) => {
    if (!replaceTarget) return
    onReplaceExercise(replaceTarget.dayIndex, replaceTarget.exercise.tempId, exercise)
    setReplaceTarget(null)
    setSearchValue('')
  }

  const renderReplaceActions = (params: { exercise: ExerciseInWizard; dayIndex: number; exerciseIndex: number }) => {
    const isOpen =
      replaceTarget?.exercise.tempId === params.exercise.tempId &&
      replaceTarget?.dayIndex === params.dayIndex &&
      replaceTarget?.exerciseIndex === params.exerciseIndex

    const hasExercises = exercises.length > 0
    const isDisabled = isExerciseLoading && !hasExercises
    const hasResults = recommendedOptions.length > 0 || allOptions.length > 0

    return (
      <Popover
        
        onOpenChange={open => {
          if (open) {
            setReplaceTarget(params)
            setSearchValue('')
          } else if (isOpen) {
            setReplaceTarget(null)
            setSearchValue('')
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            disabled={isDisabled}
            aria-label={`Replace ${params.exercise.exerciseName}`}
          >
            <RefreshCcw className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(20rem,calc(100vw-3rem))] p-0" sideOffset={8}>
          <Command shouldFilter={false}>
            <CommandInput
              value={searchValue}
              onValueChange={setSearchValue}
              placeholder="Search exercises..."
              disabled={isDisabled}
            />
            <CommandList>
              {isExerciseLoading && (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                  <Spinner className="size-4" />
                  Loading exercises...
                </div>
              )}
              {!isExerciseLoading && exerciseError && (
                <div className="px-3 py-3 text-sm text-destructive">{exerciseError}</div>
              )}
              {!isExerciseLoading && !exerciseError && (
                <>
                  {!hasResults && <CommandEmpty>No exercises found.</CommandEmpty>}
                  {recommendedOptions.length > 0 && (
                    <CommandGroup heading="Recommended">
                      {recommendedOptions.map(option => (
                        <CommandItem
                          key={option.id}
                          value={option.name}
                          onSelect={() => handleSelectReplacement(option)}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{option.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {option.muscleGroup} · {option.equipmentType}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {allOptions.length > 0 && (
                    <CommandGroup heading={recommendedOptions.length > 0 ? 'All exercises' : 'Exercises'}>
                      {allOptions.map(option => (
                        <CommandItem
                          key={option.id}
                          value={option.name}
                          onSelect={() => handleSelectReplacement(option)}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{option.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {option.muscleGroup} · {option.equipmentType}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
          <Separator />
          <div className="px-3 py-2 text-[10px] uppercase text-muted-foreground tracking-wide">
            Replaces {params.exercise.exerciseName}
          </div>
        </PopoverContent>
      </Popover>
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
    </div>
  )
}



