
"use client"

import { useMemo, useState, type RefObject } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, ArrowLeftRight, SlidersHorizontal, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { getMuscleGroupBadgeClass, getMuscleGroupLabel } from "@/lib/exercise-muscle-groups"
import { Button } from "@/components/ui/button"
import {
  ExerciseLibraryFilter,
  type ExerciseLibraryFilterValues,
} from "@/components/exercise-library-filter"
import type { ExerciseLibraryItem } from "./types"

export interface LibraryFilters {
  search: string
  muscleGroups: string[]
  equipmentTypes: string[]
}

interface ExerciseLibraryPanelProps {
  filters: LibraryFilters
  onFiltersChange: (filters: LibraryFilters) => void
  exercises: ExerciseLibraryItem[]
  isLoading: boolean
  error: string | null
  activeDayName?: string
  listHeightClassName?: string
  searchInputRef?: RefObject<HTMLInputElement>
}
export function ExerciseLibraryPanel({
  filters,
  onFiltersChange,
  exercises,
  isLoading,
  error,
  activeDayName,
  listHeightClassName,
  searchInputRef,
}: ExerciseLibraryPanelProps) {
  const [showFilters, setShowFilters] = useState(false)

  const updateFilter = <K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const availableMuscleGroups = useMemo(() => {
    const groups = new Set<string>()
    exercises.forEach((exercise) => {
      if (exercise.muscle_group) {
        groups.add(exercise.muscle_group)
      }
    })
    return Array.from(groups).sort((a, b) => a.localeCompare(b))
  }, [exercises])

  const availableEquipmentTypes = useMemo(() => {
    const types = new Set<string>()
    exercises.forEach((exercise) => {
      if (exercise.equipment_type) {
        types.add(exercise.equipment_type)
      }
    })
    return Array.from(types).sort((a, b) => a.localeCompare(b))
  }, [exercises])

  const handleApplyFilters = (values: ExerciseLibraryFilterValues) => {
    onFiltersChange({
      ...filters,
      muscleGroups: values.muscleGroups,
      equipmentTypes: values.equipmentTypes,
    })
    setShowFilters(false)
  }

  const clearFilters = () => {
    onFiltersChange({
      ...filters,
      muscleGroups: [],
      equipmentTypes: [],
    })
  }

  const hasActiveFilters =
    (filters.muscleGroups?.length ?? 0) > 0 || (filters.equipmentTypes?.length ?? 0) > 0

  return (
    <Card className="flex h-full w-full flex-col">
      <CardHeader className="space-y-1 border-b border-border/60">
        <CardTitle>Exercise Library</CardTitle>
        <p className="text-xs text-muted-foreground">
          Search, filter, and drag exercises into the active training day.
        </p>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-4 overflow-hidden">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="space-y-1.5">
            <Label htmlFor="exercise-search">Search</Label>
            <Input
              id="exercise-search"
              ref={searchInputRef}
              value={filters.search}
              placeholder="Exercise name"
              onChange={(event) => updateFilter("search", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Filters</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Open filter options"
                onClick={() => setShowFilters(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
              <div className="flex flex-1 flex-wrap items-center gap-2 text-xs">
                {filters.muscleGroups.map((group) => (
                  <span
                    key={`tag-muscle-${group}`}
                    className={cn(
                      "flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium",
                      getMuscleGroupBadgeClass(group),
                    )}
                  >
                    {getMuscleGroupLabel(group)}
                    <button
                      type="button"
                      aria-label={`Remove ${group} filter`}
                      className="rounded-full p-0.5 text-[11px] hover:text-foreground"
                      onClick={() =>
                        onFiltersChange({
                          ...filters,
                          muscleGroups: filters.muscleGroups.filter((item) => item !== group),
                        })
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {filters.equipmentTypes.map((type) => (
                  <span
                    key={`tag-equipment-${type}`}
                    className="flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground/80"
                  >
                    {type}
                    <button
                      type="button"
                      aria-label={`Remove ${type} filter`}
                      className="rounded-full p-0.5 text-[11px] hover:text-foreground"
                      onClick={() =>
                        onFiltersChange({
                          ...filters,
                          equipmentTypes: filters.equipmentTypes.filter((item) => item !== type),
                        })
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {hasActiveFilters && (
                  <Button type="button" variant="ghost" size="xs" className="h-6 px-2" onClick={clearFilters}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Drag exercises into the schedule{activeDayName ? ` for ${activeDayName}` : ""}
          </div>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>

        <ScrollArea
          className={cn(
            "flex-1 rounded-lg border border-border/40",
            listHeightClassName ? `${listHeightClassName} flex-shrink-0` : "flex-1",
          )}
        >
          <div className="divide-y divide-border/40">
            {error && <div className="p-4 text-sm text-destructive">{error}</div>}
            {!error && exercises.length === 0 && !isLoading && (
              <div className="p-4 text-sm text-muted-foreground">No exercises match your filters.</div>
            )}
            {exercises.map((exercise) => (
              <div
                key={exercise.id}
                draggable
                onDragStart={(event) =>
                  event.dataTransfer.setData("application/json", JSON.stringify({ exercise }))
                }
                className="group cursor-grab border-b border-border/40 p-3 transition hover:bg-muted/50 active:cursor-grabbing"
              >
                <div className="text-sm font-medium leading-tight">{exercise.name}</div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "rounded border px-2 py-0.5 text-[11px] font-medium",
                      getMuscleGroupBadgeClass(exercise.muscle_group),
                    )}
                  >
                    {getMuscleGroupLabel(exercise.muscle_group)}
                  </span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-muted-foreground">{exercise.equipment_type}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
    <ExerciseLibraryFilter
      open={showFilters}
      onOpenChange={setShowFilters}
      onApply={handleApplyFilters}
      currentFilters={{
        muscleGroups: filters.muscleGroups,
        equipmentTypes: filters.equipmentTypes,
      }}
      muscleGroups={availableMuscleGroups}
      equipmentTypes={availableEquipmentTypes}
    />
  )
}
