"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { getMuscleGroupBadgeClass, getMuscleGroupLabel } from "@/lib/exercise-muscle-groups"
import { getEquipmentBadgeClass, getEquipmentLabel } from "@/lib/exercise-equipment"
import type { BuilderDay, GlobalProgressionDefaults, ProgramMeta } from "./types"

interface TemplatePreviewDialogProps {
  meta: ProgramMeta
  days: BuilderDay[]
  globalProgress: GlobalProgressionDefaults
  totalWeeks: number
}

const formatExerciseCount = (count: number) => {
  if (count === 0) return "No exercises yet"
  if (count === 1) return "1 exercise"
  return `${count} exercises`
}

export function TemplatePreviewDialog({ meta, days, globalProgress, totalWeeks }: TemplatePreviewDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[86rem] md:max-w-[86rem] lg:max-w-[86rem] xl:max-w-[90rem] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Program Preview</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{meta.name || "Untitled Program"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{meta.description || "No description provided."}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{meta.progressionType.toUpperCase()}</Badge>
                <Badge variant="outline">{meta.daysPerWeek} days/week</Badge>
                <Badge variant="outline">{totalWeeks} weeks</Badge>
                {meta.gender.map((gender) => (
                  <Badge key={gender} variant="outline">
                    {gender}
                  </Badge>
                ))}
                {meta.experienceLevel.map((level) => (
                  <Badge key={level} variant="secondary">
                    {level}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {days.map((day) => {
            const dayTitle = day.dayName || `Day ${day.dayNumber}`
            return (
              <Card key={day.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="font-semibold">
                        Day {day.dayNumber}
                      </Badge>
                      <CardTitle className="text-base">{dayTitle}</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs font-medium">
                      {formatExerciseCount(day.exercises.length)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {day.exercises.map((exercise) => {
                    const workingSets = exercise.useGlobalProgression ? globalProgress.workingSets : exercise.workingSets
                    const workingRepRange = exercise.useGlobalProgression
                      ? globalProgress.workingRepRange
                      : exercise.workingRepRange
                    const deloadSets = exercise.useGlobalProgression ? globalProgress.deloadSets : exercise.deloadSets
                    const deloadRepRange = exercise.useGlobalProgression
                      ? globalProgress.deloadRepRange
                      : exercise.deloadRepRange
                    return (
                      <div key={exercise.id} className="rounded border border-border/50 p-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold">{exercise.exerciseName}</span>
                            <Badge variant="outline" className="capitalize">
                              {exercise.category}
                            </Badge>
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
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>Tier {exercise.tier === "tier1" ? "1" : "2"}</span>
                            <span>{exercise.restTimeSeconds}s rest</span>
                            <span>{exercise.useGlobalProgression ? "Using global defaults" : "Custom progression"}</span>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-4">
                          <div>
                            <span className="font-semibold">Sets</span>: {workingSets}
                          </div>
                          <div>
                            <span className="font-semibold">Reps</span>: {workingRepRange}
                          </div>
                          <div>
                            <span className="font-semibold">Deload Sets</span>: {deloadSets}
                          </div>
                          <div>
                            <span className="font-semibold">Rest</span>: {exercise.restTimeSeconds}s
                          </div>
                          <div className="md:col-span-2">
                            <span className="font-semibold">Deload Reps</span>: {deloadRepRange}
                          </div>
                          <div>
                            <span className="font-semibold">Auto progression</span>:{" "}
                            {exercise.useGlobalProgression
                              ? globalProgress.autoProgressionEnabled
                                ? "Enabled"
                                : "Disabled"
                              : exercise.autoProgressionEnabled
                                ? "Enabled"
                                : "Disabled"}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {day.exercises.length === 0 && (
                  <div className="rounded border border-dashed border-border/50 p-4 text-center text-sm text-muted-foreground">
                    No exercises assigned yet.
                  </div>
                )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
