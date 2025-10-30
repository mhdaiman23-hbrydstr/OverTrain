"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, SlidersHorizontal, Info } from "lucide-react"
import { ExerciseLibraryFilter, type ExerciseLibraryFilterValues } from "@/components/exercise-library-filter"
import { exerciseService, type Exercise } from "@/lib/services/exercise-library-service"
import { MobileTooltip } from "@/components/ui/mobile-tooltip"
import { getMuscleGroupBadgeClass, getMuscleGroupLabel } from "@/lib/exercise-muscle-groups"
import { cn } from "@/lib/utils"

interface ExerciseLibraryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectExercise: (exercise: Exercise, options?: { repeat?: boolean }) => void
  currentExerciseName?: string
}

export function ExerciseLibrary({ open, onOpenChange, onSelectExercise, currentExerciseName }: ExerciseLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState<ExerciseLibraryFilterValues>({
    muscleGroups: [],
    equipmentTypes: [],
  })
  const [repeat, setRepeat] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const availableMuscleGroups = useMemo(() => {
    const groups = new Set<string>()
    exercises.forEach((exercise) => {
      if (exercise.muscleGroup) {
        groups.add(exercise.muscleGroup)
      }
    })
    return Array.from(groups).sort((a, b) => a.localeCompare(b))
  }, [exercises])

  const availableEquipmentTypes = useMemo(() => {
    const equipmentSet = new Set<string>()
    exercises.forEach((exercise) => {
      if (exercise.equipmentType) {
        equipmentSet.add(exercise.equipmentType)
      }
    })
    return Array.from(equipmentSet).sort((a, b) => a.localeCompare(b))
  }, [exercises])

  // Load exercises when dialog opens
  useEffect(() => {
    if (open) {
      loadExercises()
    }
  }, [open])

  const loadExercises = async () => {
    setLoading(true)
    setError(null)
    try {
      const allExercises = await exerciseService.getAllExercises()
      setExercises(allExercises)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercises')
      console.error('Error loading exercises:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFilters = (filters: ExerciseLibraryFilterValues) => {
    setSelectedFilters(filters)
    setShowFilters(false)
  }

  const handleClearFilters = () => {
    setSelectedFilters({ muscleGroups: [], equipmentTypes: [] })
  }

  const hasActiveFilters = selectedFilters.muscleGroups.length > 0 || selectedFilters.equipmentTypes.length > 0

  const filteredExercises = exercises.filter((exercise: Exercise) => {
    // Search filter
    if (searchQuery && !exercise.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }

    // Muscle group filter
    if (selectedFilters.muscleGroups.length > 0 && !selectedFilters.muscleGroups.includes(exercise.muscleGroup)) {
      return false
    }

    // Equipment type filter
    if (selectedFilters.equipmentTypes.length > 0 && !selectedFilters.equipmentTypes.includes(exercise.equipmentType)) {
      return false
    }

    return true
  })

  const handleReplace = () => {
    if (selectedExercise) {
      onSelectExercise(selectedExercise, { repeat })
      onOpenChange(false)
      setSearchQuery("")
      setSelectedExercise(null)
      setRepeat(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    setSearchQuery("")
    setSelectedExercise(null)
    setRepeat(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Exercises</DialogTitle>
          </DialogHeader>

          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => setShowFilters(true)}>
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {/* Active Filters */}
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

          {/* Exercise List */}
          <div className="flex-1 overflow-y-auto border rounded-md">
            {filteredExercises.map((exercise) => {
              const selected = selectedExercise?.id === exercise.id
              return (
                <Button
                  key={exercise.id}
                  onClick={() => setSelectedExercise(exercise)}
                  variant={selected ? "outline" : "ghost"}
                  className={`w-full justify-start text-left h-auto py-3 px-4 border-b last:border-b-0 rounded-none ${selected ? "bg-primary/10 text-foreground" : ""}`}
                >
                  <div className="flex-1">
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
                  </div>
                </Button>
              )
            })}
          </div>

          {/* Repeat Checkbox */}
          <div className="flex items-center space-x-2 py-2">
            <Checkbox id="repeat" checked={repeat} onCheckedChange={(checked) => setRepeat(checked === true)} />
            <div className="flex items-center gap-1">
              <label htmlFor="repeat" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                Repeat
              </label>
              <MobileTooltip
                side="top"
                align="start"
                sideOffset={8}
                content={
                  <span className="max-w-xs block text-left">
                    When checked, this exercise replaces every upcoming instance in the program. Leave it off to change only today's workout.
                  </span>
                }
                className="z-[120]"
              >
                <button
                  type="button"
                  className="p-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="What does repeat do?"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </MobileTooltip>
            </div>
          </div>

          {/* Footer Buttons */}
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              CANCEL
            </Button>
            <Button onClick={handleReplace} disabled={!selectedExercise}>
              REPLACE
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
