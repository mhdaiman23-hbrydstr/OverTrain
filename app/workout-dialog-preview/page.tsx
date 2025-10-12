"use client"

import { useState } from "react"
import { WorkoutCompletionDialog } from "@/components/workout-completion-dialog"
import { MinimalWorkoutDialog } from "@/components/workout-completion-dialogs/minimal-dialog"
import { DataRichWorkoutDialog } from "@/components/workout-completion-dialogs/data-rich-dialog"
import { BeginnerFriendlyWorkoutDialog } from "@/components/workout-completion-dialogs/beginner-friendly-dialog"
import { EnhancedWorkoutDialog } from "@/components/workout-completion-dialogs/enhanced-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import type { WorkoutSession } from "@/lib/workout-logger"

// Sample workout data for different scenarios
const sampleWorkouts: Record<string, WorkoutSession> = {
  perfectWorkout: {
    id: "perfect-1",
    userId: "test-user",
    programId: "program-1",
    workoutName: "Workout A - Upper Body",
    startTime: Date.now() - 3600000, // 1 hour ago
    endTime: Date.now(),
    week: 1,
    day: 1,
    completed: true,
    exercises: [
      {
        id: "ex-1",
        exerciseId: "bench-press",
        exerciseName: "Bench Press",
        targetSets: 4,
        targetReps: "8-12",
        targetRest: "90s",
        sets: [
          { id: "set-1", reps: 12, weight: 60, completed: true },
          { id: "set-2", reps: 10, weight: 65, completed: true },
          { id: "set-3", reps: 8, weight: 70, completed: true },
          { id: "set-4", reps: 6, weight: 75, completed: true },
        ],
        completed: true,
      },
      {
        id: "ex-2",
        exerciseId: "squat",
        exerciseName: "Squat",
        targetSets: 3,
        targetReps: "8-12",
        targetRest: "120s",
        sets: [
          { id: "set-5", reps: 12, weight: 80, completed: true },
          { id: "set-6", reps: 10, weight: 85, completed: true },
          { id: "set-7", reps: 8, weight: 90, completed: true },
        ],
        completed: true,
      },
      {
        id: "ex-3",
        exerciseId: "deadlift",
        exerciseName: "Deadlift",
        targetSets: 3,
        targetReps: "5-8",
        targetRest: "180s",
        sets: [
          { id: "set-8", reps: 8, weight: 100, completed: true },
          { id: "set-9", reps: 6, weight: 110, completed: true },
          { id: "set-10", reps: 4, weight: 120, completed: true },
        ],
        completed: true,
      },
    ],
  },
  partialWorkout: {
    id: "partial-1",
    userId: "test-user",
    programId: "program-1",
    workoutName: "Workout B - Lower Body",
    startTime: Date.now() - 3600000,
    endTime: Date.now(),
    week: 1,
    day: 2,
    completed: true,
    exercises: [
      {
        id: "ex-4",
        exerciseId: "leg-press",
        exerciseName: "Leg Press",
        targetSets: 4,
        targetReps: "10-15",
        targetRest: "90s",
        sets: [
          { id: "set-11", reps: 15, weight: 120, completed: true },
          { id: "set-12", reps: 12, weight: 130, completed: true },
          { id: "set-13", reps: 10, weight: 140, completed: true },
          { id: "set-14", reps: 0, weight: 0, completed: true, skipped: true },
        ],
        completed: true,
      },
      {
        id: "ex-5",
        exerciseId: "leg-curl",
        exerciseName: "Leg Curl",
        targetSets: 3,
        targetReps: "10-12",
        targetRest: "60s",
        sets: [
          { id: "set-15", reps: 12, weight: 50, completed: true },
          { id: "set-16", reps: 10, weight: 55, completed: true },
          { id: "set-17", reps: 0, weight: 0, completed: true, skipped: true },
        ],
        completed: true,
      },
    ],
  },
  highVolumeWorkout: {
    id: "volume-1",
    userId: "test-user",
    programId: "program-2",
    workoutName: "Full Body Blast",
    startTime: Date.now() - 5400000, // 1.5 hours ago
    endTime: Date.now(),
    week: 2,
    day: 3,
    completed: true,
    exercises: [
      {
        id: "ex-6",
        exerciseId: "bench-press",
        exerciseName: "Bench Press",
        targetSets: 3,
        targetReps: "8-12",
        targetRest: "90s",
        sets: [
          { id: "set-18", reps: 12, weight: 60, completed: true },
          { id: "set-19", reps: 10, weight: 65, completed: true },
          { id: "set-20", reps: 8, weight: 70, completed: true },
        ],
        completed: true,
      },
      {
        id: "ex-7",
        exerciseId: "squat",
        exerciseName: "Squat",
        targetSets: 3,
        targetReps: "8-12",
        targetRest: "120s",
        sets: [
          { id: "set-21", reps: 12, weight: 80, completed: true },
          { id: "set-22", reps: 10, weight: 85, completed: true },
          { id: "set-23", reps: 8, weight: 90, completed: true },
        ],
        completed: true,
      },
      {
        id: "ex-8",
        exerciseId: "deadlift",
        exerciseName: "Deadlift",
        targetSets: 2,
        targetReps: "5-8",
        targetRest: "180s",
        sets: [
          { id: "set-24", reps: 8, weight: 100, completed: true },
          { id: "set-25", reps: 6, weight: 110, completed: true },
        ],
        completed: true,
      },
      {
        id: "ex-9",
        exerciseId: "pull-ups",
        exerciseName: "Pull-ups",
        targetSets: 3,
        targetReps: "6-10",
        targetRest: "90s",
        sets: [
          { id: "set-26", reps: 8, weight: 0, completed: true },
          { id: "set-27", reps: 6, weight: 0, completed: true },
          { id: "set-28", reps: 4, weight: 0, completed: true },
        ],
        completed: true,
      },
      {
        id: "ex-10",
        exerciseId: "shoulder-press",
        exerciseName: "Shoulder Press",
        targetSets: 2,
        targetReps: "10-12",
        targetRest: "60s",
        sets: [
          { id: "set-29", reps: 12, weight: 30, completed: true },
          { id: "set-30", reps: 10, weight: 32.5, completed: true },
        ],
        completed: true,
      },
      {
        id: "ex-11",
        exerciseId: "bicep-curls",
        exerciseName: "Bicep Curls",
        targetSets: 2,
        targetReps: "10-12",
        targetRest: "60s",
        sets: [
          { id: "set-31", reps: 12, weight: 15, completed: true },
          { id: "set-32", reps: 10, weight: 17.5, completed: true },
        ],
        completed: true,
      },
    ],
  },
  beginnerWorkout: {
    id: "beginner-1",
    userId: "test-user",
    programId: "program-3",
    workoutName: "Introduction Workout",
    startTime: Date.now() - 1800000, // 30 minutes ago
    endTime: Date.now(),
    week: 1,
    day: 1,
    completed: true,
    exercises: [
      {
        id: "ex-12",
        exerciseId: "bodyweight-squats",
        exerciseName: "Bodyweight Squats",
        targetSets: 2,
        targetReps: "8-12",
        targetRest: "60s",
        sets: [
          { id: "set-33", reps: 10, weight: 0, completed: true },
          { id: "set-34", reps: 8, weight: 0, completed: true },
        ],
        completed: true,
      },
      {
        id: "ex-13",
        exerciseId: "push-ups",
        exerciseName: "Push-ups",
        targetSets: 2,
        targetReps: "5-10",
        targetRest: "60s",
        sets: [
          { id: "set-35", reps: 5, weight: 0, completed: true },
          { id: "set-36", reps: 3, weight: 0, completed: true },
        ],
        completed: true,
      },
    ],
  },
}

const designVariations = [
  {
    id: "current",
    name: "Current Design",
    description: "Existing dialog layout",
    workout: sampleWorkouts.perfectWorkout,
  },
  {
    id: "enhanced",
    name: "Enhanced Design",
    description: "More detailed stats and better visual hierarchy",
    workout: sampleWorkouts.highVolumeWorkout,
  },
  {
    id: "minimal",
    name: "Minimal Design",
    description: "Clean and focused on key metrics",
    workout: sampleWorkouts.partialWorkout,
  },
  {
    id: "data-rich",
    name: "Data-Rich Design",
    description: "Comprehensive analytics and insights",
    workout: sampleWorkouts.perfectWorkout,
  },
  {
    id: "beginner-friendly",
    name: "Beginner Friendly",
    description: "Simplified for new users",
    workout: sampleWorkouts.beginnerWorkout,
  },
]

export default function WorkoutDialogPreview() {
  const [selectedVariation, setSelectedVariation] = useState(designVariations[0])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [customWorkout, setCustomWorkout] = useState<WorkoutSession>(sampleWorkouts.perfectWorkout)
  const [completionRate, setCompletionRate] = useState(100)
  const [totalVolume, setTotalVolume] = useState(6000)
  const [exerciseCount, setExerciseCount] = useState(3)
  const [skippedSets, setSkippedSets] = useState(0)

  const handleViewMuscleGroupStats = () => {
    console.log("View muscle group stats")
    setIsDialogOpen(false)
  }

  const handleStartNextWorkout = () => {
    console.log("Start next workout")
    setIsDialogOpen(false)
  }

  const getProgramName = (programId: string) => {
    const programNames: Record<string, string> = {
      "program-1": "Strength Foundation",
      "program-2": "Hypertrophy Program", 
      "program-3": "Beginner Program"
    }
    return programNames[programId] || "Unknown Program"
  }

  const generateModifiedWorkout = (): WorkoutSession => {
    const baseExercise = {
      targetSets: 3,
      targetReps: "8-12",
      targetRest: "90s",
      completed: true,
    }

    const exerciseNames = [
      "Bench Press", "Squat", "Deadlift", "Pull-ups", "Shoulder Press",
      "Bicep Curls", "Tricep Extensions", "Leg Press", "Calf Raises", "Plank"
    ]

    const exercises = Array.from({ length: exerciseCount }, (_, index) => {
      const setName = exerciseNames[index % exerciseNames.length]
      const setsPerExercise = Math.max(1, Math.floor((totalVolume / exerciseCount) / (60 * 8)))
      const hasSkippedSets = skippedSets > 0 && index < Math.ceil(skippedSets / 2)
      
      const sets = Array.from({ length: setsPerExercise }, (_, setIndex) => {
        const isSkipped = hasSkippedSets && setIndex === 0
        const completedValue = Math.random() > (1 - completionRate / 100)
        
        return {
          id: `custom-set-${index}-${setIndex}`,
          reps: isSkipped ? 0 : Math.floor(Math.random() * 8) + 6,
          weight: isSkipped ? 0 : Math.floor(Math.random() * 40) + 20,
          completed: isSkipped ? false : completedValue,
          skipped: isSkipped,
        }
      })

      return {
        id: `custom-ex-${index}`,
        exerciseId: `custom-ex-id-${index}`,
        exerciseName: setName,
        targetSets: setsPerExercise,
        targetReps: "8-12",
        targetRest: "90s",
        sets,
        completed: !hasSkippedSets,
      }
    })

    return {
      id: "custom-workout",
      userId: "test-user",
      programId: "program-custom",
      workoutName: "Custom Test Workout",
      startTime: Date.now() - 3600000,
      endTime: Date.now(),
      week: 1,
      day: 1,
      completed: completionRate > 0,
      exercises,
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Workout Dialog Design Preview</h1>
          <p className="text-muted-foreground">
            Scroll horizontally to explore different design variations
          </p>
        </div>

        {/* Design Variations Carousel */}
        <ScrollArea className="w-full">
          <div className="flex space-x-4 pb-4">
            {designVariations.map((variation) => (
              <Card
                key={variation.id}
                className={`min-w-[300px] cursor-pointer transition-all ${
                  selectedVariation.id === variation.id
                    ? "ring-2 ring-primary"
                    : "hover:shadow-md"
                }`}
                onClick={() => setSelectedVariation(variation)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{variation.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {variation.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="outline">
                      {variation.workout.exercises.length} exercises
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {variation.workout.workoutName}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {/* Preview Controls */}
        <div className="flex justify-center space-x-4">
          <Button
            onClick={() => setIsDialogOpen(true)}
            size="lg"
            className="px-8"
          >
            Preview {selectedVariation.name}
          </Button>
        </div>

        {/* Current Selection Info */}
        <Card>
          <CardHeader>
            <CardTitle>Selected: {selectedVariation.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Workout:</span>
                <p>{selectedVariation.workout.workoutName}</p>
              </div>
              <div>
                <span className="font-medium">Exercises:</span>
                <p>{selectedVariation.workout.exercises.length}</p>
              </div>
              <div>
                <span className="font-medium">Total Sets:</span>
                <p>
                  {selectedVariation.workout.exercises.reduce(
                    (total, ex) => total + ex.sets.length,
                    0
                  )}
                </p>
              </div>
              <div>
                <span className="font-medium">Program:</span>
                <p>{getProgramName(selectedVariation.workout.programId || "")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Interactive Controls</CardTitle>
            <p className="text-sm text-muted-foreground">
              Modify workout parameters in real-time to test different scenarios
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Completion Rate: {completionRate}%</Label>
                  <Slider
                    value={[completionRate]}
                    onValueChange={(value) => setCompletionRate(value[0])}
                    max={100}
                    min={0}
                    step={5}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Volume: {totalVolume.toLocaleString()} kg</Label>
                  <Slider
                    value={[totalVolume]}
                    onValueChange={(value) => setTotalVolume(value[0])}
                    max={15000}
                    min={500}
                    step={500}
                    className="mt-2"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Exercise Count: {exerciseCount}</Label>
                  <Slider
                    value={[exerciseCount]}
                    onValueChange={(value) => setExerciseCount(value[0])}
                    max={10}
                    min={1}
                    step={1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Skipped Sets: {skippedSets}</Label>
                  <Slider
                    value={[skippedSets]}
                    onValueChange={(value) => setSkippedSets(value[0])}
                    max={10}
                    min={0}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
            <Separator />
            <div className="flex justify-center space-x-4">
              <Button
                onClick={() => {
                  const modifiedWorkout = generateModifiedWorkout()
                  setCustomWorkout(modifiedWorkout)
                  setSelectedVariation({
                    id: "custom",
                    name: "Custom Workout",
                    description: "Your modified workout scenario",
                    workout: modifiedWorkout,
                  })
                }}
                variant="outline"
              >
                Apply Modifications
              </Button>
              <Button
                onClick={() => {
                  setCompletionRate(100)
                  setTotalVolume(6000)
                  setExerciseCount(3)
                  setSkippedSets(0)
                }}
                variant="ghost"
              >
                Reset Controls
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Design Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Design Variations Explained</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">Current Design</h4>
              <p className="text-sm text-muted-foreground">
                The existing dialog with basic stats and achievement badges.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Enhanced Design</h4>
              <p className="text-sm text-muted-foreground">
                Improved visual hierarchy with better spacing, more detailed stats,
                and enhanced achievement system.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Minimal Design</h4>
              <p className="text-sm text-muted-foreground">
                Clean, focused interface highlighting only the most important metrics.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Data-Rich Design</h4>
              <p className="text-sm text-muted-foreground">
                Comprehensive analytics with progress indicators, historical comparisons,
                and detailed insights.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Beginner Friendly</h4>
              <p className="text-sm text-muted-foreground">
                Simplified layout with encouraging messages and basic metrics for new users.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog Preview - Render different dialogs based on selection */}
      {selectedVariation.id === "current" && (
        <WorkoutCompletionDialog
          workout={selectedVariation.workout}
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onViewMuscleGroupStats={handleViewMuscleGroupStats}
          onStartNextWorkout={handleStartNextWorkout}
        />
      )}
      {selectedVariation.id === "enhanced" && (
        <EnhancedWorkoutDialog
          workout={selectedVariation.workout}
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onViewMuscleGroupStats={handleViewMuscleGroupStats}
          onStartNextWorkout={handleStartNextWorkout}
        />
      )}
      {selectedVariation.id === "minimal" && (
        <MinimalWorkoutDialog
          workout={selectedVariation.workout}
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onViewMuscleGroupStats={handleViewMuscleGroupStats}
          onStartNextWorkout={handleStartNextWorkout}
        />
      )}
      {selectedVariation.id === "data-rich" && (
        <DataRichWorkoutDialog
          workout={selectedVariation.workout}
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onViewMuscleGroupStats={handleViewMuscleGroupStats}
          onStartNextWorkout={handleStartNextWorkout}
        />
      )}
      {selectedVariation.id === "beginner-friendly" && (
        <BeginnerFriendlyWorkoutDialog
          workout={selectedVariation.workout}
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onViewMuscleGroupStats={handleViewMuscleGroupStats}
          onStartNextWorkout={handleStartNextWorkout}
        />
      )}
      {(selectedVariation.id === "custom" || !["current", "enhanced", "minimal", "data-rich", "beginner-friendly"].includes(selectedVariation.id)) && (
        <WorkoutCompletionDialog
          workout={selectedVariation.workout}
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onViewMuscleGroupStats={handleViewMuscleGroupStats}
          onStartNextWorkout={handleStartNextWorkout}
        />
      )}
    </div>
  )
}
