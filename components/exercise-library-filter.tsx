"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface ExerciseLibraryFilterProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (filters: { muscleGroups: string[]; authors: string[]; usePreferred: boolean }) => void
  currentFilters: { muscleGroups: string[]; authors: string[]; usePreferred: boolean }
}

const MUSCLE_GROUPS = [
  { name: "Chest", color: "bg-pink-500" },
  { name: "Back", color: "bg-cyan-500" },
  { name: "Triceps", color: "bg-pink-500" },
  { name: "Biceps", color: "bg-cyan-500" },
  { name: "Shoulders", color: "bg-pink-500" },
  { name: "Quads", color: "bg-cyan-500" },
  { name: "Glutes", color: "bg-teal-500" },
  { name: "Hamstrings", color: "bg-cyan-500" },
  { name: "Calves", color: "bg-violet-500" },
  { name: "Traps", color: "bg-violet-500" },
  { name: "Forearms", color: "bg-violet-500" },
  { name: "Abs", color: "bg-violet-500" },
]

const AUTHORS = [
  { name: "RP Strength" },
  { name: "Custom" },
]

export function ExerciseLibraryFilter({ open, onOpenChange, onApply, currentFilters }: ExerciseLibraryFilterProps) {
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>(currentFilters.muscleGroups)
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>(currentFilters.authors)
  const [usePreferred, setUsePreferred] = useState(currentFilters.usePreferred)

  useEffect(() => {
    setSelectedMuscleGroups(currentFilters.muscleGroups)
    setSelectedAuthors(currentFilters.authors)
    setUsePreferred(currentFilters.usePreferred)
  }, [currentFilters])

  const toggleMuscleGroup = (group: string) => {
    setSelectedMuscleGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    )
  }

  const toggleAuthor = (author: string) => {
    setSelectedAuthors((prev) =>
      prev.includes(author) ? prev.filter((a) => a !== author) : [...prev, author]
    )
  }

  const handleApply = () => {
    onApply({
      muscleGroups: selectedMuscleGroups,
      authors: selectedAuthors,
      usePreferred,
    })
  }

  const handleCancel = () => {
    // Reset to current filters
    setSelectedMuscleGroups(currentFilters.muscleGroups)
    setSelectedAuthors(currentFilters.authors)
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

          {/* Author */}
          <div>
            <h3 className="font-semibold mb-3">Author</h3>
            <div className="grid grid-cols-2 gap-2">
              {AUTHORS.map((author) => (
                <button
                  key={author.name}
                  onClick={() => toggleAuthor(author.name)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${
                    selectedAuthors.includes(author.name)
                      ? "bg-primary/10 border-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <span className="text-sm flex-1 text-left">{author.name}</span>
                  {selectedAuthors.includes(author.name) && (
                    <div className="w-4 h-4 rounded-sm bg-primary flex items-center justify-center" />
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
