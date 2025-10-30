
"use client"

import type { RefObject } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, ArrowLeftRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { getMuscleGroupBadgeClass, getMuscleGroupLabel } from "@/lib/exercise-muscle-groups"
import type { ExerciseLibraryItem } from "./types"

export interface LibraryFilters {
  search: string
  muscleGroup: string
  equipment: string
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
  const updateFilter = <K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

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
            <Label htmlFor="exercise-equipment">Equipment</Label>
            <Input
              id="exercise-equipment"
              value={filters.equipment}
              placeholder="e.g. Barbell"
              onChange={(event) => updateFilter("equipment", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exercise-muscle">Muscle group</Label>
            <Input
              id="exercise-muscle"
              value={filters.muscleGroup}
              placeholder="e.g. Back"
              onChange={(event) => updateFilter("muscleGroup", event.target.value)}
            />
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
  )
}
