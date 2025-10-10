"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Plus, RefreshCw, Trash2 } from "lucide-react"
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
  onAddExercise: (dayId: string, exercise: ExerciseLibraryItem) => void
  onLibraryDrop: (dayId: string, payload: { exercise: ExerciseLibraryItem }) => void
  availableExercises: ExerciseLibraryItem[]
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
  onAddExercise,
  onLibraryDrop,
  availableExercises,
}: SchedulePanelProps) {
  const activeDay = days.find((day) => day.id === activeDayId) ?? days[0]

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
            Duplicate Day
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeDayId} onValueChange={onActiveDayChange}>
          <TabsList className="w-full overflow-x-auto">
            {days.map((day) => (
              <TabsTrigger key={day.id} value={day.id} className="flex-1 min-w-[120px]">
                {day.dayName}
              </TabsTrigger>
            ))}
          </TabsList>
          {days.map((day) => (
            <TabsContent key={day.id} value={day.id} className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                  <div className="space-y-2">
                    <Label>Day title</Label>
                    <Input
                      value={day.dayName}
                      onChange={(event) =>
                        onUpdateDay(day.id, (prev) => ({ ...prev, dayName: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
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
                    />
                  </div>
                </div>
                <Button variant="destructive" size="sm" onClick={() => onRemoveDay(day.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Day
                </Button>
              </div>

              <div
                className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-4 transition hover:border-primary"
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
              >
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-medium">Exercises</div>
                    <div className="text-xs text-muted-foreground">
                      Drag from the exercise library or use the quick-add button.
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const first = availableExercises[0]
                      if (first) onAddExercise(day.id, first)
                    }}
                    disabled={availableExercises.length === 0}
                  >
                    Add from library
                  </Button>
                </div>

                <div className="space-y-3">
                  {day.exercises.map((exercise, index) => (
                    <div key={exercise.id} className="rounded-md border border-border/40 bg-background p-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="text-sm font-semibold">{exercise.exerciseName}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <Badge variant="outline">{exercise.category}</Badge>
                            {exercise.useGlobalProgression && <Badge variant="secondary">Global progression</Badge>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onReorderExercise(day.id, exercise.id, "up")}
                          >
                            ↑
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onReorderExercise(day.id, exercise.id, "down")}
                          >
                            ↓
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => onRemoveExercise(day.id, exercise.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="grid gap-3 md:grid-cols-3">
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
                        <div className="space-y-2">
                          <Label>Rest (seconds)</Label>
                          <Input
                            type="number"
                            min={30}
                            value={exercise.restTimeSeconds}
                            onChange={(event) =>
                              onUpdateExercise(day.id, exercise.id, (prev) => ({
                                ...prev,
                                restTimeSeconds: Number(event.target.value) || prev.restTimeSeconds,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tier</Label>
                          <Select
                            value={exercise.tier}
                            onValueChange={(value: "tier1" | "tier2") =>
                              onUpdateExercise(day.id, exercise.id, (prev) => ({ ...prev, tier: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select tier" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tier1">Tier 1</SelectItem>
                              <SelectItem value="tier2">Tier 2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between rounded border border-border/40 px-3 py-2">
                        <div>
                          <div className="text-xs font-medium uppercase text-muted-foreground">Use global progression</div>
                          <div className="text-xs text-muted-foreground">
                            Toggle to override these exercises with custom progression values.
                          </div>
                        </div>
                        <Switch
                          checked={exercise.useGlobalProgression}
                          onCheckedChange={(checked) =>
                            onUpdateExercise(day.id, exercise.id, (prev) => ({ ...prev, useGlobalProgression: checked }))
                          }
                        />
                      </div>
                      {!exercise.useGlobalProgression && (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
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
                            />
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
                            />
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
                            />
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
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Progression mode</Label>
                            <Select
                              value={exercise.progressionMode}
                              onValueChange={(value: "weight_based" | "rep_based") =>
                                onUpdateExercise(day.id, exercise.id, (prev) => ({ ...prev, progressionMode: value }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select mode" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="weight_based">Weight based</SelectItem>
                                <SelectItem value="rep_based">Rep based</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Auto progression</Label>
                            <div className="flex items-center justify-between rounded border border-border/40 px-3 py-2">
                              <div className="text-xs text-muted-foreground">
                                Enable automatic adjustments for this exercise only.
                              </div>
                              <Switch
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
                        </div>
                      )}
                    </div>
                  ))}
                  {day.exercises.length === 0 && (
                    <div className="rounded border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                      Drop exercises here to build this day&apos;s training plan.
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
