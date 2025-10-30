"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { CompactSwitch } from "./compact-switch"
import type { GlobalProgressionDefaults, ProgramMeta } from "./types"

interface ProgressionPanelProps {
  meta: ProgramMeta
  onMetaChange: <K extends keyof ProgramMeta>(key: K, value: ProgramMeta[K]) => void
  defaults: GlobalProgressionDefaults
  onDefaultsChange: (value: GlobalProgressionDefaults) => void
  fieldErrors: Record<string, string>
}

export function ProgressionPanel({ meta, onMetaChange, defaults, onDefaultsChange, fieldErrors }: ProgressionPanelProps) {
  const handleDefaults = <K extends keyof GlobalProgressionDefaults>(key: K, value: GlobalProgressionDefaults[K]) => {
    onDefaultsChange({ ...defaults, [key]: value })
  }
  const getError = (path: string) => fieldErrors[path]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progression Defaults</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <CompactSwitch
          label="Apply progression globally"
          description="When enabled, all exercises inherit these defaults. Override individual exercises as needed."
          checked={meta.applyGlobalProgression}
          onCheckedChange={(checked) => onMetaChange("applyGlobalProgression", checked)}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Working sets</Label>
            <Input
              type="number"
              min={1}
              value={defaults.workingSets}
              onChange={(event) => handleDefaults("workingSets", Number(event.target.value) || 1)}
              className={cn(getError("progress.workingSets") && "border-destructive focus-visible:ring-destructive")}
            />
            {getError("progress.workingSets") && (
              <p className="text-xs text-destructive">{getError("progress.workingSets")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Working rep range</Label>
            <Input
              value={defaults.workingRepRange}
              onChange={(event) => handleDefaults("workingRepRange", event.target.value)}
              className={cn(getError("progress.workingRepRange") && "border-destructive focus-visible:ring-destructive")}
            />
            {getError("progress.workingRepRange") && (
              <p className="text-xs text-destructive">{getError("progress.workingRepRange")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Deload sets (final week)</Label>
            <Input
              type="number"
              min={0}
              value={defaults.deloadSets}
              onChange={(event) => handleDefaults("deloadSets", Number(event.target.value) || 0)}
              className={cn(getError("progress.deloadSets") && "border-destructive focus-visible:ring-destructive")}
            />
            {getError("progress.deloadSets") && (
              <p className="text-xs text-destructive">{getError("progress.deloadSets")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Deload rep range</Label>
            <Input
              value={defaults.deloadRepRange}
              onChange={(event) => handleDefaults("deloadRepRange", event.target.value)}
              className={cn(getError("progress.deloadRepRange") && "border-destructive focus-visible:ring-destructive")}
            />
            {getError("progress.deloadRepRange") && (
              <p className="text-xs text-destructive">{getError("progress.deloadRepRange")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Rest time (seconds)</Label>
            <Input
              type="number"
              min={30}
              value={defaults.restTimeSeconds}
              onChange={(event) => handleDefaults("restTimeSeconds", Number(event.target.value) || 60)}
              className={cn(getError("progress.restTimeSeconds") && "border-destructive focus-visible:ring-destructive")}
            />
            {getError("progress.restTimeSeconds") && (
              <p className="text-xs text-destructive">{getError("progress.restTimeSeconds")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Progression mode</Label>
            <Select
              value={defaults.progressionMode}
              onValueChange={(value: "weight_based" | "rep_based") => handleDefaults("progressionMode", value)}
            >
              <SelectTrigger className={cn(getError("progress.progressionMode") && "border-destructive focus-visible:ring-destructive")}>
                <SelectValue placeholder="Select progression mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weight_based">Weight based</SelectItem>
                <SelectItem value="rep_based">Rep based</SelectItem>
              </SelectContent>
            </Select>
            {getError("progress.progressionMode") && (
              <p className="text-xs text-destructive">{getError("progress.progressionMode")}</p>
            )}
          </div>
        </div>

        <CompactSwitch
          label="Auto progression"
          description="Toggle whether weight or rep adjustments happen automatically when all sets are completed."
          checked={defaults.autoProgressionEnabled}
          onCheckedChange={(checked) => handleDefaults("autoProgressionEnabled", checked)}
        />
      </CardContent>
    </Card>
  )
}
