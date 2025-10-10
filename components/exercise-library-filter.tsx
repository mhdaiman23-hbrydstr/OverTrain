"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface ExerciseLibraryFilterProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (filters: { muscleGroups: string[]; equipmentTypes: string[]; usePreferred: boolean }) => void
  currentFilters: { muscleGroups: string[]; equipmentTypes: string[]; usePreferred: boolean }
}

const MUSCLE_GROUPS = [
  { name: "Abs", color: "bg-violet-500" },
  { name: "Back", color: "bg-cyan-500" },
  { name: "Biceps", color: "bg-cyan-500" },
  { name: "Calves", color: "bg-violet-500" },
  { name: "Chest", color: "bg-pink-500" },
  { name: "Forearms", color: "bg-violet-500" },
  { name: "Glutes", color: "bg-teal-500" },
  { name: "Hamstrings", color: "bg-cyan-500" },
  { name: "Olympic Lifts", color: "bg-orange-500" },
  { name: "Quads", color: "bg-cyan-500" },
  { name: "Shoulders", color: "bg-pink-500" },
  { name: "Traps", color: "bg-violet-500" },
  { name: "Triceps", color: "bg-pink-500" },
]

const EQUIPMENT_TYPES = [
  { name: "Barbell", color: "bg-gray-600" },
  { name: "Bodyweight Loadable", color: "bg-emerald-500" },
  { name: "Bodyweight Only", color: "bg-green-500" },
  { name: "Cable", color: "bg-orange-500" },
  { name: "Dumbbell", color: "bg-blue-500" },
  { name: "Machine", color: "bg-purple-500" },
  { name: "Machine Assistance", color: "bg-indigo-500" },
  { name: "Smith Machine", color: "bg-slate-500" },
]

export function ExerciseLibraryFilter({ open, onOpenChange, onApply, currentFilters }: ExerciseLibraryFilterProps) {
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>(currentFilters.muscleGroups)
  const [selectedEquipmentTypes, setSelectedEquipmentTypes] = useState<string[]>(currentFilters.equipmentTypes)
  const [usePreferred, setUsePreferred] = useState(currentFilters.usePreferred)

  useEffect(() => {
    setSelectedMuscleGroups(currentFilters.muscleGroups)
    setSelectedEquipmentTypes(currentFilters.equipmentTypes)
    setUsePreferred(currentFilters.usePreferred)
  }, [currentFilters])

  const toggleMuscleGroup = (group: string) => {
    setSelectedMuscleGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    )
  }

  const toggleEquipmentType = (equipmentType: string) => {
    setSelectedEquipmentTypes((prev) =>
      prev.includes(equipmentType) ? prev.filter((e) => e !== equipmentType) : [...prev, equipmentType]
    )
  }

  const handleApply = () => {
    onApply({
      muscleGroups: selectedMuscleGroups,
      equipmentTypes: selectedEquipmentTypes,
      usePreferred,
    })
  }

  const handleCancel = () => {
    // Reset to current filters
    setSelectedMuscleGroups(currentFilters.muscleGroups)
    setSelectedEquipmentTypes(currentFilters.equipmentTypes)
    setUsePreferred(currentFilters.usePreferred)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exercise filters</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Muscle Groups */}
          <div>
            <h3 className="font-semibold mb-3">Muscle groups</h3>
            <div className="grid grid-cols-2 gap-2">
              {MUSCLE_GROUPS.map((group) => (
                <button
                  key={group.name}
                  onClick={() => toggleMuscleGroup(group.name)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${
                    selectedMuscleGroups.includes(group.name)
                      ? "bg-primary/10 border-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${group.color}`} />
                  <span className="text-sm">{group.name}</span>
                  {selectedMuscleGroups.includes(group.name) && (
                    <div className="ml-auto w-4 h-4 rounded-sm bg-primary flex items-center justify-center" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Equipment Types */}
          <div>
            <h3 className="font-semibold mb-3">Equipment</h3>
            <div className="grid grid-cols-2 gap-2">
              {EQUIPMENT_TYPES.map((equipment) => (
                <button
                  key={equipment.name}
                  onClick={() => toggleEquipmentType(equipment.name)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${
                    selectedEquipmentTypes.includes(equipment.name)
                      ? "bg-primary/10 border-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${equipment.color}`} />
                  <span className="text-sm">{equipment.name}</span>
                  {selectedEquipmentTypes.includes(equipment.name) && (
                    <div className="ml-auto w-4 h-4 rounded-sm bg-primary flex items-center justify-center" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Use Preferred Exercise Types */}
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="use-preferred" className="text-sm font-medium">
              Use preferred exercises types
            </Label>
            <Switch id="use-preferred" checked={usePreferred} onCheckedChange={setUsePreferred} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel}>
            CANCEL
          </Button>
          <Button onClick={handleApply} className="bg-red-600 hover:bg-red-700">
            APPLY
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
