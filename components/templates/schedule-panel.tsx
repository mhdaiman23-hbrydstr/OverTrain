
"use client"

import type { DragEvent as ReactDragEvent } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowDown, ArrowUp, Info, Plus, RefreshCw, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getMuscleGroupBadgeClass, getMuscleGroupLabel } from "@/lib/exercise-muscle-groups"
import { getEquipmentBadgeClass, getEquipmentLabel } from "@/lib/exercise-equipment"
import { CompactSwitch } from "./compact-switch"
import { SortableExerciseCard } from "./sortable-exercise-card"
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core"
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable"
import type { BuilderDay, ExerciseLibraryItem } from "./types"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
  onAddExerciseRequest?: () => void
}
const formatExerciseCount = (count: number) => {
  if (count === 0) return "No exercises yet"
  if (count === 1) return "1 exercise"
  return `${count} exercises`
}

const formatProgressionSummary = (exercise: BuilderDay["exercises"][0]) => {
  if (exercise.useGlobalProgression) {
    return "Using global defaults"
  }

  return `${exercise.workingSets}x${exercise.workingRepRange} | deload ${exercise.deloadSets}x${exercise.deloadRepRange}`
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
  onAddExerciseRequest,
}: SchedulePanelProps) {
  if (!days.length) return null

  const activeDay = days.find((day) => day.id === activeDayId) ?? days[0]
  const tabValue = activeDay?.id ?? days[0].id
  const getError = (path: string) => fieldErrors[path]

  const handleExerciseDragEnd = (dayId: string) => (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const day = days.find((entry) => entry.id === dayId)
    if (!day) return

    const oldIndex = day.exercises.findIndex((exercise) => exercise.id === active.id)
    const newIndex = day.exercises.findIndex((exercise) => exercise.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(day.exercises, oldIndex, newIndex).map((exercise, index) => ({
      ...exercise,
      order: index + 1,
    }))

    onUpdateDay(dayId, (prev) => ({
      ...prev,
      exercises: reordered,
    }))
  }

  const handleLibraryDropInternal = (event: ReactDragEvent<HTMLDivElement>, dayId: string) => {
    event.preventDefault()
    const payload = event.dataTransfer.getData("application/json")
    if (!payload) return
    try {
      const parsed = JSON.parse(payload) as { exercise: ExerciseLibraryItem }
      onLibraryDrop(dayId, parsed)
    } catch (error) {
      console.error("[SchedulePanel] failed to parse drop payload", error)
    }
  }
  return (
    <TooltipProvider>
      <Tabs value={tabValue} onValueChange={onActiveDayChange} className="flex h-full flex-col">
        <Card className="flex h-full flex-col">
        <CardHeader className="space-y-4 border-b border-border/60 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
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
                Duplicate
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => activeDay && onRemoveDay(activeDay.id)}
                disabled={!activeDay}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto pb-1">
            <TabsList className="flex h-auto w-full gap-2 bg-transparent p-0">
              {days.map((day, index) => {
                const hasErrors = Object.keys(fieldErrors).some((key) => key.startsWith(`day.${day.id}`))
                return (
                  <TabsTrigger
                    key={day.id}
                    value={day.id}
                    className={cn(
                      "flex min-w-[10rem] flex-col items-start gap-1 rounded-lg border border-transparent bg-muted/60 px-3 py-2 text-left text-xs font-medium transition-all data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:shadow",
                      hasErrors && "border-destructive/60 text-destructive data-[state=active]:border-destructive",
                    )}
                  >
                    <span className="text-sm font-semibold leading-tight">
                      {day.dayName || `Day ${index + 1}`}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatExerciseCount(day.exercises.length)}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          {days.map((day) => {
            const exercisesError = getError(`day.${day.id}.exercises`)
            return (
              <TabsContent
                key={day.id}
                value={day.id}
                className="flex h-full flex-col gap-4 px-6 py-6 data-[state=inactive]:hidden"
              >
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
                    <div className="space-y-2">
                      <Label htmlFor={`day-${day.id}-name`}>Day Title</Label>
                      <Input
                        id={`day-${day.id}-name`}
                        value={day.dayName}
                        onChange={(event) =>
                          onUpdateDay(day.id, (prev) => ({ ...prev, dayName: event.target.value }))
                        }
                        className={cn(
                          getError(`day.${day.id}.name`) && "border-destructive focus-visible:ring-destructive",
                        )}
                      />
                      {getError(`day.${day.id}.name`) && (
                        <p className="text-xs text-destructive">{getError(`day.${day.id}.name`)}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`day-${day.id}-order`}>Order</Label>
                      <Input
                        id={`day-${day.id}-order`}
                        type="number"
                        min={1}
                        value={day.dayNumber}
                        onChange={(event) =>
                          onUpdateDay(day.id, (prev) => ({
                            ...prev,
                            dayNumber: Number(event.target.value) || prev.dayNumber,
                          }))
                        }
                        className={cn(
                          getError(`day.${day.id}.number`) && "border-destructive focus-visible:ring-destructive",
                        )}
                      />
                      {getError(`day.${day.id}.number`) && (
                        <p className="text-xs text-destructive">{getError(`day.${day.id}.number`)}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 rounded-md border border-dashed border-border/60 bg-background px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs sm:text-sm">
                      Drag exercises in from the library or add them directly below. Reorder with drag handles or the
                      arrows.
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={() => onAddExerciseRequest?.()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Exercise
                    </Button>
                  </div>
                </div>

                <div
                  className={cn(
                    "flex-1 overflow-hidden rounded-xl border-2 border-dashed border-border/60 bg-muted/10",
                    exercisesError && "border-destructive/70 bg-destructive/5",
                  )}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleLibraryDropInternal(event, day.id)}
                >
                  <div className="flex h-full flex-col">
                    {exercisesError && (
                      <div className="px-6 pt-5 text-xs text-destructive">{exercisesError}</div>
                    )}
                    {day.exercises.length === 0 ? (
                      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center text-sm text-muted-foreground">
                        <p>Nothing scheduled here yet.</p>
                        <Button variant="secondary" size="sm" onClick={() => onAddExerciseRequest?.()}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add your first exercise
                        </Button>
                      </div>
                    ) : (
                      <DndContext collisionDetection={closestCenter} onDragEnd={handleExerciseDragEnd(day.id)}>
                        <SortableContext items={day.exercises.map((exercise) => exercise.id)} strategy={verticalListSortingStrategy}>
                          <div className="flex-1 overflow-y-auto px-4 py-4">
                            <div className="space-y-3">
                              {day.exercises.map((exercise, index) => {
                                const basePath = `day.${day.id}.exercise.${exercise.id}`
                                return (
                                  <SortableExerciseCard key={exercise.id} id={exercise.id}>
                                    <div className="space-y-3">
                                      <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="space-y-1">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="secondary" className="font-medium">
                                              #{index + 1}
                                            </Badge>
                                            <span className="text-sm font-semibold leading-tight">
                                              {exercise.exerciseName}
                                            </span>
                                            {(exercise.muscleGroup || exercise.equipmentType) && (
                                              <div className="flex flex-wrap items-center gap-1">
                                                {exercise.muscleGroup && (
                                                  <Badge
                                                    className={cn(
                                                      "px-1.5 py-0 text-[0.65rem] font-semibold",
                                                      getMuscleGroupBadgeClass(exercise.muscleGroup),
                                                    )}
                                                  >
                                                    {getMuscleGroupLabel(exercise.muscleGroup)}
                                                  </Badge>
                                                )}
                                                {exercise.equipmentType && (
                                                  <Badge
                                                    className={cn(
                                                      "px-1.5 py-0 text-[0.65rem] font-semibold",
                                                      getEquipmentBadgeClass(exercise.equipmentType),
                                                    )}
                                                  >
                                                    {getEquipmentLabel(exercise.equipmentType)}
                                                  </Badge>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                            <span className="capitalize">{exercise.category}</span>
                                            <span>Tier {exercise.tier === "tier1" ? "1" : "2"}</span>
                                            <span>{exercise.restTimeSeconds}s rest</span>
                                            <span>{formatProgressionSummary(exercise)}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => onReorderExercise(day.id, exercise.id, "up")}
                                            disabled={index === 0}
                                          >
                                            <ArrowUp className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => onReorderExercise(day.id, exercise.id, "down")}
                                            disabled={index === day.exercises.length - 1}
                                          >
                                            <ArrowDown className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive hover:text-destructive"
                                            onClick={() => onRemoveExercise(day.id, exercise.id)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>

                                      <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="settings">
                                          <AccordionTrigger className="text-xs font-medium text-muted-foreground hover:no-underline">
                                            Progression and timing
                                          </AccordionTrigger>
                                          <AccordionContent className="space-y-4 pt-2">
                                            <div className="grid gap-4 sm:grid-cols-2">
                                              <div className="space-y-2">
                                                <Label>Rest time (seconds)</Label>
                                                <Input
                                                  type="number"
                                                  min={15}
                                                  value={exercise.restTimeSeconds}
                                                  onChange={(event) =>
                                                    onUpdateExercise(day.id, exercise.id, (prev) => ({
                                                      ...prev,
                                                      restTimeSeconds: Number(event.target.value) || prev.restTimeSeconds,
                                                    }))
                                                  }
                                                  className={cn(
                                                    getError(`${basePath}.restTimeSeconds`) &&
                                                      "border-destructive focus-visible:ring-destructive",
                                                  )}
                                                />
                                                {getError(`${basePath}.restTimeSeconds`) && (
                                                  <p className="text-xs text-destructive">
                                                    {getError(`${basePath}.restTimeSeconds`)}
                                                  </p>
                                                )}
                                              </div>
                                              <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                  <Label>Tier</Label>
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <button
                                                        type="button"
                                                        className="rounded-full p-1 text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                                      >
                                                        <Info className="h-4 w-4" />
                                                      </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-xs text-sm">
                                                      <p>
                                                        Tier 1 suits primary compound lifts that can handle larger jumps.
                                                        Tier 2 fits accessory or isolation work with smaller adjustments.
                                                      </p>
                                                    </TooltipContent>
                                                  </Tooltip>
                                                </div>
                                                <Select
                                                  value={exercise.tier}
                                                  onValueChange={(value: "tier1" | "tier2") =>
                                                    onUpdateExercise(day.id, exercise.id, (prev) => ({ ...prev, tier: value }))
                                                  }
                                                >
                                                  <SelectTrigger
                                                    className={cn(
                                                      getError(`${basePath}.tier`) &&
                                                        "border-destructive focus-visible:ring-destructive",
                                                    )}
                                                  >
                                                    <SelectValue placeholder="Select tier" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="tier1">Tier 1 - Primary/compound focus</SelectItem>
                                                    <SelectItem value="tier2">Tier 2 - Accessory/isolation focus</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                                {getError(`${basePath}.tier`) && (
                                                  <p className="text-xs text-destructive">
                                                    {getError(`${basePath}.tier`)}
                                                  </p>
                                                )}
                                              </div>
                                              <div className="space-y-2">
                                                <Label>Category</Label>
                                                <Select
                                                  value={exercise.category}
                                                  onValueChange={(value: "compound" | "isolation") =>
                                                    onUpdateExercise(day.id, exercise.id, (prev) => ({ ...prev, category: value }))
                                                  }
                                                >
                                                  <SelectTrigger>
                                                    <SelectValue placeholder="Select category" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="compound">Compound</SelectItem>
                                                    <SelectItem value="isolation">Isolation</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                            </div>

                                            <div className="rounded-md border border-border/60 bg-muted/10 p-3">
                                              <CompactSwitch
                                                label="Use global progression defaults"
                                                description="Override to customize sets, reps, and automation for this exercise."
                                                checked={exercise.useGlobalProgression}
                                                onCheckedChange={(checked) =>
                                                  onUpdateExercise(day.id, exercise.id, (prev) => ({
                                                    ...prev,
                                                    useGlobalProgression: checked,
                                                  }))
                                                }
                                              />
                                            </div>

                                            {!exercise.useGlobalProgression && (
                                              <div className="grid gap-4 sm:grid-cols-2">
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
                                                      getError(`${basePath}.workingSets`) &&
                                                        "border-destructive focus-visible:ring-destructive",
                                                    )}
                                                  />
                                                  {getError(`${basePath}.workingSets`) && (
                                                    <p className="text-xs text-destructive">
                                                      {getError(`${basePath}.workingSets`)}
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
                                                      getError(`${basePath}.workingRepRange`) &&
                                                        "border-destructive focus-visible:ring-destructive",
                                                    )}
                                                  />
                                                  {getError(`${basePath}.workingRepRange`) && (
                                                    <p className="text-xs text-destructive">
                                                      {getError(`${basePath}.workingRepRange`)}
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
                                                        deloadSets: Number(event.target.value) ?? prev.deloadSets,
                                                      }))
                                                    }
                                                    className={cn(
                                                      getError(`${basePath}.deloadSets`) &&
                                                        "border-destructive focus-visible:ring-destructive",
                                                    )}
                                                  />
                                                  {getError(`${basePath}.deloadSets`) && (
                                                    <p className="text-xs text-destructive">
                                                      {getError(`${basePath}.deloadSets`)}
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
                                                      getError(`${basePath}.deloadRepRange`) &&
                                                        "border-destructive focus-visible:ring-destructive",
                                                    )}
                                                  />
                                                  {getError(`${basePath}.deloadRepRange`) && (
                                                    <p className="text-xs text-destructive">
                                                      {getError(`${basePath}.deloadRepRange`)}
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                            )}

                                            <div className="grid gap-4 sm:grid-cols-2">
                                              <div className="space-y-2">
                                                <Label>Progression mode</Label>
                                                <Select
                                                  value={exercise.progressionMode}
                                                  onValueChange={(value: "weight_based" | "rep_based") =>
                                                    onUpdateExercise(day.id, exercise.id, (prev) => ({
                                                      ...prev,
                                                      progressionMode: value,
                                                    }))
                                                  }
                                                >
                                                  <SelectTrigger
                                                    className={cn(
                                                      getError(`${basePath}.progressionMode`) &&
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
                                                {getError(`${basePath}.progressionMode`) && (
                                                  <p className="text-xs text-destructive">
                                                    {getError(`${basePath}.progressionMode`)}
                                                  </p>
                                                )}
                                              </div>
                                              <div className="rounded-md border border-border/60 bg-muted/10 p-3">
                                                <CompactSwitch
                                                  label="Auto progression"
                                                  description="Automatically adjust when all sets are completed."
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
                                          </AccordionContent>
                                        </AccordionItem>
                                      </Accordion>
                                    </div>
                                  </SortableExerciseCard>
                                )
                              })}
                            </div>
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                </div>
              </TabsContent>
            )
          })}
        </CardContent>
        </Card>
      </Tabs>
    </TooltipProvider>
  )
}
