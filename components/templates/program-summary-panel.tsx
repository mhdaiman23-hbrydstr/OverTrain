"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { ProgramMeta } from "./types"

interface ProgramSummaryPanelProps {
  meta: ProgramMeta
  onMetaChange: <K extends keyof ProgramMeta>(key: K, value: ProgramMeta[K]) => void
  fieldErrors: Record<string, string>
}

export function ProgramSummaryPanel({ meta, onMetaChange, fieldErrors }: ProgramSummaryPanelProps) {
  const getError = (path: string) => fieldErrors[path]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Program Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="program-name">Program name</Label>
          <Input
            id="program-name"
            value={meta.name}
            placeholder="Ultimate Strength Builder"
            onChange={(event) => onMetaChange("name", event.target.value)}
            className={cn(getError("meta.name") && "border-destructive focus-visible:ring-destructive")}
          />
          {getError("meta.name") && <p className="text-xs text-destructive">{getError("meta.name")}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="program-description">Description</Label>
          <Textarea
            id="program-description"
            value={meta.description}
            placeholder="Describe the intent of this program so coaches know when to assign it."
            onChange={(event) => onMetaChange("description", event.target.value)}
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  )
}
