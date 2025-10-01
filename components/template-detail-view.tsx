"use client"
import { Button } from "@/components/ui/button"
import { X, Play } from "lucide-react"
import { GYM_TEMPLATES } from "@/lib/gym-templates"

interface TemplateDetailViewProps {
  templateId: string
  onClose: () => void
  onStartProgram: (templateId: string) => void
}

const MUSCLE_GROUP_COLORS = {
  CHEST: "bg-pink-500",
  BACK: "bg-blue-500",
  SHOULDERS: "bg-pink-500",
  TRICEPS: "bg-pink-500",
  BICEPS: "bg-blue-500",
  LEGS: "bg-green-500",
  GLUTES: "bg-purple-500",
  CORE: "bg-orange-500",
  CARDIO: "bg-red-500",
}

const getMuscleGroupFromExercise = (exerciseName: string): string => {
  const name = exerciseName.toLowerCase()
  if (name.includes("bench") || name.includes("incline") || name.includes("chest") || name.includes("dips"))
    return "CHEST"
  if (name.includes("row") || name.includes("pull") || name.includes("deadlift")) return "BACK"
  if (name.includes("squat") || name.includes("leg") || name.includes("calf")) return "LEGS"
  if (name.includes("curl") || name.includes("bicep")) return "BICEPS"
  if (name.includes("tricep") || name.includes("extension")) return "TRICEPS"
  if (name.includes("overhead") || name.includes("press") || name.includes("lateral") || name.includes("shoulder"))
    return "SHOULDERS"
  return "CHEST" // default
}

export function TemplateDetailView({ templateId, onClose, onStartProgram }: TemplateDetailViewProps) {
  console.log("[v0] TemplateDetailView rendered with templateId:", templateId)

  const template = GYM_TEMPLATES.find((t) => t.id === templateId)

  if (!template) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Template not found</h2>
          <Button onClick={onClose}>Go Back</Button>
        </div>
      </div>
    )
  }

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const workoutDays = Object.entries(template.schedule).map(([dayKey, workout], index) => ({
    day: dayNames[index] || `Day ${index + 1}`,
    workout: {
      ...workout,
      exercises: workout.exercises.map((exercise) => ({
        ...exercise,
        name: exercise.exerciseName,
        muscleGroup: getMuscleGroupFromExercise(exercise.exerciseName),
        sets: exercise.progressionTemplate.week1?.sets || 3,
        reps: exercise.progressionTemplate.week1?.repRange || "8-10",
        rest: `${Math.floor(exercise.restTime / 60)}:${(exercise.restTime % 60).toString().padStart(2, "0")}`,
        variation: exercise.exerciseName.includes("(") ? exercise.exerciseName.match(/$$([^)]+)$$/)?.[1] : undefined,
      })),
    },
  }))

  console.log("[v0] Workout days:", workoutDays.length)

  return (
    <div className="h-screen bg-background">
      <div className="max-w-md mx-auto w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pt-6 border-b bg-background z-10">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-balance">{template.name}</h1>
            <p className="text-sm text-muted-foreground mt-1 uppercase">
              {template.weeks} WEEKS - {template.days} DAYS/WEEK
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Workout days list */}
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-border">
            {workoutDays.map((day, dayIndex) => (
              <div key={dayIndex} className="px-4 py-4">
                <h3 className="font-semibold text-base mb-3">
                  {day.day} - {day.workout.name}
                </h3>

                <div className="space-y-2">
                  {day.workout.exercises.map((exercise, exerciseIndex) => (
                    <div key={exerciseIndex} className="flex items-start gap-3 py-2">
                      {/* Exercise number and muscle indicator */}
                      <div className="flex flex-col items-center gap-1 min-w-[32px] pt-0.5">
                        <div className="text-xs font-medium text-muted-foreground">{exerciseIndex + 1}</div>
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${
                            MUSCLE_GROUP_COLORS[exercise.muscleGroup as keyof typeof MUSCLE_GROUP_COLORS] ||
                            "bg-gray-400"
                          }`}
                        />
                      </div>

                      {/* Exercise details */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm leading-tight mb-0.5">{exercise.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {exercise.sets} sets × {exercise.reps} reps • {exercise.rest} rest
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Start button */}
        <div className="p-4 bg-background border-t mb-16">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => {
              console.log("[v0] Start Program clicked for:", templateId)
              onStartProgram(templateId)
            }}
          >
            <Play className="h-4 w-4 mr-2" />
            Start Program
          </Button>
        </div>
      </div>
    </div>
  )
}
