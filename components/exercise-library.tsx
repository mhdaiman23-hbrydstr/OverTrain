"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, SlidersHorizontal } from "lucide-react"
import { ExerciseLibraryFilter } from "@/components/exercise-library-filter"

interface Exercise {
  id: string
  name: string
  category: string
  muscleGroup: string
  lastPerformed?: string
}

interface ExerciseLibraryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectExercise: (exercise: Exercise) => void
  currentExerciseName?: string
}

// Placeholder exercise data - will be replaced with comprehensive library
const PLACEHOLDER_EXERCISES: Exercise[] = [
  { id: "1", name: "Lying Cable Curl", category: "BICEPS - CABLE", muscleGroup: "Biceps" },
  { id: "2", name: "Lying Down Curl", category: "BICEPS - CABLE", muscleGroup: "Biceps" },
  { id: "3", name: "Lying Dumbbell Curl", category: "BICEPS - DUMBBELL", muscleGroup: "Biceps" },
  { id: "4", name: "Lying Leg Curl", category: "HAMSTRINGS - MACHINE", muscleGroup: "Hamstrings", lastPerformed: "9/30/2025" },
  { id: "5", name: "Machine Chest Press", category: "CHEST - MACHINE", muscleGroup: "Chest", lastPerformed: "9/29/2025" },
  { id: "6", name: "Machine Chest Press (Incline)", category: "CHEST - MACHINE", muscleGroup: "Chest", lastPerformed: "4/19/2024" },
  { id: "7", name: "Machine Chest Supported Row", category: "BACK - MACHINE", muscleGroup: "Back", lastPerformed: "12/16/2024" },
]

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

  const filteredExercises = PLACEHOLDER_EXERCISES.filter((exercise) => {
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
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{exercise.name}</p>
                    <p className="text-sm text-muted-foreground">{exercise.category}</p>
                  </div>
                  {exercise.lastPerformed && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        <path d="M12 6v6l4 2" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <span>Last performed {exercise.lastPerformed}</span>
                    </div>
                  )}
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
