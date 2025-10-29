"use client"

import { useState, useEffect, useMemo } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getMuscleGroupAccentClass } from "@/lib/exercise-muscle-groups"

export interface ExerciseLibraryFilterValues {
  muscleGroups: string[]
  equipmentTypes: string[]
}

interface ExerciseLibraryFilterProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (filters: ExerciseLibraryFilterValues) => void
  currentFilters: ExerciseLibraryFilterValues
  muscleGroups: string[]
  equipmentTypes: string[]
}

const EQUIPMENT_TYPE_COLORS: Record<string, string> = {
  Barbell: "bg-gray-600",
  "Bodyweight Loadable": "bg-emerald-500",
  "Bodyweight Only": "bg-green-500",
  Cable: "bg-orange-500",
  Dumbbell: "bg-blue-500",
  Machine: "bg-purple-500",
  "Machine Assistance": "bg-indigo-500",
  "Smith Machine": "bg-slate-500",
}

const getEquipmentAccentClass = (equipmentType: string) =>
  EQUIPMENT_TYPE_COLORS[equipmentType] ?? "bg-gray-400"

export function ExerciseLibraryFilter({
  open,
  onOpenChange,
  onApply,
  currentFilters,
  muscleGroups,
  equipmentTypes,
}: ExerciseLibraryFilterProps) {
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>(currentFilters.muscleGroups)
  const [selectedEquipmentTypes, setSelectedEquipmentTypes] = useState<string[]>(currentFilters.equipmentTypes)

  useEffect(() => {
    const validMuscleGroups = currentFilters.muscleGroups.filter((group) =>
      muscleGroups.includes(group)
    )
    const validEquipmentTypes = currentFilters.equipmentTypes.filter((type) =>
      equipmentTypes.includes(type)
    )
    setSelectedMuscleGroups(validMuscleGroups)
    setSelectedEquipmentTypes(validEquipmentTypes)
  }, [currentFilters, muscleGroups, equipmentTypes])

  useEffect(() => {
    setSelectedMuscleGroups((prev) => prev.filter((group) => muscleGroups.includes(group)))
  }, [muscleGroups])

  useEffect(() => {
    setSelectedEquipmentTypes((prev) => prev.filter((type) => equipmentTypes.includes(type)))
  }, [equipmentTypes])

  const muscleGroupOptions = useMemo(
    () =>
      muscleGroups.map((group) => ({
        name: group,
        accentClass: getMuscleGroupAccentClass(group),
      })),
    [muscleGroups]
  )

  const equipmentTypeOptions = useMemo(
    () =>
      equipmentTypes.map((type) => ({
        name: type,
        color: getEquipmentAccentClass(type),
      })),
    [equipmentTypes]
  )

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
      muscleGroups: selectedMuscleGroups.filter((group) => muscleGroups.includes(group)),
      equipmentTypes: selectedEquipmentTypes.filter((type) => equipmentTypes.includes(type)),
    })
  }

  const handleCancel = () => {
    // Reset to current filters
    const validMuscleGroups = currentFilters.muscleGroups.filter((group) =>
      muscleGroups.includes(group)
    )
    const validEquipmentTypes = currentFilters.equipmentTypes.filter((type) =>
      equipmentTypes.includes(type)
    )
    setSelectedMuscleGroups(validMuscleGroups)
    setSelectedEquipmentTypes(validEquipmentTypes)
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
              {muscleGroupOptions.map((group) => {
                const isSelected = selectedMuscleGroups.includes(group.name)
                return (
                  <Button
                    key={group.name}
                    onClick={() => toggleMuscleGroup(group.name)}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={`flex items-center gap-2 justify-start ${isSelected ? "hover:bg-primary" : ""}`}
                  >
                    <div className={`w-3 h-3 rounded-full ${group.accentClass}`} />
                    <span className="text-sm">{group.name}</span>
                    {isSelected && <Check className="ml-auto w-4 h-4" />}
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Equipment Types */}
          <div>
            <h3 className="font-semibold mb-3">Equipment</h3>
            <div className="grid grid-cols-2 gap-2">
              {equipmentTypeOptions.map((equipment) => {
                const isSelected = selectedEquipmentTypes.includes(equipment.name)
                return (
                  <Button
                    key={equipment.name}
                    onClick={() => toggleEquipmentType(equipment.name)}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={`flex items-center gap-2 justify-start ${isSelected ? "hover:bg-primary" : ""}`}
                  >
                    <div className={`w-3 h-3 rounded-full ${equipment.color}`} />
                    <span className="text-sm">{equipment.name}</span>
                    {isSelected && <Check className="ml-auto w-4 h-4" />}
                  </Button>
                )
              })}
            </div>
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
