"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeftRight } from "lucide-react"
import { cn } from "@/lib/utils"
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
}

export function ExerciseLibraryPanel({
  filters,
  onFiltersChange,
  exercises,
  isLoading,
  error,
  activeDayName,
  listHeightClassName,
}: ExerciseLibraryPanelProps) {
  const updateFilter = <K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <Card className="hidden w-80 flex-col lg:flex">
      <CardHeader>
        <CardTitle>Exercise Library</CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-3">
        <div className="space-y-2">
          <div>
            <Label htmlFor="exercise-search">Search</Label>
            <Input
              id="exercise-search"
              value={filters.search}
              placeholder="Exercise name"
              onChange={(event) => updateFilter("search", event.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Equipment</Label>
            <Input
              value={filters.equipment}
              placeholder="e.g. Barbell"
              onChange={(event) => updateFilter("equipment", event.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Muscle group</Label>
            <Input
              value={filters.muscleGroup}
              placeholder="e.g. Back"
              onChange={(event) => updateFilter("muscleGroup", event.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Drag exercises into the schedule{activeDayName ? ` — ${activeDayName}` : ""}
          </div>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>

        <ScrollArea
          className={cn(
            "rounded border border-border/40",
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
                  event.dataTransfer.setData(
                    "application/json",
                    JSON.stringify({ exercise }),
                  )
                }
                className="group cursor-grab rounded-md border-b border-border/40 p-3 transition hover:bg-muted/40 active:cursor-grabbing"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium leading-tight">{exercise.name}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <Badge variant="outline">{exercise.muscle_group}</Badge>
                      <Badge variant="outline">{exercise.equipment_type}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
