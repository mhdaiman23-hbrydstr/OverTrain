"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowDown, ArrowUp, Plus, RefreshCw, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { CompactSwitch } from "./compact-switch"
import { SortableExerciseCard } from "./sortable-exercise-card"
import {
  DndContext,
  DragEndEvent,
  closestCenter,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import type { BuilderDay, ExerciseLibraryItem } from "./types"

interface SchedulePanelProps {
  activeDayId: string
  onActiveDayChange: (id: string) => void
  days: BuilderDay[]
  onAddDay: () => void
  onDuplicateDay: (id: string) => void
  onRemoveDay: (id: string) => void
  onUpdateDay: (id: string, updater: (day: BuilderDay) => BuilderDay) => void
  onUpdateExercise: (
    dayId: string,
    exerciseId: string,
    updater: (exercise: BuilderDay["exercises"][0]) => BuilderDay["exercises"][0],
  ) => void
  onRemoveExercise: (dayId: string, exerciseId: string) => void
  onReorderExercise: (dayId: string, exerciseId: string, direction: "up" | "down") => void
  onLibraryDrop: (dayId: string, payload: { exercise: ExerciseLibraryItem }) => void
  fieldErrors: Record<string, string>
}

export function SchedulePanel({
  activeDayId,
  onActiveDayChange,
  days,
  onAddDay,
  onDuplicateDay,
  onRemoveDay,
  onUpdateDay,
  onUpdateExercise,
  onRemoveExercise,
  onReorderExercise,
  onLibraryDrop,
  fieldErrors,
}: SchedulePanelProps) {
  const activeDay = days.find((day) => day.id === activeDayId) ?? days[0]
  const getError = (path: string) => fieldErrors[path]

  // Handle drag end for exercise reordering within a day
  const handleExerciseDragEnd = (event: DragEndEvent, dayId: string) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const day = days.find(d => d.id === dayId)
    if (!day) return

    const oldIndex = day.exercises.findIndex(e => e.id === active.id)
    const newIndex = day.exercises.findIndex(e => e.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const reorderedExercises = arrayMove(day.exercises, oldIndex, newIndex)

    // Update each exercise with new order
    reorderedExercises.forEach((exercise, index) => {
      onUpdateExercise(dayId, exercise.id, (prev) => ({
        ...prev,
        exercise_order: index + 1,
      }))
    })
  }

  return (
    <Card className="h-[500px]">
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <CardTitle>Program Schedule</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onAddDay}>
            <Plus className="mr-2 h-4 w-4" />
            Add Day
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => activeDay && onDuplicateDay(activeDay.id)}
            disabled={!activeDay}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Duplicate Selected
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => activeDay && onRemoveDay(activeDay.id)}
            disabled={!activeDay}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove Selected
          </Button>
        </div>
      </CardHeader>
      <CardContent className="h-full pt-0">
        <div className="h-full overflow-hidden">
          <div className="h-full overflow-x-auto">
            <div className="flex h-full gap-3 pb-3">
              {days.map((day) => {
                const isActive = day.id === activeDayId
                const hasErrors = Object.keys(fieldErrors).some((key) => key.startsWith(`day.${day.id}`))

                const focusDay = () => {
                  if (!isActive) {
                    onActiveDayChange(day.id)
                  }
                }

                return (
                  <div
                    key={day.id}
                    className={cn(
                      "flex h-full w-[280px] flex-none flex-col gap-3 rounded-xl border bg-background p-3 shadow-sm transition",
                      isActive && "border-primary ring-2 ring-primary/20",
                      hasErrors && "border-destructive/60",
                    )}
                    onClick={() => onActiveDayChange(day.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <Label>Day title</Label>
                        <Input
                          value={day.dayName}
                          onChange={(event) =>
                            onUpdateDay(day.id, (prev) => ({ ...prev, dayName: event.target.value }))
                          }
                          onFocus={focusDay}
                          className={cn(getError(`day.${day.id}.name`) && "border-destructive focus-visible:ring-destructive")}
                        />
                        {getError(`day.${day.id}.name`) && (
                          <p className="text-xs text-destructive">{getError(`day.${day.id}.name`)}</p>
                        )}
                      </div>
                      <div className="w-24 space-y-2">
                        <Label>Order</Label>
                        <Input
                          type="number"
                          min={1}
                          value={day.dayNumber}
                          onChange={(event) =>
                            onUpdateDay(day.id, (prev) => ({
                              ...prev,
                              dayNumber: Number(event.target.value) || prev.dayNumber,
                            }))
                          }
                          onFocus={focusDay}
                          className={cn(getError(`day.${day.id}.number`) && "border-destructive focus-visible:ring-destructive")}
                        />
                        {getError(`day.${day.id}.number`) && (
                          <p className="text-xs text-destructive">{getError(`day.${day.id}.number`)}</p>
                        )}
                      </div>
                    </div>

                    <div
                      className={cn(
                        "flex-1 rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 text-sm transition hover:border-primary",
                        getError(`day.${day.id}.exercises`) && "border-destructive hover:border-destructive",
                      )}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault()
                        const payload = event.dataTransfer.getData("application/json")
                        if (!payload) return
                        try {
                          const parsed = JSON.parse(payload) as { exercise: ExerciseLibraryItem }
                          onLibraryDrop(day.id, parsed)
                        } catch (error) {
                          console.error("[SchedulePanel] failed to parse drop payload", error)
                        }
                      }}
                      onClick={focusDay}
                    >
                      {getError(`day.${day.id}.exercises`) && (
                        <p className="mb-3 rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                          {getError(`day.${day.id}.exercises`)}
                        </p>
                      )}

                      {day.exercises.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          Drag exercises here to start building this day.
                        </div>
                      ) : (
                        <DndContext
                          collisionDetection={closestCenter}
                          onDragEnd={(event) => handleExerciseDragEnd(event, day.id)}
                        >
                          <SortableContext
                            items={day.exercises.map(e => e.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-3">
                              {day.exercises.map((exercise, index) => (
                                <SortableExerciseCard key={exercise.id} id={exercise.id}>
                                  <div className="flex flex-col gap-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                                        <div className="text-sm font-semibold leading-tight">{exercise.exerciseName}</div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            onReorderExercise(day.id, exercise.id, "up")
                                          }}
                                        >
                                          <ArrowUp className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            onReorderExercise(day.id, exercise.id, "down")
                                          }}
                                        >
                                          <ArrowDown className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            onRemoveExercise(day.id, exercise.id)
                                          }}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>

                                    <Separator />

                                    <CompactSwitch
                                      label="Use global progression"
                                      description="Override below if this exercise requires unique progression."
                                      checked={exercise.useGlobalProgression}
                                      onCheckedChange={(checked) =>
                                        onUpdateExercise(day.id, exercise.id, (prev) => ({
                                          ...prev,
                                          useGlobalProgression: checked,
                                        }))
                                      }
                                    />

                                    {!exercise.useGlobalProgression && (
                                      <div className="max-h-60 overflow-y-auto">
                                        <div className="grid gap-3 md:grid-cols-2">
                                          <div className="space-y-2">
                                            <Label>Working sets</Label>
                                            <Input
                                              type="number"
                                              min={1}
                                              value={exercise.workingSets}
                                              onChange={(event) =>
                                                onUpdateExercise(day.id, exercise.id, (prev) => ({
                                                  ...prev,
                                                  workingSets: Number(event.target.value) || prev.workingSets,
                                                }))
                                              }
                                              className={cn(
                                                getError(`day.${day.id}.exercise.${exercise.id}.workingSets`) &&
                                                  "border-destructive focus-visible:ring-destructive",
                                              )}
                                            />
                                            {getError(`day.${day.id}.exercise.${exercise.id}.workingSets`) && (
                                              <p className="text-xs text-destructive">
                                                {getError(`day.${day.id}.exercise.${exercise.id}.workingSets`)}
                                              </p>
                                            )}
                                          </div>
                                          <div className="space-y-2">
                                            <Label>Working rep range</Label>
                                            <Input
                                              value={exercise.workingRepRange}
                                              onChange={(event) =>
                                                onUpdateExercise(day.id, exercise.id, (prev) => ({
                                                  ...prev,
                                                  workingRepRange: event.target.value,
                                                }))
                                              }
                                              className={cn(
                                                getError(`day.${day.id}.exercise.${exercise.id}.workingRepRange`) &&
                                                  "border-destructive focus-visible:ring-destructive",
                                              )}
                                            />
                                            {getError(`day.${day.id}.exercise.${exercise.id}.workingRepRange`) && (
                                              <p className="text-xs text-destructive">
                                                {getError(`day.${day.id}.exercise.${exercise.id}.workingRepRange`)}
                                              </p>
                                            )}
                                          </div>
                                          <div className="space-y-2">
                                            <Label>Deload sets</Label>
                                            <Input
                                              type="number"
                                              min={0}
                                              value={exercise.deloadSets}
                                              onChange={(event) =>
                                                onUpdateExercise(day.id, exercise.id, (prev) => ({
                                                  ...prev,
                                                  deloadSets: Number(event.target.value) || prev.deloadSets,
                                                }))
                                              }
                                              className={cn(
                                                getError(`day.${day.id}.exercise.${exercise.id}.deloadSets`) &&
                                                  "border-destructive focus-visible:ring-destructive",
                                              )}
                                            />
                                            {getError(`day.${day.id}.exercise.${exercise.id}.deloadSets`) && (
                                              <p className="text-xs text-destructive">
                                                {getError(`day.${day.id}.exercise.${exercise.id}.deloadSets`)}
                                              </p>
                                            )}
                                          </div>
                                          <div className="space-y-2">
                                            <Label>Deload rep range</Label>
                                            <Input
                                              value={exercise.deloadRepRange}
                                              onChange={(event) =>
                                                onUpdateExercise(day.id, exercise.id, (prev) => ({
                                                  ...prev,
                                                  deloadRepRange: event.target.value,
                                                }))
                                              }
                                              className={cn(
                                                getError(`day.${day.id}.exercise.${exercise.id}.deloadRepRange`) &&
                                                  "border-destructive focus-visible:ring-destructive",
                                              )}
                                            />
                                            {getError(`day.${day.id}.exercise.${exercise.id}.deloadRepRange`) && (
                                              <p className="text-xs text-destructive">
                                                {getError(`day.${day.id}.exercise.${exercise.id}.deloadRepRange`)}
                                              </p>
                                            )}
                                          </div>
                                          <div className="space-y-2">
                                            <Label>Progression mode</Label>
                                            <Select
                                              value={exercise.progressionMode}
                                              onValueChange={(value: "weight_based" | "rep_based") =>
                                                onUpdateExercise(day.id, exercise.id, (prev) => ({ ...prev, progressionMode: value }))
                                              }
                                            >
                                              <SelectTrigger
                                                className={cn(
                                                  getError(`day.${day.id}.exercise.${exercise.id}.progressionMode`) &&
                                                    "border-destructive focus-visible:ring-destructive",
                                                )}
                                              >
                                                <SelectValue placeholder="Select mode" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="weight_based">Weight based</SelectItem>
                                                <SelectItem value="rep_based">Rep based</SelectItem>
                                              </SelectContent>
                                            </Select>
                                            {getError(`day.${day.id}.exercise.${exercise.id}.progressionMode`) && (
                                              <p className="text-xs text-destructive">
                                                {getError(`day.${day.id}.exercise.${exercise.id}.progressionMode`)}
                                              </p>
                                            )}
                                          </div>
                                          <CompactSwitch
                                            label="Auto progression"
                                            description="Enable automatic adjustments for this exercise only."
                                            checked={exercise.autoProgressionEnabled}
                                            onCheckedChange={(checked) =>
                                              onUpdateExercise(day.id, exercise.id, (prev) => ({
                                                ...prev,
                                                autoProgressionEnabled: checked,
                                              }))
                                            }
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </SortableExerciseCard>
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
