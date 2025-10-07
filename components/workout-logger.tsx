"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { type WorkoutSession, WorkoutLogger } from "@/lib/workout-logger"
import { WorkoutCompletionDialog } from "@/components/workout-completion-dialog"
import { MuscleGroupStats } from "@/components/muscle-group-stats"
import { WorkoutCalendar } from "@/components/workout-calendar"
import { ExerciseLibrary } from "@/components/exercise-library"
import { ProgramStateManager } from "@/lib/program-state"
import { getTemplateById } from "@/lib/gym-templates"
import { getExerciseMuscleGroup } from "@/lib/exercise-muscle-groups"
import { ProgressionRouter, type ProgressionInput } from "@/lib/progression-router"
import { getTierRules, isWeightWithinBounds, calculateVolumeCompensation } from "@/lib/progression-tiers"
import { useAuth } from "@/contexts/auth-context"
import { ConnectionMonitor, type ConnectionStatus } from "@/lib/connection-monitor"
import { useToast } from "@/hooks/use-toast"
import {
  Save,
  MoreVertical,
  FileText,
  BarChart3,
  Plus,
  AlertTriangle,
  SkipForward,
  Trash2,
  Check,
  Calendar,
  Minus,
  Lock,
  ArrowUp,
  ArrowDown,
  Replace,
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react"

interface Exercise {
  exerciseId: string
  exerciseName: string
  targetSets: number
  targetReps: string
  targetRest: string
  muscleGroup?: string
  equipmentType?: string
}

interface WorkoutLoggerProps {
  initialWorkout?: {
    name: string
    exercises: Exercise[]
  }
  onComplete?: () => void
  onCancel?: () => void
  onViewAnalytics?: () => void
}

export function WorkoutLoggerComponent({ initialWorkout, onComplete, onCancel, onViewAnalytics }: WorkoutLoggerProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [workout, setWorkout] = useState<WorkoutSession | null>(null)
  const [showNotesDialog, setShowNotesDialog] = useState(false)
  const [showSummaryDialog, setShowSummaryDialog] = useState(false)
  const [showAddExerciseDialog, setShowAddExerciseDialog] = useState(false)
  const [showEndWorkoutDialog, setShowEndWorkoutDialog] = useState(false)
  const [showEndProgramDialog, setShowEndProgramDialog] = useState(false)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [completedWorkout, setCompletedWorkout] = useState<WorkoutSession | null>(null)
  const [workoutNotes, setWorkoutNotes] = useState("")
  const [endWorkoutConfirmation, setEndWorkoutConfirmation] = useState("")
  const [endProgramConfirmation, setEndProgramConfirmation] = useState("")
  const [showCalendar, setShowCalendar] = useState(false)
  const [showMuscleGroupStats, setShowMuscleGroupStats] = useState(false)
  const [isWorkoutBlocked, setIsWorkoutBlocked] = useState(false)
  const [isFullyBlocked, setIsFullyBlocked] = useState(false)
  const [blockedMessage, setBlockedMessage] = useState("")
  const [programName, setProgramName] = useState<string>("")
  const [showExerciseNotesDialog, setShowExerciseNotesDialog] = useState(false)
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)
  const [exerciseNotes, setExerciseNotes] = useState("")
  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false)
  const [replaceExerciseId, setReplaceExerciseId] = useState<string | null>(null)
  const [showProgressionBanner, setShowProgressionBanner] = useState(false)
  const [progressionBannerMessage, setProgressionBannerMessage] = useState("")

  // Debounce timer for set updates
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const boundsCheckTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Connection status
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('online')

  // Loading state for finish workout
  const [isCompletingWorkout, setIsCompletingWorkout] = useState(false)

  // Progression tracking for volume compensation
  const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>({})
  const [volumeCompensation, setVolumeCompensation] = useState<Record<string, {
    adjustedReps: number
    strategy: string
    message?: string
  }>>({})
  const [pendingOutOfBoundsWarnings, setPendingOutOfBoundsWarnings] = useState<Record<string, boolean>>({})
  const [outOfBoundsExercises, setOutOfBoundsExercises] = useState<Record<string, { min: number; max: number; setNumber: number }>>({})

  useEffect(() => {
    console.log("[v0] ===== STORAGE DEBUG =====")

    // Log in-progress workouts
    const inProgressRaw = localStorage.getItem("liftlog_in_progress_workouts")
    if (inProgressRaw) {
      const inProgressWorkouts = JSON.parse(inProgressRaw)
      console.log("[v0] IN-PROGRESS WORKOUTS:", inProgressWorkouts.length)
      inProgressWorkouts.forEach((w: WorkoutSession, idx: number) => {
        console.log(`[v0] In-Progress ${idx + 1}:`, {
          id: w.id,
          name: w.workoutName,
          week: w.week,
          day: w.day,
          completed: w.completed,
          exercises: w.exercises.map((ex) => ({
            name: ex.exerciseName,
            sets: ex.sets.map((s) => ({ weight: s.weight, reps: s.reps, completed: s.completed })),
          })),
        })
      })
    } else {
      console.log("[v0] IN-PROGRESS WORKOUTS: None")
    }

    // Log workout history
    const historyRaw = localStorage.getItem("liftlog_workouts")
    if (historyRaw) {
      const historyWorkouts = JSON.parse(historyRaw)
      console.log("[v0] WORKOUT HISTORY:", historyWorkouts.length)
      historyWorkouts.forEach((w: WorkoutSession, idx: number) => {
        console.log(`[v0] History ${idx + 1}:`, {
          id: w.id,
          name: w.workoutName,
          week: w.week,
          day: w.day,
          completed: w.completed,
          exercises: w.exercises.map((ex) => ({
            name: ex.exerciseName,
            sets: ex.sets.map((s) => ({ weight: s.weight, reps: s.reps, completed: s.completed })),
          })),
        })
      })
    } else {
      console.log("[v0] WORKOUT HISTORY: None")
    }

    console.log("[v0] ===== END STORAGE DEBUG =====")

    ProgramStateManager.recalculateProgress()

    if (inProgressRaw && historyRaw) {
      const inProgressWorkouts = JSON.parse(inProgressRaw)
      const historyWorkouts = JSON.parse(historyRaw)

      // Find in-progress workouts that have a completed version in history
      const cleanedInProgress = inProgressWorkouts.filter((inProgress: WorkoutSession) => {
        const hasCompletedVersion = historyWorkouts.some(
          (history: WorkoutSession) =>
            history.week === inProgress.week && history.day === inProgress.day && history.completed,
        )

        // If there's a completed version, check if in-progress is empty
        if (hasCompletedVersion) {
          const isEmpty = inProgress.exercises.every((ex: any) =>
            ex.sets.every((s: any) => s.weight === 0 && s.reps === 0 && !s.completed),
          )

          if (isEmpty) {
            console.log("[v0] Removing empty in-progress workout for week", inProgress.week, "day", inProgress.day)
            return false // Remove this workout
          }
        }

        return true // Keep this workout
      })

      if (cleanedInProgress.length !== inProgressWorkouts.length) {
        localStorage.setItem("liftlog_in_progress_workouts", JSON.stringify(cleanedInProgress))
        console.log(
          "[v0] Cleaned up",
          inProgressWorkouts.length - cleanedInProgress.length,
          "empty in-progress workouts",
        )
      }
    }
  }, [])

  useEffect(() => {
    // First, check raw localStorage data
    console.log("[v0] 💾 RAW LOCALSTORAGE CHECK:", {
      inProgressKey: 'liftlog_in_progress_workouts',
      rawValue: localStorage.getItem('liftlog_in_progress_workouts'),
      parsed: (() => {
        try {
          const raw = localStorage.getItem('liftlog_in_progress_workouts')
          return raw ? JSON.parse(raw) : null
        } catch (e) {
          return { error: (e as Error).message }
        }
      })()
    })

    const activeProgram = ProgramStateManager.getActiveProgram()
    if (activeProgram) {
      setProgramName(activeProgram.template.name)
    }

    const existingWorkout = WorkoutLogger.getCurrentWorkout()
    if (existingWorkout) {
      console.log("[v0] 📥 COMPONENT LOAD - Existing workout from localStorage:", {
        id: existingWorkout.id,
        week: existingWorkout.week,
        day: existingWorkout.day,
        exerciseCount: existingWorkout.exercises.length,
        exercises: existingWorkout.exercises.map((ex) => ({
          name: ex.exerciseName,
          setsCount: ex.sets?.length || 0,
          hasSets: !!ex.sets,
          firstSetState: ex.sets?.[0] ? {
            reps: ex.sets[0].reps,
            weight: ex.sets[0].weight,
            completed: ex.sets[0].completed,
            skipped: ex.sets[0].skipped
          } : null
        })),
        fullWorkout: JSON.parse(JSON.stringify(existingWorkout))
      })
      setWorkout(existingWorkout)
      setWorkoutNotes(existingWorkout.notes || "")

      // CRITICAL: Only refresh progression for IN-PROGRESS workouts, not completed ones
      // Completed workouts should remain read-only and not be saved back to in-progress storage
      if (
        !existingWorkout.completed && // Only refresh in-progress workouts
        activeProgram &&
        existingWorkout.week &&
        existingWorkout.week >= activeProgram.currentWeek &&
        existingWorkout.week > 1 &&
        existingWorkout.exercises.some(
          (ex) =>
            !ex.suggestedWeight ||
            ex.suggestedWeight === 0 ||
            !ex.perSetSuggestions || // Need to refresh if per-set suggestions are missing
            ex.sets.some(set => !set.completed && !set.skipped && (!set.reps || set.reps === 0)) || // Need to refresh if reps are missing
            (ex.progressionNote &&
              ex.progressionNote.includes("Complete any workout from Week"))
        )
      ) {
        console.log(
          "[v0] 🔄 MOUNT - In-progress workout needs progression refresh, recalculating..."
        )

        const scheduleKeys = Object.keys(activeProgram.template.schedule)
        const inferredDayKey =
          typeof existingWorkout.day === "number" && existingWorkout.day > 0
            ? `day${existingWorkout.day}`
            : undefined
        const dayKey =
          inferredDayKey && activeProgram.template.schedule[inferredDayKey]
            ? inferredDayKey
            : scheduleKeys[existingWorkout.day ? existingWorkout.day - 1 : 0]

        const workoutDay = dayKey
          ? activeProgram.template.schedule[dayKey]
          : undefined

        if (workoutDay?.exercises?.length) {
          const refreshedExercises = existingWorkout.exercises.map((exercise) => {
            const templateExercise = workoutDay.exercises.find(
              (te) =>
                te.exerciseName === exercise.exerciseName ||
                te.id === exercise.exerciseId
            )

            if (!templateExercise) {
              console.log(
                "[v0] MOUNT - Template exercise not found for:",
                exercise.exerciseName
              )
              return exercise
            }

            const previousPerformance = ProgressionRouter.getPreviousPerformance(
              templateExercise.id,
              templateExercise.exerciseName,
              existingWorkout.week!,
              existingWorkout.day
            )

            if (!previousPerformance) {
              console.log(
                "[v0] MOUNT - No previous performance for:",
                exercise.exerciseName
              )
              return exercise
            }

            const progressionInput: ProgressionInput = {
              exercise: templateExercise,
              activeProgram,
              currentWeek: existingWorkout.week!,
              userProfile: {
                experience:
                  (user?.experience as "beginner" | "intermediate" | "advanced") ||
                  "beginner",
                gender: (user?.gender as "male" | "female") || "male",
              },
              previousPerformance,
            }

            const result = ProgressionRouter.calculateProgression(progressionInput)

            console.log("[v0] MOUNT - Refreshed progression for", exercise.exerciseName, {
              suggestedWeight: result.targetWeight,
              progressionNote: result.progressionNote,
              hasPerSetSuggestions: !!result.perSetSuggestions,
              perSetCount: result.perSetSuggestions?.length || 0,
            })

            const suggestedWeight = result.targetWeight ?? 0

            const updatedSets = exercise.sets?.map((set, setIndex) => {
              // Pre-fill from per-set suggestions if available
              if (result.perSetSuggestions && result.perSetSuggestions[setIndex]) {
                const suggestion = result.perSetSuggestions[setIndex]
                return {
                  ...set,
                  weight:
                    !set.completed && !set.skipped && suggestion.weight > 0
                      ? suggestion.weight
                      : set.weight,
                  reps:
                    !set.completed && !set.skipped && suggestion.reps > 0
                      ? suggestion.reps
                      : set.reps,
                }
              }
              // Fallback to exercise-level suggestion
              return {
                ...set,
                weight:
                  !set.completed && !set.skipped && suggestedWeight > 0
                    ? suggestedWeight
                    : set.weight,
              }
            })

            return {
              ...exercise,
              suggestedWeight,
              progressionNote: result.progressionNote,
              baseVolume:
                typeof result.targetWeight === "number" &&
                typeof result.targetReps === "number"
                  ? result.targetWeight * result.targetReps
                  : exercise.baseVolume,
              userOverridden: false,
              sets: updatedSets ?? exercise.sets,
              perSetSuggestions: result.perSetSuggestions,
            }
          })

          const refreshedWorkout = {
            ...existingWorkout,
            exercises: refreshedExercises,
          }

          WorkoutLogger.saveCurrentWorkout(refreshedWorkout, user?.id)
            .then(() => {
              console.log(
                "[v0] MOUNT - Saved refreshed workout with updated progression"
              )
            })
            .catch((error) => {
              console.error("[v0] MOUNT - Failed to save refreshed workout:", error)
            })

          setWorkout(refreshedWorkout)
        }
      }

      const week = activeProgram?.currentWeek
      const day = activeProgram?.currentDay

      // Progression banner disabled - using pre-filled weights instead
      setShowProgressionBanner(false)
      setProgressionBannerMessage("")

      console.log("[v0] Checking if workout should be blocked:", {
        existingWorkoutWeek: existingWorkout.week,
        activeProgramWeek: week,
        activeProgramDay: day,
      })

      if (week && day && existingWorkout.week && existingWorkout.week > week) {
        // Workout from a future week - check if current week is complete
        const scheduleKeys = Object.keys(activeProgram.template.schedule)
        const daysPerWeek = scheduleKeys.length
        const isCurrentWeekCompleted = WorkoutLogger.isWeekCompleted(week, daysPerWeek, user?.id)
        const weeksAhead = existingWorkout.week - week

        if (!isCurrentWeekCompleted) {
          setIsWorkoutBlocked(true)
          setIsFullyBlocked(weeksAhead >= 2)
          setBlockedMessage("No data from previous week")
          console.log("[v0] Workout blocked - current week not completed, weeksAhead:", weeksAhead)
        } else {
          setIsWorkoutBlocked(false)
          setIsFullyBlocked(false)
          setBlockedMessage("")
          console.log("[v0] Workout not blocked - current week completed")
        }
      } else {
        setIsWorkoutBlocked(false)
        setIsFullyBlocked(false)
        setBlockedMessage("")
        console.log("[v0] Workout not blocked - current or past week")
      }
    } else if (initialWorkout) {
      const activeProgram = ProgramStateManager.getActiveProgram()
      const week = activeProgram?.currentWeek
      const day = activeProgram?.currentDay

      const newWorkout = WorkoutLogger.startWorkout(initialWorkout.name, initialWorkout.exercises, week, day, user?.id)
      console.log("[v0] 🆕 COMPONENT NEW WORKOUT - Created from initialWorkout:", {
        id: newWorkout.id,
        week: newWorkout.week,
        day: newWorkout.day,
        exerciseCount: newWorkout.exercises.length,
        firstExerciseFirstSet: newWorkout.exercises[0]?.sets[0] ? {
          reps: newWorkout.exercises[0].sets[0].reps,
          weight: newWorkout.exercises[0].sets[0].weight,
          completed: newWorkout.exercises[0].sets[0].completed,
          skipped: newWorkout.exercises[0].sets[0].skipped
        } : null,
        fullWorkout: JSON.parse(JSON.stringify(newWorkout))
      })
      setWorkout(newWorkout)
      setIsWorkoutBlocked(false)
      setIsFullyBlocked(false)
      setBlockedMessage("")
    }
  }, [initialWorkout])

  // Listen for program state changes
  useEffect(() => {
    const handleProgramChange = () => {
      console.log("[v0] Program state changed, reloading workout...")
      const activeProgram = ProgramStateManager.getActiveProgram()
      
      if (activeProgram) {
        setProgramName(activeProgram.template.name)
        
        // Clear current workout and load the new one
        setWorkout(null)
        
        // Get the current workout based on updated program state
        const currentWorkout = ProgramStateManager.getCurrentWorkout()
        if (currentWorkout) {
          const week = activeProgram?.currentWeek
          const day = activeProgram?.currentDay
          
          const newWorkout = WorkoutLogger.startWorkout(currentWorkout.name, currentWorkout.exercises, week, day, user?.id)
          console.log("[v0] Loaded new workout after program change:", {
            week,
            day,
            workoutName: newWorkout.workoutName,
          })
          setWorkout(newWorkout)
          setIsWorkoutBlocked(false)
          setIsFullyBlocked(false)
          setBlockedMessage("")
        }
      }
    }

    window.addEventListener("programChanged", handleProgramChange)
    return () => window.removeEventListener("programChanged", handleProgramChange)
  }, [])

  
  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Initialize ConnectionMonitor
  useEffect(() => {
    ConnectionMonitor.initialize()

    const unsubscribe = ConnectionMonitor.subscribe((status) => {
      setConnectionStatus(status)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleSetUpdate = (exerciseId: string, setId: string, field: "reps" | "weight", value: number) => {
    if (!workout) return

    console.log("[v0] handleSetUpdate called:", { exerciseId, setId, field, value, isWorkoutBlocked })

    const exercise = workout.exercises.find((ex) => ex.id === exerciseId)
    if (!exercise) return

    // NEW: Check if this exercise uses per-set suggestions
    if (field === "weight" && exercise.perSetSuggestions && exercise.perSetSuggestions.length > 0) {
      // Find which set index we're editing
      const setIndex = exercise.sets.findIndex(s => s.id === setId)
      const suggestion = exercise.perSetSuggestions[setIndex]
      
      if (suggestion && suggestion.bounds) {
        const { min, max } = suggestion.bounds
        const withinBounds = value >= min && value <= max
        
        if (!withinBounds) {
          // OUT OF BOUNDS: Set flag for warning (will show on blur)
          console.log("[v0] Per-set weight out of bounds:", { setIndex, value, min, max })
          setPendingOutOfBoundsWarnings(prev => ({ ...prev, [`${exerciseId}_${setId}`]: true }))
        } else if (value !== suggestion.weight) {
          // WITHIN BOUNDS but different from suggestion: Show dynamic rep adjustment
          const adjustedReps = Math.round(suggestion.reps * (suggestion.weight / value))
          console.log("[v0] Dynamic rep adjustment:", { 
            baseWeight: suggestion.weight, 
            newWeight: value, 
            baseReps: suggestion.reps, 
            adjustedReps 
          })
          
          // Show green banner with adjusted reps
          setVolumeCompensation(prev => ({
            ...prev,
            [`${exerciseId}_${setId}`]: {
              adjustedReps,
              strategy: "per_set_adjusted",
              message: `Adjusted to ${adjustedReps} reps based on weight change`
            }
          }))
          // Clear any pending warning since we're within bounds
          setPendingOutOfBoundsWarnings(prev => {
            const updated = { ...prev }
            delete updated[`${exerciseId}_${setId}`]
            return updated
          })
        } else {
          // Weight matches suggestion exactly - clear any compensation
          setVolumeCompensation(prev => {
            const updated = { ...prev }
            delete updated[`${exerciseId}_${setId}`]
            return updated
          })
          // Clear any pending warning since we're back to suggested weight
          setPendingOutOfBoundsWarnings(prev => {
            const updated = { ...prev }
            delete updated[`${exerciseId}_${setId}`]
            return updated
          })
        }
      }
    }
    // LEGACY: Fall back to exercise-level bounds for old workouts
    else if (field === "weight" && exercise.suggestedWeight && exercise.bounds) {
      const tierRules = getTierRules(exercise.exerciseName, exercise.tier === "compound" ? "compound" : "isolation")
      
      // Check if weight is within bounds
      const withinBounds = isWeightWithinBounds(
        value,
        exercise.suggestedWeight,
        tierRules.adjustmentBounds
      )
      
      if (!withinBounds) {
        // OUT OF BOUNDS: Mark as overridden, set flag for warning (will show on blur) and track for banner display
        console.log("[v0] Weight out of bounds, marking as override")
        setUserOverrides(prev => ({ ...prev, [exerciseId]: true }))
        setVolumeCompensation(prev => {
          const updated = { ...prev }
          delete updated[exerciseId]
          return updated
        })
        setPendingOutOfBoundsWarnings(prev => ({ ...prev, [`${exerciseId}_${setId}`]: true }))
      } else {
        // WITHIN BOUNDS: Calculate volume compensation
        const baseReps = parseInt(exercise.targetReps.split("-")[0]) || 10
        const targetVolume = exercise.baseVolume || (exercise.suggestedWeight * baseReps)
        
        const compensation = calculateVolumeCompensation(
          targetVolume,
          value,
          tierRules.maxRepAdjustment
        )
        
        setVolumeCompensation(prev => ({
          ...prev,
          [exerciseId]: {
            adjustedReps: compensation.adjustedReps,
            strategy: compensation.strategy,
            message: compensation.message
          }
        }))
        
        // Keep progression note visible
        setUserOverrides(prev => ({ ...prev, [exerciseId]: false }))
        
        // Clear any pending warning since we're within bounds
        setPendingOutOfBoundsWarnings(prev => {
          const updated = { ...prev }
          delete updated[`${exerciseId}_${setId}`]
          return updated
        })
      }
    }

    // Calculate rep adjustment BEFORE async update (so we have the value immediately, not after state updates)
    let calculatedAdjustedReps: number | undefined = undefined
    let shouldClearReps = false
    if (field === "weight" && exercise.perSetSuggestions && exercise.perSetSuggestions.length > 0) {
      const setIndex = exercise.sets.findIndex(s => s.id === setId)
      const suggestion = exercise.perSetSuggestions[setIndex]
      if (suggestion && suggestion.bounds) {
        const withinBounds = value >= suggestion.bounds.min && value <= suggestion.bounds.max
        if (!withinBounds) {
          // OUT OF BOUNDS: Clear reps
          shouldClearReps = true
        } else if (value !== suggestion.weight) {
          // WITHIN BOUNDS but different from suggestion: Calculate adjusted reps
          calculatedAdjustedReps = Math.round(suggestion.reps * (suggestion.weight / value))
        } else {
          // WITHIN BOUNDS and matches suggestion: Use suggestion reps
          calculatedAdjustedReps = suggestion.reps
        }
      }
    }

    // Handle manual reps changes (detect override)
    if (field === "reps") {
      const compensation = volumeCompensation[exerciseId] || volumeCompensation[`${exerciseId}_${setId}`]
      if (compensation && value !== compensation.adjustedReps) {
        // User manually overrode the volume-compensated reps
        console.log("[v0] Manual reps override detected")
        setUserOverrides(prev => ({ ...prev, [exerciseId]: true }))
      }
    }

    console.log("[v0] Current workout before update:", {
      id: workout.id,
      exerciseCount: workout.exercises.length,
    })

    // Update with skipDbSync=true to only save to localStorage
    const updateSetAsync = async () => {
      const updates: any = { [field]: value }
      
      // Handle rep updates based on weight changes
      if (field === "weight") {
        if (shouldClearReps) {
          // OUT OF BOUNDS: Clear reps to 0
          updates.reps = 0
        } else if (calculatedAdjustedReps !== undefined) {
          // WITHIN BOUNDS: Apply calculated adjusted reps
          updates.reps = calculatedAdjustedReps
        }
      }
      
      const updatedWorkout = await WorkoutLogger.updateSet(workout, exerciseId, setId, updates, user?.id, true) // Skip DB sync initially

      console.log("[v0] updatedWorkout returned:", updatedWorkout ? "exists" : "null")

      if (updatedWorkout) {
        const exercise = updatedWorkout.exercises.find((ex) => ex.id === exerciseId)
        const set = exercise?.sets.find((s) => s.id === setId)
        console.log("[v0] Updated set value:", {
          exerciseId,
          setId,
          field,
          newValue: set?.[field],
          setObject: set,
        })

        setWorkout(updatedWorkout)
        console.log("[v0] setWorkout called with updated workout")

        // Debounce database sync for 500ms
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }

        debounceTimerRef.current = setTimeout(() => {
          console.log("[v0] Debounced sync triggered for weight/reps update")
          if (ConnectionMonitor.isOnline()) {
            WorkoutLogger.saveCurrentWorkout(updatedWorkout, user?.id)
          } else {
            // Queue sync for when connection is restored
            ConnectionMonitor.addToQueue(async () => {
              await WorkoutLogger.saveCurrentWorkout(updatedWorkout, user?.id)
            })
          }
        }, 500)
      } else {
        console.log("[v0] ERROR: updatedWorkout is null, not updating state")
      }
    }

    updateSetAsync()

    // Debounced bounds check for banner (500ms delay for typing)
    if (field === "weight") {
      if (boundsCheckTimerRef.current) {
        clearTimeout(boundsCheckTimerRef.current)
      }
      boundsCheckTimerRef.current = setTimeout(() => {
        checkExerciseBoundsStatus(exerciseId)
      }, 500)
    }
  }

  const handleWeightInputBlur = (exerciseId: string, setId: string) => {
    // Check bounds immediately on blur
    checkExerciseBoundsStatus(exerciseId)
    
    // Show toast if pending warning
    const key = `${exerciseId}_${setId}`
    if (pendingOutOfBoundsWarnings[key]) {
      const exercise = workout?.exercises.find((ex) => ex.id === exerciseId)
      if (exercise?.perSetSuggestions) {
        const setIndex = exercise.sets.findIndex(s => s.id === setId)
        const suggestion = exercise.perSetSuggestions[setIndex]
        if (suggestion?.bounds) {
          toast({
            title: 'Weight out of range',
            description: `Suggested range for this set: ${Math.round(suggestion.bounds.min)}-${Math.round(suggestion.bounds.max)} lbs.`,
            variant: 'destructive'
          })
        }
      } else if (exercise?.bounds) {
        // Legacy bounds
        toast({
          title: 'Weight out of range',
          description: `Suggested range: ${Math.round(exercise.bounds.min)}-${Math.round(exercise.bounds.max)} lbs. Fill reps manually.`,
          variant: 'destructive'
        })
      }
      // Clear the flag after showing toast
      setPendingOutOfBoundsWarnings(prev => {
        const updated = { ...prev }
        delete updated[key]
        return updated
      })
    }
  }

  // Check if current active set of an exercise is out of bounds and update banner
  const checkExerciseBoundsStatus = (exerciseId: string) => {
    if (!workout) return

    const exercise = workout.exercises.find((ex) => ex.id === exerciseId)
    if (!exercise) return

    // Find the first incomplete set (current active set)
    const activeSetIndex = exercise.sets.findIndex(s => !s.completed && !s.skipped)
    if (activeSetIndex === -1) {
      // All sets completed, clear banner
      setOutOfBoundsExercises(prev => {
        const updated = { ...prev }
        delete updated[exerciseId]
        return updated
      })
      return
    }

    const activeSet = exercise.sets[activeSetIndex]
    const setNumber = activeSetIndex + 1

    // Check bounds for per-set suggestions
    if (exercise.perSetSuggestions && exercise.perSetSuggestions[activeSetIndex]) {
      const suggestion = exercise.perSetSuggestions[activeSetIndex]
      if (suggestion.bounds && activeSet.weight > 0) {
        const { min, max } = suggestion.bounds
        const withinBounds = activeSet.weight >= min && activeSet.weight <= max

        if (!withinBounds) {
          setOutOfBoundsExercises(prev => ({
            ...prev,
            [exerciseId]: { min, max, setNumber }
          }))
        } else {
          setOutOfBoundsExercises(prev => {
            const updated = { ...prev }
            delete updated[exerciseId]
            return updated
          })
        }
      }
    }
    // Check legacy bounds
    else if (exercise.bounds && activeSet.weight > 0) {
      const { min, max } = exercise.bounds
      const withinBounds = activeSet.weight >= min && activeSet.weight <= max

      if (!withinBounds) {
        setOutOfBoundsExercises(prev => ({
          ...prev,
          [exerciseId]: { min, max, setNumber }
        }))
      } else {
        setOutOfBoundsExercises(prev => {
          const updated = { ...prev }
          delete updated[exerciseId]
          return updated
        })
      }
    }
  }

  const handleCompleteSet = async (exerciseId: string, setId: string) => {
    if (!workout) return

    const exercise = workout.exercises.find((ex) => ex.id === exerciseId)
    const set = exercise?.sets.find((s) => s.id === setId)
    if (!set) return

    const willMarkComplete = !set.completed

    if (willMarkComplete) {
      if (!set.weight || set.weight <= 0 || !set.reps || set.reps <= 0) {
        return
      }

      if (!ConnectionMonitor.isOnline()) {
        toast({
          title: 'No connection',
          description: 'Reconnect before logging sets.',
          variant: 'destructive',
        })
        ConnectionMonitor.updateStatus('offline')
        return
      }
    }

    try {
      const updatedWorkout = await WorkoutLogger.updateSet(workout, exerciseId, setId, {
        completed: !set.completed,
      }, user?.id)

      if (updatedWorkout) {
        setWorkout(updatedWorkout)
        
        // Check bounds for next set immediately after completing a set
        checkExerciseBoundsStatus(exerciseId)
      }
    } catch (error) {
      console.error('[WorkoutLogger] Failed to log set:', error)
      toast({
        title: 'Failed to log set',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  
  const canFinishWorkout = (): boolean => {
    if (!workout) return false

    return workout.exercises.every((exercise) => exercise.sets.every((set) => set.completed))
  }

  const handleCompleteWorkout = async () => {
    if (!workout) return

    setIsCompletingWorkout(true)

    try {
      const workoutWithNotes = { ...workout, notes: workoutNotes }
      setWorkout(workoutWithNotes)

      await WorkoutLogger.saveCurrentWorkout(workoutWithNotes, user?.id)
      const wasAlreadyCompleted = WorkoutLogger.hasCompletedWorkout(workout.week || 1, workout.day || 1, user?.id)

      const completedWorkout = await WorkoutLogger.completeWorkout(workoutWithNotes.id)

      if (completedWorkout) {
        // Validate that the completed workout has proper data
        const hasValidData = completedWorkout.exercises &&
                           completedWorkout.exercises.length > 0 &&
                           completedWorkout.exercises.every(ex => ex.sets && ex.sets.length > 0)

        if (!hasValidData) {
          console.error("[v0] Completed workout has invalid data, not proceeding with program advancement")
          setIsCompletingWorkout(false)
          return
        }

        if (!wasAlreadyCompleted) {
          await ProgramStateManager.completeWorkout()
        }

        // Sync to database
        if (user?.id) {
          try {
            await WorkoutLogger.syncToDatabase(user.id)

            // Notify calendar that data has changed
            window.dispatchEvent(new Event("programChanged"))

          } catch (error) {
            console.error("[v0] Failed to sync to database:", error)
            // Still show completion dialog even if sync fails
          }
        }

        setCompletedWorkout(completedWorkout)
        setShowCompletionDialog(true)
      }
    } catch (error) {
      console.error("[v0] Error completing workout:", error)
    } finally {
      setIsCompletingWorkout(false)
    }
  }

  const handleCompletionDialogClose = () => {
    setShowCompletionDialog(false)
    setCompletedWorkout(null)
    onComplete?.()
  }

  const handleViewMuscleGroupStats = () => {
    setShowCompletionDialog(false)
    setShowMuscleGroupStats(true)
  }

  const handleCancelWorkout = () => {
    if (workout) {
      WorkoutLogger.clearCurrentWorkout(undefined, undefined, user?.id)
    }
    onCancel?.()
  }

  const handleSaveNotes = () => {
    if (!workout) return

    const updatedWorkout = { ...workout, notes: workoutNotes }
    setWorkout(updatedWorkout)
    WorkoutLogger.saveCurrentWorkout(updatedWorkout, user?.id)
    setShowNotesDialog(false)
  }

  const handleEndWorkout = async () => {
    if (!workout || endWorkoutConfirmation !== "End Workout") return

    // Mark all uncompleted sets as skipped (blue tick)
    const updatedWorkout: WorkoutSession = {
      ...workout,
      exercises: workout.exercises.map((exercise) => ({
        ...exercise,
        completed: true,
        sets: exercise.sets.map((set) => {
          if (!set.completed) {
            return { ...set, completed: true, reps: 0, weight: 0, skipped: true }
          }
          return set
        }),
      })),
    }

    setWorkout(updatedWorkout)
    await WorkoutLogger.saveCurrentWorkout(updatedWorkout, user?.id)

    // Complete the workout
    const completedWorkout = await WorkoutLogger.completeWorkout(updatedWorkout.id)
    if (completedWorkout) {
      // Validate that the completed workout has proper data
      const hasValidData = completedWorkout.exercises &&
                         completedWorkout.exercises.length > 0 &&
                         completedWorkout.exercises.every(ex => ex.sets && ex.sets.length > 0)

      if (!hasValidData) {
        console.error("[v0] Completed workout has invalid data, not proceeding with program advancement")
        return
      }

      // Sync to database
      if (user?.id) {
        try {
          await WorkoutLogger.syncToDatabase(user.id)

          // Notify calendar that data has changed
          window.dispatchEvent(new Event("programChanged"))

        } catch (error) {
          console.error("[v0] Failed to sync to database, but workout is saved locally:", error)
        }
      }

      setCompletedWorkout(completedWorkout)
      setShowEndWorkoutDialog(false)
      setShowCompletionDialog(true)
    }
  }

  const handleEndProgram = async () => {
    if (endProgramConfirmation !== "End Program") return

    if (!workout) {
      setShowEndProgramDialog(false)
      return
    }

    const activeProgram = ProgramStateManager.getActiveProgram()
    if (!activeProgram) {
      setShowEndProgramDialog(false)
      return
    }

    try {
      const wasAlreadyCompleted = WorkoutLogger.hasCompletedWorkout(
        activeProgram.currentWeek,
        activeProgram.currentDay,
        user?.id
      )

      const updatedWorkout: WorkoutSession = {
        ...workout,
        skipped: true,
        exercises: workout.exercises.map((exercise) => ({
          ...exercise,
          completed: true,
          skipped: true,
          sets: exercise.sets.map((set) => {
            const updatedSet = { ...set }
            if (!updatedSet.completed) {
              updatedSet.completed = true
              updatedSet.reps = 0
              updatedSet.weight = 0
            }
            updatedSet.skipped = true
            return updatedSet
          }),
        })),
      }

      setWorkout(updatedWorkout)
      await WorkoutLogger.saveCurrentWorkout(updatedWorkout, user?.id)

      const completedWorkout = await WorkoutLogger.completeWorkout(updatedWorkout.id)
      if (!completedWorkout) {
        return
      }

      completedWorkout.skipped = true
      completedWorkout.exercises?.forEach((exercise) => {
        exercise.skipped = true
        exercise.sets?.forEach((set) => {
          set.skipped = true
        })
      })
      if (!completedWorkout.notes) {
        completedWorkout.notes = "Program ended early"
      }

      if (!wasAlreadyCompleted) {
        await ProgramStateManager.completeWorkout(user?.id)
      }

      let programForSkipping = ProgramStateManager.getActiveProgram()
      const templateSource = programForSkipping ?? activeProgram
      const template = templateSource.template
      const templateWeekCount = template.weeks || 6
      const scheduleKeys = Object.keys(template.schedule).sort((a, b) => {
        const numA = Number.parseInt(a.replace(/[^0-9]/g, ""), 10)
        const numB = Number.parseInt(b.replace(/[^0-9]/g, ""), 10)
        return numA - numB
      })
      const daysPerWeek = scheduleKeys.length

      const startWeek = programForSkipping ? programForSkipping.currentWeek : activeProgram.currentWeek

      for (let week = startWeek; week <= templateWeekCount; week++) {
        let dayStart: number
        if (programForSkipping) {
          dayStart = week === startWeek ? programForSkipping.currentDay : 1
        } else if (week === activeProgram.currentWeek) {
          dayStart = activeProgram.currentDay + 1
        } else {
          dayStart = 1
        }

        if (dayStart > daysPerWeek) {
          continue
        }

        for (let dayNumber = dayStart; dayNumber <= daysPerWeek; dayNumber++) {
          if (WorkoutLogger.hasCompletedWorkout(week, dayNumber, user?.id)) {
            continue
          }

          const dayKey = scheduleKeys[dayNumber - 1]
          const templateDay = template.schedule[dayKey]
          if (!templateDay) {
            continue
          }

          await WorkoutLogger.skipWorkout({
            templateDay,
            week,
            day: dayNumber,
            userId: user?.id ?? undefined,
            templateId: templateSource.templateId,
            workoutName: templateDay.name,
          })
        }
      }

      if (user?.id) {
        await WorkoutLogger.syncToDatabase(user.id)
      }

      await ProgramStateManager.finalizeActiveProgram(user?.id, { endedEarly: true })

      setProgramName("")
      setCompletedWorkout(completedWorkout)
      setShowCompletionDialog(true)
      setWorkout(null)
    } catch (error) {
      console.error("[v0] Failed to end program:", error)
    } finally {
      setEndProgramConfirmation("")
      setShowEndProgramDialog(false)
    }
  }

  const getWorkoutSummary = () => {
    if (!workout) return { completedSets: 0, skippedSets: 0, totalSets: 0, exercises: 0 }

    let completedSets = 0
    let skippedSets = 0
    let totalSets = 0

    workout.exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        totalSets++
        if (set.completed) {
          if (set.reps === 0 && set.weight === 0) {
            skippedSets++
          } else {
            completedSets++
          }
        }
      })
    })

    return {
      completedSets,
      skippedSets,
      totalSets,
      exercises: workout.exercises.length,
    }
  }

  
  const getWorkoutProgress = (): number => {
    if (!workout) return 0
    const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
    const completedSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0)
    return totalSets > 0 ? (completedSets / totalSets) * 100 : 0
  }

  
  const handleAddSet = (exerciseId: string, afterSetId: string) => {
    if (!workout) return

    const exercise = workout.exercises.find((ex) => ex.id === exerciseId)
    if (!exercise) return

    const setIndex = exercise.sets.findIndex((s) => s.id === afterSetId)
    const newSet = {
      id: Math.random().toString(36).substr(2, 9),
      reps: 0,
      weight: 0,
      completed: false,
    }

    exercise.sets.splice(setIndex + 1, 0, newSet)
    setWorkout({ ...workout })
    WorkoutLogger.saveCurrentWorkout(workout, user?.id)
  }

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    if (!workout) return

    const exercise = workout.exercises.find((ex) => ex.id === exerciseId)
    if (!exercise || exercise.sets.length <= 1) return

    exercise.sets = exercise.sets.filter((s) => s.id !== setId)
    setWorkout({ ...workout })
    WorkoutLogger.saveCurrentWorkout(workout, user?.id)
  }

  const handleSkipSet = async (exerciseId: string, setId: string) => {
    if (!workout) return

    const updatedWorkout = await WorkoutLogger.updateSet(workout, exerciseId, setId, {
      completed: true,
      reps: 0,
      weight: 0,
    }, user?.id)
    if (updatedWorkout) {
      setWorkout(updatedWorkout)
    }
  }

  const handleExerciseNotes = (exerciseId: string) => {
    if (!workout) return
    const exercise = workout.exercises.find((ex) => ex.id === exerciseId)
    if (!exercise) return

    setSelectedExerciseId(exerciseId)
    setExerciseNotes(exercise.notes || "")
    setShowExerciseNotesDialog(true)
  }

  const handleSaveExerciseNotes = () => {
    if (!workout || !selectedExerciseId) return

    const exercise = workout.exercises.find((ex) => ex.id === selectedExerciseId)
    if (!exercise) return

    exercise.notes = exerciseNotes
    setWorkout({ ...workout })
    WorkoutLogger.saveCurrentWorkout(workout, user?.id)
    setShowExerciseNotesDialog(false)
    setSelectedExerciseId(null)
    setExerciseNotes("")
  }

  const handleReplaceExercise = (exerciseId: string) => {
    setReplaceExerciseId(exerciseId)
    setShowExerciseLibrary(true)
  }

  const handleMoveExerciseUp = (exerciseId: string) => {
    if (!workout) return

    const exercises = [...workout.exercises]
    const index = exercises.findIndex((ex) => ex.id === exerciseId)

    if (index <= 0) return // Already at top or not found

    // Swap with previous exercise
    ;[exercises[index - 1], exercises[index]] = [exercises[index], exercises[index - 1]]

    setWorkout({ ...workout, exercises })
    WorkoutLogger.saveCurrentWorkout({ ...workout, exercises }, user?.id)
  }

  const handleMoveExerciseDown = (exerciseId: string) => {
    if (!workout) return

    const exercises = [...workout.exercises]
    const index = exercises.findIndex((ex) => ex.id === exerciseId)

    if (index < 0 || index >= exercises.length - 1) return // Already at bottom or not found

    // Swap with next exercise
    ;[exercises[index], exercises[index + 1]] = [exercises[index + 1], exercises[index]]

    setWorkout({ ...workout, exercises })
    WorkoutLogger.saveCurrentWorkout({ ...workout, exercises }, user?.id)
  }

  const handleSkipAllSets = (exerciseId: string) => {
    if (!workout) return

    const exercise = workout.exercises.find((ex) => ex.id === exerciseId)
    if (!exercise) return

    exercise.sets.forEach((set) => {
      set.completed = true
      set.reps = 0
      set.weight = 0
    })

    setWorkout({ ...workout })
    WorkoutLogger.saveCurrentWorkout(workout, user?.id)
  }

  const handleDeleteExercise = (exerciseId: string) => {
    if (!workout) return

    const exercises = workout.exercises.filter((ex) => ex.id !== exerciseId)
    setWorkout({ ...workout, exercises })
    WorkoutLogger.saveCurrentWorkout({ ...workout, exercises }, user?.id)
  }

  const handleSelectExerciseFromLibrary = (selectedExercise: any) => {
    if (!workout || !replaceExerciseId) return

    const exerciseIndex = workout.exercises.findIndex((ex) => ex.id === replaceExerciseId)
    if (exerciseIndex === -1) return

    const oldExercise = workout.exercises[exerciseIndex]

    // Replace with new exercise, keeping the same sets structure
    workout.exercises[exerciseIndex] = {
      ...oldExercise,
      exerciseId: selectedExercise.id,
      exerciseName: selectedExercise.name,
    }

    setWorkout({ ...workout })
    WorkoutLogger.saveCurrentWorkout(workout, user?.id)
    setReplaceExerciseId(null)
  }

  const handleStartNextWorkout = () => {
    setShowCompletionDialog(false)
    setCompletedWorkout(null)

    if (completedWorkout?.week && completedWorkout?.day) {
      WorkoutLogger.clearCurrentWorkout(completedWorkout.week, completedWorkout.day, user?.id)
    }
    
    // Instead of reloading, trigger program state change event
    // This will cause the component to re-render with the next workout
    window.dispatchEvent(new Event("programChanged"))
    
    // Force a re-render by updating the workout state
    setWorkout(null)
    
    // Call onComplete to notify parent component
    onComplete?.()
  }

  const handleWorkoutClick = (week: number, day: number) => {
    const activeProgram = ProgramStateManager.getActiveProgram()
    if (!activeProgram) return

    const { templateId } = activeProgram

    console.log("[v0] User clicked on week", week, "day", day)

    const template = getTemplateById(templateId)
    if (!template) return

    const dayKey = `day${day}`
    const workoutDay = template.schedule[dayKey]
    if (!workoutDay) return

    // Only save if it's an in-progress workout, not a completed one
    if (workout && !workout.completed) {
      WorkoutLogger.saveCurrentWorkout(workout, user?.id)
      console.log("[v0] Saved in-progress workout before switching")
    } else if (workout && workout.completed) {
      console.log("[v0] Skipping save - this is a completed workout (read-only)")
    }

    // Check completed history first, then in-progress workouts
    const completedWorkout = WorkoutLogger.getCompletedWorkout(week, day, user?.id)
    const inProgressWorkout = WorkoutLogger.getInProgressWorkout(week, day, user?.id)
    const existingWorkout = completedWorkout || inProgressWorkout

    let loadedWorkout: WorkoutSession

    if (existingWorkout) {
      console.log("[v0] Found existing workout for week", week, "day", day, ":", {
        id: existingWorkout.id,
        completed: existingWorkout.completed,
        source: completedWorkout ? 'COMPLETED_HISTORY' : 'IN_PROGRESS',
        exerciseCount: existingWorkout.exercises.length,
        exercises: existingWorkout.exercises.map((ex) => ({
          name: ex.exerciseName,
          setsCount: ex.sets.length,
          firstSetWeight: ex.sets[0]?.weight || 0,
          firstSetReps: ex.sets[0]?.reps || 0,
          hasProgressionData: !!(ex.progressionNote || ex.suggestedWeight)
        })),
      })
      
      // If this is a completed workout, make it read-only
      if (completedWorkout) {
        console.log("[v0] ⚠️ Loading COMPLETED workout - this should be READ-ONLY")
      }

      // Check if we need to refresh progression data
      // CRITICAL: Only refresh for IN-PROGRESS workouts, not completed ones
      const needsProgressionRefresh = !existingWorkout.completed && // Don't modify completed workouts
        week >= activeProgram.currentWeek && 
        week > 1 && // Not Week 1 (baseline)
        existingWorkout.exercises.some(ex => 
          !ex.suggestedWeight || 
          ex.suggestedWeight === 0 ||
          (ex.progressionNote && ex.progressionNote.includes("Complete any workout from Week"))
        )

      if (needsProgressionRefresh) {
        console.log("[v0] In-progress workout needs progression refresh - recalculating...")
        
        // Recalculate progression for each exercise
        const refreshedExercises = existingWorkout.exercises.map((exercise) => {
          // Find the template exercise to get progression data
          const templateExercise = workoutDay.exercises.find(te => 
            te.exerciseName === exercise.exerciseName || 
            te.id === exercise.exerciseId
          )
          
          if (!templateExercise) {
            console.log("[v0] Template exercise not found for:", exercise.exerciseName)
            return exercise // Keep original if template not found
          }

          // Use ProgressionRouter to recalculate
          const previousPerformance = ProgressionRouter.getPreviousPerformance(
            templateExercise.id,
            templateExercise.exerciseName,
            week,
            day
          )
          
          if (!previousPerformance) {
            console.log("[v0] No previous performance found for:", exercise.exerciseName)
            return exercise // Keep original if no previous data
          }
          
          const progressionInput: ProgressionInput = {
            exercise: templateExercise,
            activeProgram,
            currentWeek: week,
            userProfile: {
              experience: (user?.experience as "beginner" | "intermediate" | "advanced") || "beginner",
              gender: (user?.gender as "male" | "female") || "male"
            },
            previousPerformance
          }
          
          const result = ProgressionRouter.calculateProgression(progressionInput)
          
          console.log("[v0] Refreshed progression for", exercise.exerciseName, ":", {
            oldNote: exercise.progressionNote,
            newNote: result.progressionNote,
            oldWeight: exercise.suggestedWeight,
            newWeight: result.targetWeight
          })

          // Update exercise with new progression data
          return {
            ...exercise,
            suggestedWeight: result.targetWeight,
            progressionNote: result.progressionNote,
            bounds: result.additionalData?.bounds,
            strategy: result.strategy,
            tier: result.additionalData?.tier,
            baseVolume: result.targetWeight * result.targetReps,
            userOverridden: false
          }
        })

        // Update the existing workout with refreshed progression
        existingWorkout.exercises = refreshedExercises
        
        // Save the updated workout (async but don't await to avoid blocking UI)
        WorkoutLogger.saveCurrentWorkout(existingWorkout, user?.id).then(() => {
          console.log("[v0] Saved workout with refreshed progression data")
        }).catch((error) => {
          console.error("[v0] Failed to save refreshed workout:", error)
        })
      }

      loadedWorkout = existingWorkout
    } else {
      console.log("[v0] No existing workout found, creating new one for week", week, "day", day)

      const weekKey = `week${week}`
      const transformedExercises = workoutDay.exercises.map((exercise) => {
        // Use ProgressionRouter for advanced progression calculation with volume compensation
        const previousPerformance = ProgressionRouter.getPreviousPerformance(
          exercise.id,
          exercise.exerciseName,
          week,
          day
        )
        
        const progressionInput: ProgressionInput = {
          exercise,
          activeProgram,
          currentWeek: week,
          userProfile: {
            experience: (user?.experience as "beginner" | "intermediate" | "advanced") || "beginner",
            gender: (user?.gender as "male" | "female") || "male"
          },
          previousPerformance: previousPerformance || undefined
        }
        
        const result = ProgressionRouter.calculateProgression(progressionInput)

        return {
          exerciseId: exercise.id,
          exerciseName: exercise.exerciseName,
          targetSets: result.targetSets || 3,
          targetReps: result.targetReps.toString(),
          targetRest: `${Math.floor(exercise.restTime / 60)} min`,
          muscleGroup: getExerciseMuscleGroup(exercise.exerciseName),
          equipmentType: exercise.equipmentType || "BARBELL",
          suggestedWeight: result.targetWeight,
          progressionNote: result.progressionNote,
          // Add progression metadata for volume compensation
          bounds: result.additionalData?.bounds,
          strategy: result.strategy,
          tier: result.additionalData?.tier,
          baseVolume: result.targetWeight * result.targetReps,
          userOverridden: false
        }
      })

      const scheduleKeys = Object.keys(template.schedule)
      const daysPerWeek = scheduleKeys.length

      // Preview mode check: Don't sync to database if viewing future week
      const isCurrentWeekCompleted = WorkoutLogger.isWeekCompleted(activeProgram.currentWeek, daysPerWeek, user?.id)
      const isPreviewMode = week > activeProgram.currentWeek && !isCurrentWeekCompleted
      
      loadedWorkout = WorkoutLogger.startWorkout(
        workoutDay.name, 
        transformedExercises, 
        week, 
        day, 
        isPreviewMode ? undefined : user?.id  // Don't pass userId in preview mode to prevent DB sync
      )

      console.log("[v0] Created new workout:", {
        id: loadedWorkout.id,
        exerciseCount: loadedWorkout.exercises.length,
      })
    }

    const scheduleKeys = Object.keys(template.schedule)
    const daysPerWeek = scheduleKeys.length

    // New blocking logic: Allow current week (any day order) + completed weeks
    // Preview next week (blocked but visible with suggested weights), fully block weeks 2+ ahead
    if (week > activeProgram.currentWeek) {
      // Trying to access a future week - check if current week is complete
      const isCurrentWeekCompleted = WorkoutLogger.isWeekCompleted(activeProgram.currentWeek, daysPerWeek, user?.id)
      const weeksAhead = week - activeProgram.currentWeek

      if (!isCurrentWeekCompleted) {
        // For current week + 1, show suggested weights but block editing
        if (weeksAhead === 1) {
          setIsWorkoutBlocked(true)
          setIsFullyBlocked(false)
          setBlockedMessage("Complete current week to unlock this workout")
          console.log("[v0] Workout partially blocked - current week not completed, showing preview for week", week)
        } else {
          // For weeks 2+ ahead, fully block
          setIsWorkoutBlocked(true)
          setIsFullyBlocked(true)
          setBlockedMessage("Complete previous weeks before accessing this workout")
          console.log("[v0] Workout fully blocked - too many weeks ahead:", weeksAhead)
        }
      } else {
        // Current week is complete, allow access to next week
        setIsWorkoutBlocked(false)
        setIsFullyBlocked(false)
        setBlockedMessage("")
      }
    } else {
      // Current week or past weeks - always allow access
      setIsWorkoutBlocked(false)
      setIsFullyBlocked(false)
      setBlockedMessage("")
    }

    // Progression banner disabled - using pre-filled weights instead
    setShowProgressionBanner(false)
    setProgressionBannerMessage("")

    setWorkout(loadedWorkout)
    setWorkoutNotes(loadedWorkout.notes || "")
    setShowCalendar(false)
  }

  const getMuscleGroupColor = (muscleGroup: string) => {
    const colors: { [key: string]: string } = {
      CHEST: "bg-pink-100 text-pink-800 border-pink-200",
      SHOULDERS: "bg-pink-100 text-pink-800 border-pink-200",
      TRICEPS: "bg-pink-100 text-pink-800 border-pink-200",
      BACK: "bg-blue-100 text-blue-800 border-blue-200",
      BICEPS: "bg-blue-100 text-blue-800 border-blue-200",
      LEGS: "bg-green-100 text-green-800 border-green-200",
    }
    return colors[muscleGroup] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  if (!workout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No workout to log</p>
            <Button variant="outline" onClick={onCancel} className="mt-4 bg-transparent">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const displayExercises = workout.exercises

  console.log("[v0] Rendering workout with", displayExercises.length, "exercises")
  displayExercises.forEach((ex, idx) => {
    console.log(`[v0] Exercise ${idx + 1}: ${ex.exerciseName} - ${ex.sets?.length || 0} sets`)
  })

  const groupedExercises = displayExercises.reduce((acc, exercise) => {
    const muscleGroup = (exercise as any).muscleGroup || "Uncategorized"
    if (!acc[muscleGroup]) {
      acc[muscleGroup] = []
    }
    acc[muscleGroup].push(exercise)
    return acc
  }, {} as { [key: string]: typeof displayExercises })

  const handleMuscleGroupStatsClose = () => {
    setShowMuscleGroupStats(false)
    setShowCompletionDialog(true)
  }

  return (
    <>
      <div className="min-h-screen bg-background pb-20 lg:pb-4">
        <div className="sticky top-0 bg-background border-b border-border/50 z-[60] shadow-sm backdrop-blur-sm bg-background/95">
          <div className="w-full px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
                {programName && (
                  <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide truncate">{programName}</div>
                )}
                <h1 className="text-lg sm:text-xl font-bold truncate leading-tight">{workout?.workoutName}</h1>
                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Week {workout?.week || 1}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className={`h-9 w-9 sm:h-10 sm:w-10 p-0 ${showCalendar ? "bg-muted" : ""}`}
                >
                  <Calendar className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-md hover:bg-accent hover:text-accent-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-[100]">
                    <DropdownMenuItem onClick={() => setShowNotesDialog(true)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Workout Notes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowSummaryDialog(true)}>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Summary
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowAddExerciseDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Exercise
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowEndWorkoutDialog(true)}
                      className="text-orange-600 focus:text-orange-600"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      End Workout
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowEndProgramDialog(true)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      End Program
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <Progress value={getWorkoutProgress()} className="w-full h-1.5 sm:h-2" />
            </div>
          </div>
        </div>

        {/* Connection Status Banner */}
        {connectionStatus === 'offline' && (
          <div className="bg-red-50 border-b border-red-200 p-2 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-red-900">
              <WifiOff className="h-4 w-4" />
              <span className="font-medium">Offline - Reconnect to log sets</span>
            </div>
          </div>
        )}
        {connectionStatus === 'syncing' && (
          <div className="bg-blue-50 border-b border-blue-200 p-2 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-blue-900">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="font-medium">Logging set...</span>
            </div>
          </div>
        )}
        {/* Removed 'synced' banner for better UX - success is logged to console only */}
        {connectionStatus === 'error' && (
          <div className="bg-orange-50 border-b border-orange-200 p-2 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-orange-900">
              <XCircle className="h-4 w-4" />
              <span className="font-medium">Sync error - Please try again</span>
            </div>
          </div>
        )}

        {/* Calendar Section - Sticky below header */}
        {showCalendar && (
          <div className="border-b border-border/50 bg-background/95 backdrop-blur-sm w-full sticky top-[100px] sm:top-[120px] z-50 shadow-sm">
            <WorkoutCalendar
              onWorkoutClick={handleWorkoutClick}
              selectedWeek={workout?.week}
              selectedDay={workout?.day}
            />
          </div>
        )}

        {/* Progression Notes Banner - Only show if previous week/day is incomplete */}
        {workout?.week &&
         workout?.week > 1 &&
         workout?.notes &&
         !isWorkoutBlocked &&
         !WorkoutLogger.hasCompletedWorkout(workout.week - 1, workout.day || 1, user?.id) && (
          <div className="bg-blue-50 border-b border-blue-200 p-3 text-center">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Week {workout.week}, Day {workout.day}:</span> {workout.notes}
            </p>
          </div>
        )}

        {/* Week Access Banner - Show when accessing Current Week + 1 before current week is completed */}
        {isWorkoutBlocked && !isFullyBlocked && (
          <div className="bg-blue-50 border-b border-blue-200 p-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <Lock className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-900 font-medium">
                Complete Current Week to Start Logging
              </p>
            </div>
          </div>
        )}

        {/* Progression banner removed - using pre-filled weights instead */}

        
        <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Workout Notes</DialogTitle>
              <DialogDescription>Add notes about your workout, how you felt, or any observations.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Enter your workout notes here..."
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveNotes}>Save Notes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showExerciseNotesDialog} onOpenChange={setShowExerciseNotesDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Exercise Notes</DialogTitle>
              <DialogDescription>
                Add notes about this exercise, technique cues, or form observations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Enter your exercise notes here..."
                value={exerciseNotes}
                onChange={(e) => setExerciseNotes(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExerciseNotesDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveExerciseNotes}>Save Notes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Workout Summary</DialogTitle>
              <DialogDescription>Overview of your current workout progress.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {(() => {
                const summary = getWorkoutSummary()
                return (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{summary.completedSets}</div>
                      <div className="text-sm text-muted-foreground">Completed Sets</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{summary.skippedSets}</div>
                      <div className="text-sm text-muted-foreground">Skipped Sets</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">{summary.totalSets}</div>
                      <div className="text-sm text-muted-foreground">Total Sets</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">{summary.exercises}</div>
                      <div className="text-sm text-muted-foreground">Exercises</div>
                    </div>
                  </div>
                )
              })()}
            </div>
            <DialogFooter>
              <Button onClick={() => setShowSummaryDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddExerciseDialog} onOpenChange={setShowAddExerciseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Exercise</DialogTitle>
              <DialogDescription>Add an extra exercise to your current workout template.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center p-8 text-muted-foreground">
                <Plus className="h-12 w-12 mx-auto mb-4" />
                <p>Exercise selection feature coming soon...</p>
                <p className="text-sm">You'll be able to browse and add exercises from our database.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddExerciseDialog(false)}>
                Cancel
              </Button>
              <Button disabled>Add Exercise</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showEndWorkoutDialog} onOpenChange={setShowEndWorkoutDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <Check className="h-5 w-5" />
                End Workout
              </DialogTitle>
              <DialogDescription>
                This will mark all remaining sets as skipped and complete your current workout. You'll be able to start the next workout.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800 font-medium">
                  To confirm, please type "End Workout" in the field below:
                </p>
              </div>
              <Input
                placeholder="Type 'End Workout' to confirm"
                value={endWorkoutConfirmation}
                onChange={(e) => setEndWorkoutConfirmation(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEndWorkoutDialog(false)
                  setEndWorkoutConfirmation("")
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-orange-600 hover:bg-orange-700"
                onClick={handleEndWorkout}
                disabled={endWorkoutConfirmation !== "End Workout"}
              >
                End Workout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showEndProgramDialog} onOpenChange={setShowEndProgramDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                End Program
              </DialogTitle>
              <DialogDescription>
                This will mark all remaining sets as skipped and end your current program. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">
                  To confirm, please type "End Program" in the field below:
                </p>
              </div>
              <Input
                placeholder="Type 'End Program' to confirm"
                value={endProgramConfirmation}
                onChange={(e) => setEndProgramConfirmation(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEndProgramDialog(false)
                  setEndProgramConfirmation("")
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleEndProgram}
                disabled={endProgramConfirmation !== "End Program"}
              >
                End Program
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="w-full max-w-full mx-auto px-3 sm:px-4 overflow-x-hidden">
          {Object.entries(groupedExercises).map(([muscleGroup, exercises]) => (
            <div key={muscleGroup}>
              {exercises.map((exercise, index) => {
                // Get muscle group for current and previous exercise
                const currentMuscleGroup = getExerciseMuscleGroup(exercise.exerciseName)
                const previousMuscleGroup = index > 0 ? getExerciseMuscleGroup(exercises[index - 1].exerciseName) : null
                const isNewMuscleGroup = currentMuscleGroup !== previousMuscleGroup

                return (
                  <div key={exercise.id}>
                    {/* Muscle Group Header - only show when muscle group changes */}
                    {isNewMuscleGroup && (
                      <div className="flex items-center gap-2 py-3 px-1 mt-4">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-1 h-5 bg-primary rounded-full" />
                          <h3 className="text-xs font-bold uppercase tracking-wide text-primary">{currentMuscleGroup}</h3>
                        </div>
                      </div>
                    )}

                    {/* Out of Bounds Warning Banner - Per Exercise */}
                    {outOfBoundsExercises[exercise.id] && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 mb-2 mt-2">
                        <div className="text-xs text-yellow-800">
                          ⚠️ Set {outOfBoundsExercises[exercise.id].setNumber}: Weight out of range ({Math.round(outOfBoundsExercises[exercise.id].min)}-{Math.round(outOfBoundsExercises[exercise.id].max)} lbs). Enter reps manually.
                        </div>
                      </div>
                    )}

                    {/* Exercise Card - Flat list style */}
                    <div className="border-b border-border/30 relative bg-background hover:bg-muted/20 transition-colors">
                      <div className="py-3 px-1 sm:py-4 sm:px-2">
                        
                        <div className="flex items-center justify-between pb-3">
                          <div className="flex-1">
                            <h4 className="text-base font-medium">{exercise.exerciseName}</h4>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>{(exercise as any).equipmentType || "BARBELL"}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground">
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="z-[100]">
                                <DropdownMenuItem onClick={() => handleExerciseNotes(exercise.id)}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Exercise notes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleReplaceExercise(exercise.id)}>
                                  <Replace className="h-4 w-4 mr-2" />
                                  Replace
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {workout && workout.exercises.findIndex((ex) => ex.id === exercise.id) > 0 && (
                                  <DropdownMenuItem onClick={() => handleMoveExerciseUp(exercise.id)}>
                                    <ArrowUp className="h-4 w-4 mr-2" />
                                    Move up
                                  </DropdownMenuItem>
                                )}
                                {workout && workout.exercises.findIndex((ex) => ex.id === exercise.id) < workout.exercises.length - 1 && (
                                  <DropdownMenuItem onClick={() => handleMoveExerciseDown(exercise.id)}>
                                    <ArrowDown className="h-4 w-4 mr-2" />
                                    Move down
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleSkipAllSets(exercise.id)}>
                                  <SkipForward className="h-4 w-4 mr-2" />
                                  Skip all sets
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteExercise(exercise.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete exercise
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                      <div className="px-1 pb-2 sm:px-2 relative">
                        {isFullyBlocked ? (
                          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10 flex items-center justify-center p-3">
                            <div className="text-center px-2 max-w-full">
                              <Lock className="h-7 w-7 mx-auto mb-2 text-destructive" />
                              <p className="text-xs font-medium text-destructive leading-tight">
                                {blockedMessage || "Complete previous weeks before accessing this workout"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          isWorkoutBlocked && (
                            <div className="bg-orange-50 border border-orange-200 rounded-md p-2 mb-3 flex items-center gap-2">
                              <Lock className="h-4 w-4 text-orange-600 flex-shrink-0" />
                              <p className="text-xs text-orange-800 leading-tight">
                                {blockedMessage || "Complete previous week before accessing this workout"}
                              </p>
                            </div>
                          )
                        )}

                        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase mb-3">
                          <div className="col-span-1"></div>
                          <div className="col-span-4 text-center">WEIGHT</div>
                          <div className="col-span-3 text-center">REPS</div>
                          <div className="col-span-3 text-center">LOG</div>
                          <div className="col-span-1"></div>
                        </div>

                        <div className="space-y-2">
                          {exercise.sets.map((set, setIndex) => (
                            <div key={set.id} className="space-y-0">
                              <div className="grid grid-cols-12 gap-1 sm:gap-2 items-center">
                              <div className="col-span-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground">
                                      <MoreVertical className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="z-[100]">
                                    <DropdownMenuItem onClick={() => handleAddSet(exercise.id, set.id)}>
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add set below
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSkipSet(exercise.id, set.id)}>
                                      <SkipForward className="h-4 w-4 mr-2" />
                                      Skip set
                                    </DropdownMenuItem>
                                    {exercise.sets.length > 1 && (
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteSet(exercise.id, set.id)}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete set
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              <div className="col-span-4">
                                <Input
                                  type="number"
                                  value={set.weight || ""}
                                  onChange={(e) =>
                                    handleSetUpdate(exercise.id, set.id, "weight", Number.parseFloat(e.target.value) || 0)
                                  }
                                  onBlur={() => handleWeightInputBlur(exercise.id, set.id)}
                                  className="text-center h-10 bg-muted/30 border-border/50"
                                  placeholder={
                                    (exercise as any).suggestedWeight && (exercise as any).suggestedWeight > 0
                                      ? `${(exercise as any).suggestedWeight} lbs`
                                      : ""
                                  }
                                  step="2.5"
                                  disabled={isWorkoutBlocked}
                                  title={
                                    (exercise as any).progressionNote ||
                                    ((exercise as any).suggestedWeight && (exercise as any).suggestedWeight > 0
                                      ? `Suggested: ${(exercise as any).suggestedWeight} lbs`
                                      : "")
                                  }
                                />
                              </div>

                              <div className="col-span-3">
                                <Input
                                  type="number"
                                  value={set.reps || ""}
                                  onChange={(e) =>
                                    handleSetUpdate(exercise.id, set.id, "reps", Number.parseInt(e.target.value) || 0)
                                  }
                                  className="text-center h-10 bg-muted/30 border-border/50"
                                  placeholder=""
                                  disabled={isWorkoutBlocked}
                                />
                              </div>

                              <div className="col-span-3">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    console.log("[v0] 🎯 SET CLICK - Before handleCompleteSet:", {
                                      exerciseId: exercise.id,
                                      exerciseName: exercise.exerciseName,
                                      setId: set.id,
                                      setIndex,
                                      currentState: {
                                        reps: set.reps,
                                        weight: set.weight,
                                        completed: set.completed,
                                        skipped: set.skipped
                                      }
                                    })
                                    handleCompleteSet(exercise.id, set.id)
                                  }}
                                  disabled={isWorkoutBlocked}
                                  variant="ghost"
                                  className={`w-full h-10 border-2 ${
                                    set.completed
                                      ? (set.reps === 0 && set.weight === 0) || set.skipped
                                        ? "bg-blue-50 border-blue-500 text-blue-700"
                                        : "bg-green-50 border-green-500 text-green-700"
                                      : "border-border/50 hover:border-primary"
                                  }`}
                                >
                                  {(() => {
                                    const showingMinus = set.completed && ((set.reps === 0 && set.weight === 0) || set.skipped)
                                    if (showingMinus) {
                                      console.log("[v0] 🔵 RENDERING MINUS (—) for set:", {
                                        exerciseName: exercise.exerciseName,
                                        setIndex,
                                        setId: set.id,
                                        reps: set.reps,
                                        weight: set.weight,
                                        completed: set.completed,
                                        skipped: set.skipped,
                                        reason: set.skipped ? "skipped=true" : "reps=0 AND weight=0"
                                      })
                                    }
                                    if (set.completed) {
                                      if ((set.reps === 0 && set.weight === 0) || set.skipped) {
                                        return <Minus className="h-5 w-5 text-blue-600" />
                                      } else {
                                        return <Check className="h-5 w-5 text-green-600" />
                                      }
                                    } else {
                                      return <div className="w-5 h-5 border-2 border-border rounded" />
                                    }
                                  })()}
                                </Button>
                              </div>

                                <div className="col-span-1 text-center">
                                  <span className="text-sm font-medium text-muted-foreground">{setIndex + 1}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          <div className="lg:hidden pt-4 pb-2">
            {!isWorkoutBlocked && (
              <>
                {workout.completed ? (
                  <div className="w-full p-4 bg-green-50 border-2 border-green-500 rounded-lg text-center">
                    <Check className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <p className="font-semibold text-green-700">Workout Completed</p>
                    <p className="text-sm text-green-600 mt-1">
                      {new Date(workout.endTime || workout.startTime).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={handleCompleteWorkout}
                    className="w-full gradient-primary text-primary-foreground"
                    disabled={!canFinishWorkout() || isCompletingWorkout}
                  >
                    {isCompletingWorkout ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Completing...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {canFinishWorkout() ? "Finish Workout" : "Complete exercises to finish"}
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Desktop Finish Workout Bar Inline */}
          <div className="hidden lg:block lg:mt-8 lg:ml-64 lg:mr-0 lg:px-4 lg:pr-8">
            {!isWorkoutBlocked && (
              <>
                {workout.completed ? (
                  <div className="w-full p-4 bg-green-50 border-2 border-green-500 rounded-lg text-center">
                    <Check className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <p className="font-semibold text-green-700">Workout Completed</p>
                    <p className="text-sm text-green-600 mt-1">
                      {new Date(workout.endTime || workout.startTime).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={handleCompleteWorkout}
                    className="w-full gradient-primary text-primary-foreground"
                    disabled={!canFinishWorkout() || isCompletingWorkout}
                  >
                    {isCompletingWorkout ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Completing...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {canFinishWorkout() ? "Finish Workout" : "Complete exercises to finish"}
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <WorkoutCompletionDialog
        workout={completedWorkout}
        open={showCompletionDialog}
        onClose={handleCompletionDialogClose}
        onViewMuscleGroupStats={handleViewMuscleGroupStats}
        onStartNextWorkout={handleStartNextWorkout}
      />

      <MuscleGroupStats open={showMuscleGroupStats} onClose={handleMuscleGroupStatsClose} />

      <ExerciseLibrary
        open={showExerciseLibrary}
        onOpenChange={setShowExerciseLibrary}
        onSelectExercise={handleSelectExerciseFromLibrary}
        currentExerciseName={
          replaceExerciseId ? workout?.exercises.find((ex) => ex.id === replaceExerciseId)?.exerciseName : undefined
        }
      />
    </>
  )
}
