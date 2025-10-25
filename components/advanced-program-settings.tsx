"use client"

import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronUp, Settings, AlertTriangle, Info } from "lucide-react"
import type { GymTemplate, ProgressionConfig } from "@/lib/gym-templates"
import type { ProgressionOverride } from "@/lib/program-state"

interface AdvancedProgramSettingsProps {
  template: GymTemplate
  userProfile: {
    experience: "beginner" | "intermediate" | "advanced"
    gender: "male" | "female"
  }
  onOverrideChange: (override: ProgressionOverride | undefined) => void
}

export function AdvancedProgramSettings({ template, userProfile, onOverrideChange }: AdvancedProgramSettingsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [overrideEnabled, setOverrideEnabled] = useState(false)
  const [overrideType, setOverrideType] = useState<"linear" | "percentage" | "hybrid">("linear")
  const [weeklyIncrease, setWeeklyIncrease] = useState("2.5")
  const [minIncrement, setMinIncrement] = useState("2.5")
  const [oneRMData, setOneRMData] = useState<Record<string, string>>({})
  const [compoundProgression, setCompoundProgression] = useState<"linear" | "percentage">("linear")
  const [accessoryProgression, setAccessoryProgression] = useState<"linear" | "percentage">("linear")

  // Safety checks for beginners
  const isBeginner = userProfile.experience === "beginner"
  const showBeginnerWarning = isBeginner && overrideType === "percentage"

  const handleOverrideToggle = (enabled: boolean) => {
    setOverrideEnabled(enabled)
    if (!enabled) {
      onOverrideChange(undefined)
    }
  }

  const generateOverride = (): ProgressionOverride | undefined => {
    if (!overrideEnabled) return undefined

    const baseOverride: ProgressionOverride = {
      enabled: true,
      overrideType
    }

    switch (overrideType) {
      case "linear":
        baseOverride.customRules = {
          linear: {
            weeklyIncrease: parseFloat(weeklyIncrease) / 100,
            minIncrement: parseFloat(minIncrement)
          }
        }
        break

      case "percentage":
        baseOverride.customRules = {
          percentage: {
            requiresOneRM: true,
            percentageProgression: generatePercentageProgression()
          }
        }
        break

      case "hybrid":
        baseOverride.customRules = {
          hybrid: {
            compoundProgression,
            accessoryProgression,
            compoundExercises: [
              "squat", "deadlift", "bench press", "overhead press", "barbell row",
              "pull-up", "chin-up", "dip"
            ]
          }
        }
        break
    }

    return baseOverride
  }

  const generatePercentageProgression = () => {
    const weeks = template.weeks || 6
    const progression: Record<string, { working: number[]; deload?: number[] }> = {}

    for (let week = 1; week <= weeks; week++) {
      const weekKey = `week${week}`
      if (week === weeks) {
        // Deload week
        progression[weekKey] = {
          working: [70, 75, 80],
          deload: [60, 65, 70]
        }
      } else {
        // Progressive loading
        const basePercentage = 75 + ((week - 1) * 3)
        progression[weekKey] = {
          working: [
            basePercentage,
            basePercentage + 2.5,
            basePercentage + 5
          ]
        }
      }
    }

    return progression
  }

  const handleSaveOverride = () => {
    const override = generateOverride()
    onOverrideChange(override)
  }

  const templateProgressionType = template.progressionConfig?.type ||
                                (template.progressionScheme?.type === "periodized" ? "percentage" : "linear")

  return (
    <div className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="cursor-pointer hover:bg-muted/30 transition-colors p-3 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="text-sm font-medium">Progression Override</span>
                {overrideEnabled && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    ⚙️ Custom
                  </Badge>
                )}
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Override default progression • Template uses {templateProgressionType}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-4 pt-3">
            {/* Override Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="override-enabled"
                checked={overrideEnabled}
                onCheckedChange={handleOverrideToggle}
              />
              <Label htmlFor="override-enabled" className="text-sm">
                Enable custom progression
              </Label>
            </div>

            {overrideEnabled && (
              <>
                {/* Progression Type Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Type</Label>
                  <RadioGroup value={overrideType} onValueChange={(value: any) => setOverrideType(value)} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="linear" id="linear" />
                      <Label htmlFor="linear" className="text-sm">Linear</Label>
                    </div>
                    <div className="flex items-center space-x-2 opacity-50 cursor-not-allowed">
                      <RadioGroupItem value="percentage" id="percentage" disabled />
                      <Label htmlFor="percentage" className="text-sm text-muted-foreground">Percentage (1RM)</Label>
                      <Badge variant="outline" className="text-xs ml-2">Coming Soon</Badge>
                    </div>
                    <div className="flex items-center space-x-2 opacity-50 cursor-not-allowed">
                      <RadioGroupItem value="hybrid" id="hybrid" disabled />
                      <Label htmlFor="hybrid" className="text-sm text-muted-foreground">Hybrid</Label>
                      <Badge variant="outline" className="text-xs ml-2">Coming Soon</Badge>
                    </div>
                  </RadioGroup>
                </div>

                {/* Safety Warnings */}
                {showBeginnerWarning && (
                  <Alert className="border-orange-200 bg-orange-50 py-2">
                    <AlertTriangle className="h-3 w-3 text-orange-600" />
                    <AlertDescription className="text-orange-800 text-xs">
                      <strong>Advanced only:</strong> Percentage-based progression requires 1RM testing experience.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Linear Progression Settings */}
                {overrideType === "linear" && (
                  <div className="space-y-3 p-3 bg-muted/20 rounded-lg">
                    <h4 className="text-sm font-medium">Linear Settings</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="weekly-increase" className="text-xs">Weekly %</Label>
                        <Input
                          id="weekly-increase"
                          type="number"
                          step="0.5"
                          value={weeklyIncrease}
                          onChange={(e) => setWeeklyIncrease(e.target.value)}
                          placeholder="2.5"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="min-increment" className="text-xs">Min Increment</Label>
                        <Select value={minIncrement} onValueChange={setMinIncrement}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2.5">2.5</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Percentage Progression Settings */}
                {overrideType === "percentage" && (
                  <div className="space-y-2 p-3 bg-muted/20 rounded-lg">
                    <h4 className="text-sm font-medium">1RM Settings</h4>
                    <Alert className="py-2">
                      <Info className="h-3 w-3" />
                      <AlertDescription className="text-xs">
                        Standard percentage progression with Week {template.weeks || 6} deload. Enter 1RM values during first workout.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Hybrid Progression Settings */}
                {overrideType === "hybrid" && (
                  <div className="space-y-3 p-3 bg-muted/20 rounded-lg">
                    <h4 className="text-sm font-medium">Hybrid Settings</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Compounds</Label>
                        <Select value={compoundProgression} onValueChange={(value: any) => setCompoundProgression(value)}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="linear">Linear</SelectItem>
                            <SelectItem value="percentage">Percentage</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Accessories</Label>
                        <Select value={accessoryProgression} onValueChange={(value: any) => setAccessoryProgression(value)}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="linear">Linear</SelectItem>
                            <SelectItem value="percentage">Percentage</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Alert className="py-2">
                      <Info className="h-3 w-3" />
                      <AlertDescription className="text-xs">
                        Compounds use {compoundProgression}, accessories use {accessoryProgression} progression.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button onClick={handleSaveOverride} className="w-full sm:w-auto h-8 text-sm">
                    Apply
                  </Button>
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}