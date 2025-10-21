import { useEffect, useMemo, useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import type { Exercise } from '@/lib/services/exercise-library-service'
import { cn } from '@/lib/utils'
import {
  ExerciseLibraryFilter,
  type ExerciseLibraryFilterValues,
} from '@/components/exercise-library-filter'
import { getMuscleGroupBadgeClass, getMuscleGroupLabel } from '@/lib/exercise-muscle-groups'

interface ExerciseSelectionDialogProps {
  isOpen: boolean
  mode: 'replace' | 'add'
  onClose: () => void
  exercises: Exercise[]
  isLoading: boolean
  error: string | null
  currentExerciseName?: string
  presetMuscleGroup?: string | null
  onSelectExercise: (exercise: Exercise) => void
}

const DEFAULT_FILTERS: ExerciseLibraryFilterValues = {
  muscleGroups: [],
  equipmentTypes: [],
}

export function ExerciseSelectionDialog({
  isOpen,
  mode,
  onClose,
  exercises,
  isLoading,
  error,
  currentExerciseName,
  presetMuscleGroup,
  onSelectExercise,
}: ExerciseSelectionDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedFilters, setSelectedFilters] =
    useState<ExerciseLibraryFilterValues>(DEFAULT_FILTERS)

  const availableMuscleGroups = useMemo(() => {
    const groups = new Set<string>()
    exercises.forEach(exercise => {
      if (exercise.muscleGroup) {
        groups.add(exercise.muscleGroup)
      }
    })
    return Array.from(groups).sort((a, b) => a.localeCompare(b))
  }, [exercises])

  const availableEquipmentTypes = useMemo(() => {
    const equipment = new Set<string>()
    exercises.forEach(exercise => {
      if (exercise.equipmentType) {
        equipment.add(exercise.equipmentType)
      }
    })
    return Array.from(equipment).sort((a, b) => a.localeCompare(b))
  }, [exercises])

  useEffect(() => {
    setSelectedFilters(prev => {
      const validMuscleGroups = prev.muscleGroups.filter(group =>
        availableMuscleGroups.includes(group),
      )
      const validEquipmentTypes = prev.equipmentTypes.filter(type =>
        availableEquipmentTypes.includes(type),
      )

      if (
        validMuscleGroups.length === prev.muscleGroups.length &&
        validEquipmentTypes.length === prev.equipmentTypes.length
      ) {
        return prev
      }

      return {
        muscleGroups: validMuscleGroups,
        equipmentTypes: validEquipmentTypes,
      }
    })
  }, [availableMuscleGroups, availableEquipmentTypes])

  useEffect(() => {
    if (!isOpen) return
    setSearchQuery('')

    if (presetMuscleGroup && availableMuscleGroups.includes(presetMuscleGroup)) {
      setSelectedFilters({
        muscleGroups: [presetMuscleGroup],
        equipmentTypes: [],
      })
      return
    }

    setSelectedFilters(DEFAULT_FILTERS)
  }, [isOpen, presetMuscleGroup, availableMuscleGroups])

  const filteredExercises = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return exercises.filter(exercise => {
      if (query) {
        const matchesQuery =
          exercise.name.toLowerCase().includes(query) ||
          exercise.muscleGroup.toLowerCase().includes(query) ||
          exercise.equipmentType?.toLowerCase().includes(query)
        if (!matchesQuery) {
          return false
        }
      }

      if (
        selectedFilters.muscleGroups.length > 0 &&
        !selectedFilters.muscleGroups.includes(exercise.muscleGroup)
      ) {
        return false
      }

      if (
        selectedFilters.equipmentTypes.length > 0 &&
        (!exercise.equipmentType ||
          !selectedFilters.equipmentTypes.includes(exercise.equipmentType))
      ) {
        return false
      }

      return true
    })
  }, [exercises, searchQuery, selectedFilters])

  const hasActiveFilters =
    selectedFilters.muscleGroups.length > 0 || selectedFilters.equipmentTypes.length > 0

  const description =
    mode === 'replace'
      ? `Choose a new exercise to replace "${currentExerciseName ?? ''}". You can search by name, muscle group, or equipment.`
      : 'Choose an exercise to add to this training day. You can search by name, muscle group, or equipment.'

  const handleApplyFilters = (filters: ExerciseLibraryFilterValues) => {
    setSelectedFilters(filters)
    setShowFilters(false)
  }

  const handleClearFilters = () => {
    setSelectedFilters(DEFAULT_FILTERS)
  }

  const handleSelectFirst = () => {
    if (filteredExercises.length === 0) return
    onSelectExercise(filteredExercises[0])
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={open => (!open ? onClose() : undefined)}>
        <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col gap-4 overflow-hidden">
          <DialogHeader className="space-y-2">
            <DialogTitle>{mode === 'replace' ? 'Replace Exercise' : 'Add Exercise'}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search exercises..."
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(true)}
                aria-label="Open exercise filters"
              >
                <SlidersHorizontal className="size-4" />
              </Button>
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Active filters:</span>
                {selectedFilters.muscleGroups.map(group => (
                  <span
                    key={`filter-muscle-${group}`}
                    className={cn(
                      'rounded border px-2 py-0.5 text-[11px] font-medium',
                      getMuscleGroupBadgeClass(group),
                    )}
                  >
                    {getMuscleGroupLabel(group)}
                  </span>
                ))}
                {selectedFilters.equipmentTypes.map(type => (
                  <span
                    key={`filter-equipment-${type}`}
                    className="rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground/80"
                  >
                    {type}
                  </span>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="h-6 px-2"
                  onClick={handleClearFilters}
                >
                  Clear
                </Button>
              </div>
            )}

            <div className="flex-1 overflow-hidden rounded-md border border-border/60">
              {isLoading ? (
                <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-4" />
                  Loading exercises...
                </div>
              ) : error ? (
                <div className="flex h-48 flex-col items-center justify-center gap-3 text-sm text-destructive">
                  <span>{error}</span>
                  <Button variant="outline" size="sm" onClick={handleClearFilters}>
                    Clear filters
                  </Button>
                </div>
              ) : filteredExercises.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                  <span>No exercises found. Adjust your search or filters.</span>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={handleClearFilters}>
                      Clear filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="max-h-[50vh] overflow-y-auto">
                  <div className="divide-y divide-border/60">
                    {filteredExercises.map(exercise => (
                      <button
                        key={exercise.id}
                        type="button"
                        className="w-full px-4 py-3 text-left transition-colors hover:bg-muted/40"
                        onClick={() => onSelectExercise(exercise)}
                      >
                        <p className="font-medium text-sm">{exercise.name}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span
                            className={cn(
                              'rounded border px-2 py-0.5 text-[11px] font-medium',
                              getMuscleGroupBadgeClass(exercise.muscleGroup),
                            )}
                          >
                            {getMuscleGroupLabel(exercise.muscleGroup)}
                          </span>
                          <span>/</span>
                          <span>{exercise.equipmentType}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSelectFirst}
              disabled={isLoading || filteredExercises.length === 0}
            >
              Select Exercise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExerciseLibraryFilter
        open={showFilters}
        onOpenChange={setShowFilters}
        onApply={handleApplyFilters}
        currentFilters={selectedFilters}
        muscleGroups={availableMuscleGroups}
        equipmentTypes={availableEquipmentTypes}
      />
    </>
  )
}
