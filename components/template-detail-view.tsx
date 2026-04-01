"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { BottomActionBar } from "@/components/ui/bottom-action-bar"
import { X, Play } from "lucide-react"
import { ProgramStateManager } from "@/lib/program-state"
import type { GymTemplate } from "@/lib/gym-templates"
import { AdvancedProgramSettings } from "@/components/advanced-program-settings"
import type { ProgressionOverride } from "@/lib/program-state"
import { getMuscleGroupAccentClass } from "@/lib/exercise-muscle-groups"

interface TemplateDetailViewProps {
  templateId: string
  onClose: () => void
  onStartProgram: (templateId: string, progressionOverride?: ProgressionOverride) => void
  isStarting?: boolean
  isLoading?: boolean
  startingStep?: string
  userProfile?: {
    experience: "beginner" | "intermediate" | "advanced"
    gender: "male" | "female"
  }
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

export function TemplateDetailView({ templateId, onClose, onStartProgram, isStarting, isLoading: parentIsLoading, startingStep, userProfile }: TemplateDetailViewProps) {
  console.log("[v0] TemplateDetailView rendered with templateId:", templateId)
  const [template, setTemplate] = useState<GymTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [progressionOverride, setProgressionOverride] = useState<ProgressionOverride | undefined>()

  // Default user profile if not provided
  const defaultUserProfile = {
    experience: "beginner" as const,
    gender: "male" as const
  }
  const currentUserProfile = userProfile || defaultUserProfile

  useEffect(() => {
    const loadTemplate = async () => {
      setIsLoading(true)
      try {
        console.log("[TemplateDetailView] Loading template:", templateId)
        const loaded = await ProgramStateManager.loadTemplate(templateId)
        console.log("[TemplateDetailView] Template loaded:", loaded?.name)
        setTemplate(loaded)
      } catch (error) {
        console.error('[TemplateDetailView] Failed to load template:', error)
        setTemplate(null)
      } finally {
        setIsLoading(false)
      }
    }
    loadTemplate()
  }, [templateId])

  // Show skeleton while parent is loading template or while component is loading exercises
  if (parentIsLoading || isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-[55]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading template...</p>
        </div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-[55]">
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
    <div className="fixed inset-0 bg-background flex flex-col z-[55] overflow-hidden">
      <div className="max-w-4xl mx-auto w-full flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 lg:p-8 pt-6 sm:pt-8 border-b bg-background z-10 sticky top-0" style={{ paddingTop: `max(1.5rem, var(--safe-area-inset-top))` }}>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-balance leading-tight">{template.name}</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 uppercase tracking-wide">
              {template.weeks} WEEKS - {template.days} DAYS/WEEK
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="ml-4 shrink-0">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Workout days list */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain pb-24" style={{ touchAction: 'pan-y' }}>
          <div className="divide-y divide-border">
            {workoutDays.map((day, dayIndex) => (
              <div key={dayIndex} className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                <h3 className="font-semibold text-base sm:text-lg lg:text-xl mb-4 sm:mb-6 leading-tight">
                  {day.day} - {day.workout.name}
                </h3>

                <div className="space-y-3 sm:space-y-4">
                  {day.workout.exercises.map((exercise, exerciseIndex) => {
                    const accentClass = getMuscleGroupAccentClass(exercise.muscleGroup)
                    return (
                      <div key={exerciseIndex} className="flex items-start gap-3 sm:gap-4 py-2 sm:py-3">
                      {/* Exercise number and muscle indicator */}
                      <div className="flex flex-col items-center gap-1 min-w-[32px] sm:min-w-[40px] pt-0.5 sm:pt-1">
                        <div className="text-xs sm:text-sm font-medium text-muted-foreground">{exerciseIndex + 1}</div>
                        <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${accentClass}`} />
                      </div>

                      {/* Exercise details */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm sm:text-base lg:text-lg leading-tight mb-1 sm:mb-2">{exercise.name}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {exercise.sets} sets × {exercise.reps} reps • {exercise.rest} rest
                        </div>
                      </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Advanced settings section at bottom of scrollable area */}
          <div className="px-4 sm:px-6 lg:px-8 py-6 border-t border-border/50 pb-6">
            <AdvancedProgramSettings
              template={template}
              userProfile={currentUserProfile}
              onOverrideChange={setProgressionOverride}
            />
          </div>
        </div>
      </div>

      {/* Bottom action bar with start button */}
      <BottomActionBar
        leftContent={
          progressionOverride ? (
            <span className="text-xs font-medium uppercase tracking-wide text-primary sm:text-sm">
              Progression override applied
            </span>
          ) : (
            <span className="text-xs text-muted-foreground sm:text-sm">
              No custom progression overrides set
            </span>
          )
        }
        rightContent={
          <Button
            className="w-full gradient-primary text-primary-foreground h-auto py-2 px-4 sm:py-3 sm:px-6 text-center"
            disabled={!!isStarting}
            onClick={() => {
              console.log("[v0] Start Program clicked for:", templateId, "with override:", !!progressionOverride)
              onStartProgram(templateId, progressionOverride)
            }}
          >
            {isStarting ? (
              <span className="flex items-center justify-center">
                <span className="mr-2 inline-block h-4 w-4 sm:h-5 sm:w-5 animate-spin rounded-full border-2 border-white/50 border-t-transparent"></span>
                {startingStep || "Starting..."}
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Start Program
              </span>
            )}
          </Button>
        }
        showFixed={true}
      />
    </div>
  )
}


