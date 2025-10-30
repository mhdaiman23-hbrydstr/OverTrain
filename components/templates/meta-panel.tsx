"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CompactSwitch } from "./compact-switch"
import type { ExperienceOption, GenderOption, ProgramMeta, ProgressionType } from "./types"

interface MetaPanelProps {
  meta: ProgramMeta
  onMetaChange: <K extends keyof ProgramMeta>(key: K, value: ProgramMeta[K]) => void
  onToggleOption: (key: "gender" | "experienceLevel", value: GenderOption | ExperienceOption) => void
  fieldErrors: Record<string, string>
}

export function MetaPanel({ meta, onMetaChange, onToggleOption, fieldErrors }: MetaPanelProps) {
  const getError = (path: string) => fieldErrors[path]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Program Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="program-days">Days per week</Label>
            <Input
              id="program-days"
              type="number"
              min={1}
              max={7}
              value={meta.daysPerWeek}
              onChange={(event) => onMetaChange("daysPerWeek", Number(event.target.value) || 1)}
              className={cn(getError("meta.daysPerWeek") && "border-destructive focus-visible:ring-destructive")}
            />
            {getError("meta.daysPerWeek") && <p className="text-xs text-destructive">{getError("meta.daysPerWeek")}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="program-weeks">Total weeks</Label>
            <Input
              id="program-weeks"
              type="number"
              min={1}
              max={52}
              value={meta.totalWeeks}
              onChange={(event) => onMetaChange("totalWeeks", Number(event.target.value) || 1)}
              className={cn(getError("meta.totalWeeks") && "border-destructive focus-visible:ring-destructive")}
            />
            {getError("meta.totalWeeks") && <p className="text-xs text-destructive">{getError("meta.totalWeeks")}</p>}
          </div>
          <div className="space-y-2">
            <Label>Progression type</Label>
            <Select
              value={meta.progressionType}
              onValueChange={(value: ProgressionType) => onMetaChange("progressionType", value)}
            >
              <SelectTrigger className={cn(getError("meta.progressionType") && "border-destructive focus-visible:ring-destructive")}>
                <SelectValue placeholder="Select progression type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linear">Linear</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
            {getError("meta.progressionType") && (
              <p className="text-xs text-destructive">{getError("meta.progressionType")}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Target gender</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["male", "female"] as GenderOption[]).map((option) => (
                <Badge
                  key={option}
                  variant={meta.gender.includes(option) ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => onToggleOption("gender", option)}
                >
                  {option}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label>Experience level</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["beginner", "intermediate", "advanced"] as ExperienceOption[]).map((option) => (
                <Badge
                  key={option}
                  variant={meta.experienceLevel.includes(option) ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => onToggleOption("experienceLevel", option)}
                >
                  {option}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <CompactSwitch
          label="Program visibility"
          description="Active templates appear immediately in the programs list."
          checked={meta.isActive}
          onCheckedChange={(checked) => onMetaChange("isActive", checked)}
        />
      </CardContent>
    </Card>
  )
}
