"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import type { BuilderDay, GlobalProgressionDefaults, ProgramMeta } from "./types"

interface TemplatePreviewDialogProps {
  meta: ProgramMeta
  days: BuilderDay[]
  globalProgress: GlobalProgressionDefaults
  totalWeeks: number
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
      <DialogContent className="max-w-4xl overflow-y-auto">
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

          {days.map((day) => (
            <Card key={day.id}>
              <CardHeader>
                <CardTitle className="text-base">{day.dayName}</CardTitle>
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
                    <div key={exercise.id} className="rounded border border-border/50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{exercise.exerciseName}</div>
                        <Badge variant="outline">{exercise.category}</Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-4">
                        <div>
                          <span className="font-medium">Sets</span>: {workingSets}
                        </div>
                        <div>
                          <span className="font-medium">Reps</span>: {workingRepRange}
                        </div>
                        <div>
                          <span className="font-medium">Deload Sets</span>: {deloadSets}
                        </div>
                        <div>
                          <span className="font-medium">Rest</span>: {exercise.restTimeSeconds}s
                        </div>
                        <div className="md:col-span-2">
                          <span className="font-medium">Deload Reps</span>: {deloadRepRange}
                        </div>
                        <div>
                          <span className="font-medium">Auto progression</span>:{" "}
                          {exercise.useGlobalProgression
                            ? globalProgress.autoProgressionEnabled ? "Enabled" : "Disabled"
                            : exercise.autoProgressionEnabled ? "Enabled" : "Disabled"}
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
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
