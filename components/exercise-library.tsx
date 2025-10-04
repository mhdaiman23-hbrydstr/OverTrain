"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, SlidersHorizontal } from "lucide-react"
import { ExerciseLibraryFilter } from "@/components/exercise-library-filter"
import { EXERCISES, type Exercise } from "@/lib/exercise-data"

interface ExerciseLibraryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectExercise: (exercise: Exercise) => void
  currentExerciseName?: string
}

export function ExerciseLibrary({ open, onOpenChange, onSelectExercise, currentExerciseName }: ExerciseLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState<{
    muscleGroups: string[]
    authors: string[]
    usePreferred: boolean
  }>({
    muscleGroups: [],
    authors: [],
    usePreferred: false,
  })
  const [repeat, setRepeat] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)

  const handleApplyFilters = (filters: typeof selectedFilters) => {
    setSelectedFilters(filters)
    setShowFilters(false)
  }

  const filteredExercises = EXERCISES.filter((exercise) => {
    // Search filter
    if (searchQuery && !exercise.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }

    // Muscle group filter
    if (selectedFilters.muscleGroups.length > 0 && !selectedFilters.muscleGroups.includes(exercise.muscleGroup)) {
      return false
    }

    return true
  })

  const handleReplace = () => {
    if (selectedExercise) {
      onSelectExercise(selectedExercise)
      onOpenChange(false)
      setSearchQuery("")
      setSelectedExercise(null)
      setRepeat(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    setSearchQuery("")
    setSelectedExercise(null)
    setRepeat(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Exercises</DialogTitle>
          </DialogHeader>

          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => setShowFilters(true)}>
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {/* Exercise List */}
          <div className="flex-1 overflow-y-auto border rounded-md">
            {filteredExercises.map((exercise) => (
              <button
                key={exercise.id}
                onClick={() => setSelectedExercise(exercise)}
                className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${
                  selectedExercise?.id === exercise.id ? "bg-primary/10" : ""
                }`}
              >
                <div className="flex-1">
                  <p className="font-medium">{exercise.name}</p>
                  <p className="text-sm text-muted-foreground">{exercise.category}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Repeat Checkbox */}
          <div className="flex items-center space-x-2 py-2">
            <Checkbox id="repeat" checked={repeat} onCheckedChange={(checked) => setRepeat(checked as boolean)} />
            <label htmlFor="repeat" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
              Repeat <span className="text-muted-foreground">(i)</span>
            </label>
          </div>

          {/* Footer Buttons */}
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              CANCEL
            </Button>
            <Button onClick={handleReplace} disabled={!selectedExercise}>
              REPLACE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExerciseLibraryFilter
        open={showFilters}
        onOpenChange={setShowFilters}
        onApply={handleApplyFilters}
        currentFilters={selectedFilters}
      />
    </>
  )
}
