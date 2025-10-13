"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { ProgramStateManager } from "@/lib/program-state"
import { getExerciseMuscleGroup } from "@/lib/exercise-muscle-groups"
import { ProgressionRouter, type ProgressionInput } from "@/lib/progression-router"
import { getTierRules, isWeightWithinBounds, calculateVolumeCompensation } from "@/lib/progression-tiers"
import { ConnectionMonitor } from "@/lib/connection-monitor"
import { WorkoutLogger, type WorkoutSession } from "@/lib/workout-logger"
import type { WorkoutLoggerProps } from "@/components/workout-logger/types"

export function useWorkoutSession({ initialWorkout, onComplete, onCancel }: WorkoutLoggerProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const routerOneRepMaxes: any[] = []
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
  const [programWasEnded, setProgramWasEnded] = useState(false)
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

  // Loading state for finish workout
  const [isCompletingWorkout, setIsCompletingWorkout] = useState(false)

  // Progression tracking for volume compensation
  const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>({})
  const [volumeCompensation, setVolumeCompensation] = useState<Record<string, {
    adjustedReps: number
    strategy: string
    message?: string
  }>>({})
  const [outOfBoundsExercises, setOutOfBoundsExercises] = useState<Record<string, { min: number; max: number; setNumber: number }>>({})

  useEffect(() => {
    const initializeWorkoutData = async () => {
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

      await ProgramStateManager.recalculateProgress()

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
    }

    initializeWorkoutData()
  }, [])

  useEffect(() => {
    const loadProgramData = async () => {
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

      const activeProgram = await ProgramStateManager.getActiveProgram()
      if (activeProgram) {
        setProgramName(activeProgram.template.name)
      }

      const existingWorkout = await WorkoutLogger.getCurrentWorkout()
      if (existingWorkout) {
        console.log("[v0] 📥 COMPONENT LOAD - Existing workout from localStorage:", {
          id: existingWorkout.id,
          week: existingWorkout.week,
          day: existingWorkout.day,
          exerciseCount: existingWorkout.exercises?.length || 0,
          exercises: existingWorkout.exercises?.map((ex) => ({
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
              oneRepMaxes: routerOneRepMaxes,
            }

            const result = ProgressionRouter.calculateProgression(progressionInput)

            console.log("[v0] MOUNT - Refreshed progression for", exercise.exerciseName, {
              suggestedWeight: result.targetWeight,
              progressionNote: result.progressionNote,
            })

            const suggestedWeight = result.targetWeight ?? 0

            // Extract default reps from performedReps string (e.g., "8-10" -> 8)
            const defaultReps = result.performedReps 
              ? parseInt(result.performedReps.toString().split('-')[0]) || 0
              : 0

            const updatedSets = exercise.sets?.map((set) => {
              // Fallback to exercise-level suggestion with default reps
              return {
                ...set,
                weight:
                  !set.completed && !set.skipped && suggestedWeight > 0
                    ? suggestedWeight
                    : set.weight,
                reps:
                  !set.completed && !set.skipped && defaultReps > 0
                    ? defaultReps
                    : set.reps,
              }
            })

            return {
              ...exercise,
              suggestedWeight,
              progressionNote: result.progressionNote,
              sets: updatedSets ?? exercise.sets,
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
          
          // Re-check bounds after progression refresh since suggestedWeight/bounds may have changed
          refreshedWorkout.exercises.forEach((ex) => {
            // Use setTimeout to ensure state updates have completed
            setTimeout(() => checkExerciseBoundsStatus(ex.id), 0)
          })
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
        const activeProgram = await ProgramStateManager.getActiveProgram()
        const week = activeProgram?.currentWeek
        const day = activeProgram?.currentDay

        const newWorkout = await WorkoutLogger.startWorkout(initialWorkout.name, initialWorkout.exercises, week, day, user?.id)
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
      } else {
        // No existing workout and no initialWorkout prop - load current workout from program
        console.log("[v0] No existing workout or initialWorkout, loading current workout from program")
        const currentWorkout = await ProgramStateManager.getCurrentWorkout()
        
        if (!currentWorkout) {
          console.warn("[v0] No current workout available from program - this is normal if no active program exists")
          return
        }

        const activeProgram = await ProgramStateManager.getActiveProgram()
        const week = activeProgram?.currentWeek
        const day = activeProgram?.currentDay

        const newWorkout = await WorkoutLogger.startWorkout(currentWorkout.name, currentWorkout.exercises, week, day, user?.id)
        console.log("[v0] 🆕 COMPONENT NEW WORKOUT - Created from current program workout:", {
          id: newWorkout.id,
          week: newWorkout.week,
          day: newWorkout.day,
          exerciseCount: newWorkout.exercises.length,
          workoutName: currentWorkout.name
        })
        setWorkout(newWorkout)
        setIsWorkoutBlocked(false)
        setIsFullyBlocked(false)
        setBlockedMessage("")
      }
    }
    
    loadProgramData()
  }, [initialWorkout])

  // Listen for program state changes
  useEffect(() => {
    const handleProgramChange = async () => {
      console.log("[v0] Program state changed, reloading workout...")
      const activeProgram = await ProgramStateManager.getActiveProgram()
      
      if (activeProgram) {
        setProgramName(activeProgram.template.name)

        // Get the current workout based on updated program state
        const currentWorkout = await ProgramStateManager.getCurrentWorkout()
        if (currentWorkout) {
          const week = activeProgram?.currentWeek
          const day = activeProgram?.currentDay

          const newWorkout = await WorkoutLogger.startWorkout(currentWorkout.name, currentWorkout.exercises, week, day, user?.id)
          console.log("[v0] Loaded new workout after program change:", {
            week,
            day,
            workoutName: newWorkout.workoutName,
          })
          // Only update state after new workout is fully loaded (prevents "No Workout" flash)
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

  // Legacy enrichment event listener removed - all templates now use proper UUIDs with complete metadata

  
  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Initialize ConnectionMonitor
  const handleSetUpdate = (exerciseId: string, setId: string, field: "reps" | "weight", value: number) => {
    if (!workout || !workout.exercises) return

    console.log("[v0] handleSetUpdate called:", { exerciseId, setId, field, value, isWorkoutBlocked })

    const exercise = workout.exercises.find((ex) => ex.id === exerciseId)
    if (!exercise) return

    const volumeKey = `${exerciseId}_${setId}`

    let calculatedAdjustedReps: number | undefined
    let shouldClearReps = false
    let compensationDetails: { adjustedReps: number; strategy: string; message?: string } | null = null

    if (field === "weight") {
      if (exercise.suggestedWeight) {
        const tierRules = getTierRules(exercise.exerciseName, "isolation")
        const withinBounds = isWeightWithinBounds(
          value,
          exercise.suggestedWeight,
          tierRules.adjustmentBounds
        )

        if (!withinBounds) {
          console.log("[v0] Weight out of bounds, marking as override")
          setUserOverrides((prev) => ({ ...prev, [exerciseId]: true }))

          const bounds = tierRules.adjustmentBounds
          const minBoundRaw = bounds.min
          const maxBoundRaw = bounds.max
          const minBound = typeof minBoundRaw === "number" ? minBoundRaw : Number(minBoundRaw)
          const maxBound = typeof maxBoundRaw === "number" ? maxBoundRaw : Number(maxBoundRaw)

          shouldClearReps = true

          const message =
            Number.isFinite(minBound) && Number.isFinite(maxBound)
              ? `Weight outside recommended range (${minBound} - ${maxBound}). Adjust load to continue.`
              : "Weight outside recommended range. Adjust load to continue."

          compensationDetails = {
            adjustedReps: 0,
            strategy: "out_of_bounds",
            message,
          }
        } else {
          const baseReps = exercise.performedReps
            ? Number.parseInt(exercise.performedReps.split("-")[0], 10) || 10
            : 10
          const targetVolume = exercise.suggestedWeight * baseReps

          const compensation = calculateVolumeCompensation(
            targetVolume,
            value,
            tierRules.maxRepAdjustment
          )

          calculatedAdjustedReps = compensation.adjustedReps
          compensationDetails = {
            adjustedReps: compensation.adjustedReps,
            strategy: compensation.strategy,
            message: compensation.message,
          }

          setUserOverrides((prev) => ({ ...prev, [exerciseId]: false }))
        }
      } else {
        // No suggested weight means remove any previous compensation messaging
        setUserOverrides((prev) => ({ ...prev, [exerciseId]: false }))
      }

      setVolumeCompensation((prev) => {
        const updated = { ...prev }

        if (compensationDetails) {
          updated[exerciseId] = { ...compensationDetails }
          updated[volumeKey] = { ...compensationDetails }
        } else {
          delete updated[exerciseId]
          delete updated[volumeKey]
        }

        return updated
      })
    }

    // Handle manual reps changes (detect override)
    if (field === "reps") {
      const compensation = volumeCompensation[exerciseId] || volumeCompensation[volumeKey]
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
              .catch((error: unknown) => {
                // Handle 409 conflicts gracefully - they just mean the record already exists
                if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.includes('409')) {
                  console.log("[v0] Workout already exists in database (this is normal)")
                } else {
                  console.error("[v0] Failed to sync workout to database:", error)
                }
              })
          } else {
            // Queue sync for when connection is restored
            ConnectionMonitor.addToQueue(async () => {
              try {
                await WorkoutLogger.saveCurrentWorkout(updatedWorkout, user?.id)
              } catch (error: unknown) {
                if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.includes('409')) {
                  console.log("[v0] Workout already exists in database (this is normal)")
                } else {
                  console.error("[v0] Failed to sync queued workout:", error)
                }
              }
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

  const handleWeightInputBlur = (exerciseId: string, _setId: string) => {
    // Check bounds immediately on blur
    checkExerciseBoundsStatus(exerciseId)
  }

  // Check if current active set of an exercise is out of bounds and update banner
  const checkExerciseBoundsStatus = (exerciseId: string) => {
    if (!workout || !workout.exercises) return

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

    // Simplified bounds check without 1RM features
    if (activeSet.weight > 0 && exercise.suggestedWeight) {
      const tierRules = getTierRules(exercise.exerciseName, "isolation")
      const withinBounds = isWeightWithinBounds(
        activeSet.weight,
        exercise.suggestedWeight,
        tierRules.adjustmentBounds
      )

      if (!withinBounds) {
        const bounds = tierRules.adjustmentBounds
        setOutOfBoundsExercises(prev => ({
          ...prev,
          [exerciseId]: { 
            min: typeof bounds.min === 'number' ? bounds.min : Number(bounds.min), 
            max: typeof bounds.max === 'number' ? bounds.max : Number(bounds.max), 
            setNumber 
          }
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
    if (!workout || !workout.exercises) return

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
    if (!workout || !workout.exercises) return false

    return workout.exercises.every((exercise) => exercise.sets.every((set) => set.completed))
  }

  const handleCompleteWorkout = async () => {
    if (!workout || !workout.exercises) return

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

        // Batch all state updates and sync together, only dispatch event once at the end
        if (!wasAlreadyCompleted) {
          await ProgramStateManager.completeWorkout(user?.id, { skipEvent: true })
        }

        // Sync to database (batched operation)
        if (user?.id) {
          try {
            await WorkoutLogger.syncToDatabase(user.id)
          } catch (error) {
            console.error("[v0] Failed to sync to database:", error)
            // Still show completion dialog even if sync fails
          }
        }

        // Dispatch optimistic update event immediately (synchronous)
        window.dispatchEvent(new CustomEvent("workoutCompleted", {
          detail: {
            week: completedWorkout.week,
            day: completedWorkout.day,
            completed: true
          }
        }))

        // Also dispatch on next tick to catch listeners that remount
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("workoutCompleted", {
            detail: {
              week: completedWorkout.week,
              day: completedWorkout.day,
              completed: true
            }
          }))
        }, 0)

        // Dispatch single programChanged event after all updates complete
        window.dispatchEvent(new Event("programChanged"))

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
    
    // If program was ended, the event was already dispatched in handleEndProgram
    // Just reset the flag
    if (programWasEnded) {
      setProgramWasEnded(false)
      // Event already dispatched, no need to dispatch again
    } else {
      onComplete?.()
    }
  }

  const handleViewMuscleGroupStats = () => {
    setShowCompletionDialog(false)
    setShowMuscleGroupStats(true)
    
    // If program was ended, we'll navigate after viewing stats
    // (programWasEnded flag remains set)
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

    // Validate this is the current active workout
    const activeProgram = await ProgramStateManager.getActiveProgram()
    if (!activeProgram) {
      console.error("[handleEndWorkout] No active program found")
      return
    }

    // Only allow ending the current week's workout
    if (workout.week !== activeProgram.currentWeek || workout.day !== activeProgram.currentDay) {
      toast({
        title: "Cannot End Workout",
        description: `You can only end the current active workout (Week ${activeProgram.currentWeek}, Day ${activeProgram.currentDay}). This is Week ${workout.week}, Day ${workout.day}.`,
        variant: "destructive",
      })
      return
    }

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
    const completedWorkout = await WorkoutLogger.completeWorkout(updatedWorkout.id, user?.id)
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
    if (!workout || endProgramConfirmation !== "End Program") return

    const activeProgram = await ProgramStateManager.getActiveProgram()
    if (!activeProgram) {
      console.error("[handleEndProgram] No active program found")
      return
    }

    try {
      const wasAlreadyCompleted = WorkoutLogger.hasCompletedWorkout(
        activeProgram.currentWeek,
        activeProgram.currentDay,
        user?.id
      )

      // Only mark uncompleted sets as skipped, preserve already completed sets
      const updatedWorkout: WorkoutSession = {
        ...workout,
        exercises: workout.exercises.map((exercise) => ({
          ...exercise,
          completed: true,
          sets: exercise.sets.map((set) => {
            if (set.completed) {
              // Keep completed sets as-is (preserves weight/reps)
              return set
            } else {
              // Mark incomplete sets as skipped
              return {
                ...set,
                completed: true,
                reps: 0,
                weight: 0,
                skipped: true
              }
            }
          }),
        })),
      }

      setWorkout(updatedWorkout)
      await WorkoutLogger.saveCurrentWorkout(updatedWorkout, user?.id)

      const completedWorkout = await WorkoutLogger.completeWorkout(updatedWorkout.id, user?.id)
      if (!completedWorkout) {
        console.error("[handleEndProgram] Failed to complete current workout")
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

      let programForSkipping = await ProgramStateManager.getActiveProgram()
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

      // Clear the active program to force program selection
      await ProgramStateManager.clearActiveProgram()
      console.log("[handleEndProgram] Program ended and cleared")

      // Don't show completion dialog when ending program
      // setShowCompletionDialog(true)  // REMOVE THIS
      
      // Immediately switch to train view
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('programEnded'))
      }
      
      setWorkout(null)
    } catch (error) {
      console.error("[v0] Failed to end program:", error)
    } finally {
      setEndProgramConfirmation("")
      setShowEndProgramDialog(false)
    }
  }

  const getWorkoutSummary = () => {
    if (!workout || !workout.exercises) return { completedSets: 0, skippedSets: 0, totalSets: 0, exercises: 0 }

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
    if (!workout || !workout.exercises) return 0
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

  const handleWorkoutClick = async (week: number, day: number) => {
    const activeProgram = await ProgramStateManager.getActiveProgram()
    if (!activeProgram) return

    console.log("[v0] User clicked on week", week, "day", day)

    // Use the template from activeProgram instead of getTemplateById
    const template = activeProgram.template
    if (!template) {
      console.error("[v0] No template in active program")
      return
    }

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
    const inProgressWorkout = await WorkoutLogger.getInProgressWorkout(week, day, user?.id)
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
            previousPerformance,
            oneRepMaxes: routerOneRepMaxes
          }
          
          const result = ProgressionRouter.calculateProgression(progressionInput)
          
          console.log("[v0] Refreshed progression for", exercise.exerciseName, ":", {
            oldNote: exercise.progressionNote,
            newNote: result.progressionNote,
            oldWeight: exercise.suggestedWeight,
            newWeight: result.targetWeight,
            oldReps: exercise.performedReps,
            newReps: previousPerformance?.actualReps || result.performedReps
          })

          // Update exercise with new progression data
          // Copy actualReps from previous week (what user actually did), not template target
          return {
            ...exercise,
            performedReps: previousPerformance?.actualReps?.toString() || exercise.performedReps,
            suggestedWeight: result.targetWeight,
            progressionNote: result.progressionNote,
            bounds: result.additionalData?.bounds,
            strategy: result.strategy,
            tier: result.additionalData?.tier,
            baseVolume: result.targetWeight * result.performedReps,
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
          previousPerformance: previousPerformance || undefined,
          oneRepMaxes: routerOneRepMaxes
        }
        
        const result = ProgressionRouter.calculateProgression(progressionInput)

        return {
          exerciseId: exercise.id,
          exerciseName: exercise.exerciseName,
          targetSets: result.targetSets || 3,
          performedReps: result.performedReps.toString(),
          targetRest: `${Math.floor(exercise.restTime / 60)} min`,
          muscleGroup: getExerciseMuscleGroup(exercise.exerciseName),
          equipmentType: exercise.equipmentType || "BARBELL",
          suggestedWeight: result.targetWeight,
          progressionNote: result.progressionNote,
          // Add progression metadata for volume compensation
          bounds: result.additionalData?.bounds,
          strategy: result.strategy,
          tier: result.additionalData?.tier,
          baseVolume: result.targetWeight * result.performedReps,
          userOverridden: false
        }
      })

      // Check blocking logic BEFORE creating workout to prevent ghost data
      const scheduleKeys = Object.keys(template.schedule)
      const daysPerWeek = scheduleKeys.length
      const isCurrentWeekCompleted = WorkoutLogger.isWeekCompleted(activeProgram.currentWeek, daysPerWeek, user?.id)
      const weeksAhead = week - activeProgram.currentWeek

      // Determine if this should be blocked or preview-only
      let shouldCreateWorkout = true
      let isPreviewMode = false

      if (week > activeProgram.currentWeek) {
        if (!isCurrentWeekCompleted) {
          if (weeksAhead === 1) {
            // Next week preview - create workout but don't persist
            isPreviewMode = true
          } else {
            // Too far ahead - don't create workout at all
            shouldCreateWorkout = false
          }
        }
      }

      if (shouldCreateWorkout) {
        loadedWorkout = await WorkoutLogger.startWorkout(
          workoutDay.name, 
          transformedExercises, 
          week, 
          day, 
          isPreviewMode ? undefined : user?.id  // Don't pass userId in preview mode to prevent DB sync
        )

        console.log("[v0] Created new workout:", {
          id: loadedWorkout.id,
          exerciseCount: loadedWorkout.exercises.length,
          isPreviewMode
        })
      } else {
        // Create a minimal workout object for display without persisting
        loadedWorkout = {
          id: `preview-${week}-${day}`,
          workoutName: workoutDay.name,
          week,
          day,
          exercises: transformedExercises.map(ex => ({
            ...ex,
            sets: Array.from({ length: ex.targetSets }, (_, i) => ({
              id: `preview-set-${i}`,
              reps: 0,
              weight: 0,
              completed: false,
              skipped: false
            }))
          })),
          completed: false,
          startTime: Date.now(),
          userId: user?.id
        } as WorkoutSession
      }
    }

    // New blocking logic: Allow current week (any day order) + completed weeks
    // Preview next week (blocked but visible with suggested weights), fully block weeks 2+ ahead
    if (week > activeProgram.currentWeek) {
      // Trying to access a future week - check if current week is complete
      const scheduleKeys = Object.keys(template.schedule)
      const daysPerWeek = scheduleKeys.length
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

  const displayExercises = workout?.exercises ?? []

  console.log("[v0] Rendering workout with", displayExercises?.length || 0, "exercises")
  displayExercises?.forEach((ex, idx) => {
    console.log(`[v0] Exercise ${idx + 1}: ${ex.exerciseName} - ${ex.sets?.length || 0} sets`)
  })

  const groupedExercises = displayExercises?.reduce((acc, exercise) => {
    const muscleGroup = (exercise as any).muscleGroup || "Uncategorized"
    if (!acc[muscleGroup]) {
      acc[muscleGroup] = []
    }
    acc[muscleGroup].push(exercise)
    return acc
  }, {} as { [key: string]: typeof displayExercises }) || {}

  const handleMuscleGroupStatsClose = () => {
    setShowMuscleGroupStats(false)
    setShowCompletionDialog(true)
  }
  return {
    workout,
    setWorkout,
    showNotesDialog,
    setShowNotesDialog,
    showSummaryDialog,
    setShowSummaryDialog,
    showAddExerciseDialog,
    setShowAddExerciseDialog,
    showEndWorkoutDialog,
    setShowEndWorkoutDialog,
    showEndProgramDialog,
    setShowEndProgramDialog,
    showCompletionDialog,
    setShowCompletionDialog,
    completedWorkout,
    setCompletedWorkout,
    workoutNotes,
    setWorkoutNotes,
    endWorkoutConfirmation,
    setEndWorkoutConfirmation,
    endProgramConfirmation,
    setEndProgramConfirmation,
    showCalendar,
    setShowCalendar,
    showMuscleGroupStats,
    setShowMuscleGroupStats,
    isWorkoutBlocked,
    setIsWorkoutBlocked,
    isFullyBlocked,
    setIsFullyBlocked,
    blockedMessage,
    setBlockedMessage,
    programName,
    setProgramName,
    showExerciseNotesDialog,
    setShowExerciseNotesDialog,
    selectedExerciseId,
    setSelectedExerciseId,
    exerciseNotes,
    setExerciseNotes,
    showExerciseLibrary,
    setShowExerciseLibrary,
    replaceExerciseId,
    setReplaceExerciseId,
    showProgressionBanner,
    setShowProgressionBanner,
    progressionBannerMessage,
    setProgressionBannerMessage,
    isCompletingWorkout,
    setIsCompletingWorkout,
    userOverrides,
    setUserOverrides,
    volumeCompensation,
    setVolumeCompensation,
    outOfBoundsExercises,
    setOutOfBoundsExercises,
    debounceTimerRef,
    boundsCheckTimerRef,
    handleSetUpdate,
    handleWeightInputBlur,
    handleCompleteSet,
    handleCompleteWorkout,
    handleCompletionDialogClose,
    handleViewMuscleGroupStats,
    handleCancelWorkout,
    handleSaveNotes,
    handleEndWorkout,
    handleEndProgram,
    handleAddSet,
    handleDeleteSet,
    handleSkipSet,
    handleExerciseNotes,
    handleSaveExerciseNotes,
    handleReplaceExercise,
    handleMoveExerciseUp,
    handleMoveExerciseDown,
    handleSkipAllSets,
    handleDeleteExercise,
    handleSelectExerciseFromLibrary,
    handleStartNextWorkout,
    handleWorkoutClick,
    handleMuscleGroupStatsClose,
    getWorkoutSummary,
    getWorkoutProgress,
    getMuscleGroupColor,
    canFinishWorkout,
    displayExercises,
    groupedExercises,
  }
}

