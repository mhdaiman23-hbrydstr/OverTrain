"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { GlobalProgressionDefaults, ProgramMeta } from "./types"

interface ProgressionPanelProps {
  meta: ProgramMeta
  onMetaChange: <K extends keyof ProgramMeta>(key: K, value: ProgramMeta[K]) => void
  defaults: GlobalProgressionDefaults
  onDefaultsChange: (value: GlobalProgressionDefaults) => void
}

export function ProgressionPanel({ meta, onMetaChange, defaults, onDefaultsChange }: ProgressionPanelProps) {
  const handleDefaults = <K extends keyof GlobalProgressionDefaults>(key: K, value: GlobalProgressionDefaults[K]) => {
    onDefaultsChange({ ...defaults, [key]: value })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progression Defaults</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
          <div>
            <div className="text-sm font-medium">Apply progression globally</div>
            <div className="text-xs text-muted-foreground">
              When enabled, all exercises inherit these defaults. Override individual exercises as needed.
            </div>
          </div>
          <Switch
            checked={meta.applyGlobalProgression}
            onCheckedChange={(checked) => onMetaChange("applyGlobalProgression", checked)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Working sets</Label>
            <Input
              type="number"
              min={1}
              value={defaults.workingSets}
              onChange={(event) => handleDefaults("workingSets", Number(event.target.value) || 1)}
            />
          </div>
          <div className="space-y-2">
            <Label>Working rep range</Label>
            <Input
              value={defaults.workingRepRange}
              onChange={(event) => handleDefaults("workingRepRange", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Deload sets (final week)</Label>
            <Input
              type="number"
              min={0}
              value={defaults.deloadSets}
              onChange={(event) => handleDefaults("deloadSets", Number(event.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Deload rep range</Label>
            <Input
              value={defaults.deloadRepRange}
              onChange={(event) => handleDefaults("deloadRepRange", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Rest time (seconds)</Label>
            <Input
              type="number"
              min={30}
              value={defaults.restTimeSeconds}
              onChange={(event) => handleDefaults("restTimeSeconds", Number(event.target.value) || 60)}
            />
          </div>
          <div className="space-y-2">
            <Label>Progression mode</Label>
            <Select
              value={defaults.progressionMode}
              onValueChange={(value: "weight_based" | "rep_based") => handleDefaults("progressionMode", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select progression mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weight_based">Weight based</SelectItem>
                <SelectItem value="rep_based">Rep based</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
          <div>
            <div className="text-sm font-medium">Auto progression</div>
            <div className="text-xs text-muted-foreground">
              Toggle whether weight or rep adjustments happen automatically when all sets are completed.
            </div>
          </div>
          <Switch
            checked={defaults.autoProgressionEnabled}
            onCheckedChange={(checked) => handleDefaults("autoProgressionEnabled", checked)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
