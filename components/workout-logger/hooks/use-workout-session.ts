"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { ProgramStateManager } from "@/lib/program-state"
import { getExerciseMuscleGroup, getMuscleGroupBadgeClass } from "@/lib/exercise-muscle-groups"
import { ProgressionRouter, type ProgressionInput } from "@/lib/progression-router"
import {
  getTierRules,
  isWeightWithinBounds,
  calculateVolumeCompensation,
  calculateWeightBounds,
  PROGRESSION_TIERS,
  type TierRules,
  type ProgressionTier,
} from "@/lib/progression-tiers"
import { ConnectionMonitor } from "@/lib/connection-monitor"
import { WorkoutLogger, type WorkoutSession } from "@/lib/workout-logger"
import type { Exercise } from "@/lib/services/exercise-library-service"
import type { WorkoutLoggerProps } from "@/components/workout-logger/types"
import { ExerciseNotesService } from "@/lib/services/exercise-notes-service"
import { CustomRpeService } from "@/lib/services/custom-rpe-service"
import { ProgressionConfigService } from "@/lib/services/progression-config-service"
import { UserPreferenceService } from "@/lib/services/user-preference-service"
import type { ExerciseNote, RpeRirDisplayMode } from "@/lib/types/progression"

export function useWorkoutSession({ initialWorkout, onComplete, onCancel }: WorkoutLoggerProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const routerOneRepMaxes: any[] = []
  const [workout, setWorkout] = useState<WorkoutSession | null>(null)
  const [showNotesDialog, setShowNotesDialog] = useState(false)
  const [showSummaryDialog, setShowSummaryDialog] = useState(false)
  // showAddExerciseDialog removed - now using showExerciseLibrary with isAddingNewExercise flag
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

  // Exercise notes and RPE data
  const [exerciseNotesData, setExerciseNotesData] = useState<{ [exerciseId: string]: ExerciseNote }>({})
  const [customRpesData, setCustomRpesData] = useState<{ [exerciseId: string]: { [setNumber: number]: number } }>({})
  const [displayMode, setDisplayMode] = useState<RpeRirDisplayMode>('rir')
  const [blockLevelRpe, setBlockLevelRpe] = useState<number | undefined>()
  const [blockLevelRir, setBlockLevelRir] = useState<number | undefined>()

  // Bodyweight dialog state
  const [showBodyweightDialog, setShowBodyweightDialog] = useState(false)
  const [bodyweightExerciseId, setBodyweightExerciseId] = useState<string | null>(null)
  const [bodyweightInput, setBodyweightInput] = useState("")

  // Add set/exercise dialog state
  const [showAddSetDialog, setShowAddSetDialog] = useState(false)
  const [addSetExerciseId, setAddSetExerciseId] = useState<string | null>(null)
  const [addSetAfterSetId, setAddSetAfterSetId] = useState<string | null>(null)
  const [isAddingSet, setIsAddingSet] = useState(false)
  const [isAddingExercise, setIsAddingExercise] = useState(false)
  const [isAddingNewExercise, setIsAddingNewExercise] = useState(false) // Flag to distinguish add vs replace

  // Loading state for initial workout load / transitions
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(true)

  // Save exercise note callback
  const handleSaveExerciseNote = async (exerciseId: string, noteText: string, isPinned: boolean) => {
    if (!user?.id) return

    try {
      const activeProgram = await ProgramStateManager.getActiveProgram()
      if (!activeProgram) return

      // Find exercise in workout
      const exercise = workout?.exercises.find(ex => ex.id === exerciseId)
      if (!exercise) return

      // CRITICAL FIX: Use exerciseLibraryId which now contains the actual UUID from database
      const libraryId = exercise.exerciseLibraryId
      if (!libraryId) {
        console.error('[WorkoutLogger] Cannot save note: missing exercise library ID for', exercise.exerciseName)
        toast({
          title: "Error saving note",
          description: "Unable to save note: exercise library ID not found",
          variant: "destructive",
        })
        return
      }

      // Validate program instance ID
      if (!activeProgram.instanceId) {
        console.error('[WorkoutLogger] Cannot save note: missing program instance ID')
        toast({
          title: "Error saving note",
          description: "Unable to save note: program instance not found",
          variant: "destructive",
        })
        return
      }

      // Save note
      const savedNote = await ExerciseNotesService.saveNote(
        user.id,
        activeProgram.instanceId,
        libraryId,
        activeProgram.currentWeek,
        noteText,
        isPinned
      )

      // Update local state
      setExerciseNotesData(prev => ({
        ...prev,
        [exerciseId]: savedNote
      }))

      toast({
        title: "Note saved",
        description: isPinned ? "This note will repeat next week" : "Note saved for this week only",
      })
    } catch (error) {
      console.error('[WorkoutLogger] Failed to save exercise note:', error)
      toast({
        title: "Error saving note",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  // Save custom RPE callback
  const handleSaveCustomRpe = async (exerciseId: string, rpesBySet: { [setNumber: number]: number }) => {
    if (!user?.id) return

    try {
      const activeProgram = await ProgramStateManager.getActiveProgram()
      if (!activeProgram) return

      // Find exercise in workout
      const exercise = workout?.exercises.find(ex => ex.id === exerciseId)
      if (!exercise) return

      // CRITICAL FIX: Use exerciseLibraryId which now contains the actual UUID from database
      const libraryId = exercise.exerciseLibraryId
      if (!libraryId) {
        console.error('[WorkoutLogger] Cannot save RPE: missing exercise library ID for', exercise.exerciseName)
        toast({
          title: "Error saving RPE",
          description: "Unable to save RPE: exercise library ID not found",
          variant: "destructive",
        })
        return
      }

      // Validate program instance ID
      if (!activeProgram.instanceId) {
        console.error('[WorkoutLogger] Cannot save RPE: missing program instance ID')
        toast({
          title: "Error saving RPE",
          description: "Unable to save RPE: program instance not found",
          variant: "destructive",
        })
        return
      }

      // Save each set's RPE
      for (const [setNumberStr, rpeValue] of Object.entries(rpesBySet)) {
        const setNumber = parseInt(setNumberStr)
        await CustomRpeService.saveCustomRpe(
          user.id,
          activeProgram.instanceId,
          libraryId,
          activeProgram.currentWeek,
          setNumber,
          rpeValue
        )
      }

      // Update local state
      setCustomRpesData(prev => ({
        ...prev,
        [exerciseId]: rpesBySet
      }))

      toast({
        title: "RPE recorded",
        description: `Saved RPE for ${Object.keys(rpesBySet).length} set(s)`,
      })
    } catch (error) {
      console.error('[WorkoutLogger] Failed to save custom RPE:', error)
      toast({
        title: "Error saving RPE",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  const resolveCategory = (exerciseName: string): "compound" | "isolation" => {
    const name = exerciseName.toLowerCase()
    const compoundKeywords = [
      "squat",
      "deadlift",
      "press",
      "row",
      "pull-up",
      "chin-up",
      "dip",
      "lunge",
      "clean",
      "snatch",
      "thruster"
    ]

    return compoundKeywords.some((keyword) => name.includes(keyword)) ? "compound" : "isolation"
  }

  const resolveTierRules = (exercise: WorkoutSession["exercises"][number]): TierRules => {
    const tierName = (exercise as any).tier as ProgressionTier | undefined
    if (tierName && PROGRESSION_TIERS[tierName]) {
      return PROGRESSION_TIERS[tierName]
    }

    const category = resolveCategory(exercise.exerciseName)
    return getTierRules(exercise.exerciseName, category)
  }

  useEffect(() => {
    const initializeWorkoutData = async () => {
      // Use gentle load to avoid overwriting fresh local/native data after a completion
      await WorkoutLogger.ensureDatabaseLoaded(user?.id)

      console.log("===== STORAGE DEBUG =====")

      // Log in-progress workouts
      const inProgressRaw = localStorage.getItem("liftlog_in_progress_workouts")
      if (inProgressRaw) {
        const inProgressWorkouts = JSON.parse(inProgressRaw)
        console.log("IN-PROGRESS WORKOUTS:", inProgressWorkouts.length)
        inProgressWorkouts.forEach((w: WorkoutSession, idx: number) => {
          console.log(`In-Progress ${idx + 1}:`, {
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
        console.log("IN-PROGRESS WORKOUTS: None")
      }

      // Log workout history
      const historyRaw = localStorage.getItem("liftlog_workouts")
      if (historyRaw) {
        const historyWorkouts = JSON.parse(historyRaw)
        console.log("WORKOUT HISTORY:", historyWorkouts.length)
        historyWorkouts.forEach((w: WorkoutSession, idx: number) => {
          console.log(`History ${idx + 1}:`, {
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
        console.log("WORKOUT HISTORY: None")
      }

      console.log("===== END STORAGE DEBUG =====")

      // CRITICAL FIX: Wait for progress recalculation to complete before loading workout
      // This ensures currentWeek/currentDay are correct when component loads
      await ProgramStateManager.recalculateProgress({ silent: true })
      console.log("[MOUNT] Progress recalculation completed")

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
              console.log("Removing empty in-progress workout for week", inProgress.week, "day", inProgress.day)
              return false // Remove this workout
            }
          }

          return true // Keep this workout
        })

        if (cleanedInProgress.length !== inProgressWorkouts.length) {
          localStorage.setItem("liftlog_in_progress_workouts", JSON.stringify(cleanedInProgress))
          console.log(
            "Cleaned up",
            inProgressWorkouts.length - cleanedInProgress.length,
            "empty in-progress workouts",
          )
        }
      }
    }

    initializeWorkoutData()
  }, [])

  // Load user preference, exercise notes, and custom RPE data
  useEffect(() => {
    if (!user?.id || !workout) return

    const loadNotesAndRpeData = async () => {
      try {
        // Get active program for context
        const activeProgram = await ProgramStateManager.getActiveProgram()
        if (!activeProgram || !activeProgram.instanceId) {
          console.log('[WorkoutLogger] Active program or instanceId not available yet, skipping notes hydration')
          return
        }

        // Hydrate cache from Supabase on initial load
        // This loads all notes for the current program instance into localStorage
        await ExerciseNotesService.hydrateCache(user.id, activeProgram.instanceId)

        // Load user preference
        const preference = await UserPreferenceService.getRpeRirDisplayMode(user.id)
        setDisplayMode(preference)

        // Load exercise notes for current week
        const notes = await ExerciseNotesService.getNotesForWeek(
          user.id,
          activeProgram.instanceId,
          activeProgram.currentWeek
        )
        const notesMap: { [exerciseId: string]: ExerciseNote } = {}

        // Map notes by session exercise ID (not library ID)
        // Notes are stored with library ID, but we need to display them by session ID
        if (workout && notes.length > 0) {
          notes.forEach(note => {
            // Find the session exercise that corresponds to this library exercise
            const sessionExercise = workout.exercises.find(ex =>
              ex.exerciseLibraryId === note.exerciseId
            )
            if (sessionExercise) {
              notesMap[sessionExercise.id] = note
            }
          })
        }

        // Check for pinned notes from previous week and auto-create for current week
        if (workout && activeProgram.currentWeek > 1) {
          for (const exercise of workout.exercises) {
            const libraryId = exercise.exerciseLibraryId || exercise.id
            // Skip if we already have a note for this exercise this week
            if (notesMap[exercise.id]) continue

            // Check if there's a pinned note from previous week
            // NOTE: getPinnedNoteForWeek takes currentWeek (not currentWeek-1)
            // It internally calculates previousWeek = currentWeek - 1
            const pinnedNote = await ExerciseNotesService.getPinnedNoteForWeek(
              user.id,
              activeProgram.instanceId,
              libraryId,
              activeProgram.currentWeek
            )
            if (pinnedNote) {
              notesMap[exercise.id] = pinnedNote
            }
          }
        }

        setExerciseNotesData(notesMap)

        // Load custom RPEs for all exercises in current week
        const rpesByExercise: { [exerciseId: string]: { [setNumber: number]: number } } = {}
        for (const exercise of workout.exercises) {
          const exerciseRpes = await CustomRpeService.getExerciseRpesMapForWeek(
            user.id,
            activeProgram.instanceId,
            exercise.exerciseLibraryId,
            activeProgram.currentWeek
          )
          if (Object.keys(exerciseRpes).length > 0) {
            rpesByExercise[exercise.id] = exerciseRpes
          }
        }
        setCustomRpesData(rpesByExercise)

        // Get block-level progression
        const progression = ProgressionConfigService.getProgressionForWeek(
          activeProgram.templateMetadata?.weeks ?? 4,
          activeProgram.currentWeek
        )
        if (progression) {
          setBlockLevelRir(progression.rir)
          setBlockLevelRpe(progression.rpe)
        }
      } catch (error) {
        console.warn('[WorkoutLogger] Failed to load notes/RPE data:', error)
        // Gracefully continue - data is optional
      }
    }

    loadNotesAndRpeData()
  }, [user?.id, workout?.id])

  // Re-load notes/RPE when program state changes (e.g., week/day navigation)
  useEffect(() => {
    if (!user?.id || !workout) return

    const handleProgramChanged = () => {
      // Reload notes and RPE when week/day changes
      const loadNotesAndRpeData = async () => {
        try {
          const activeProgram = await ProgramStateManager.getActiveProgram()
          if (!activeProgram || !activeProgram.instanceId) {
            console.log('[WorkoutLogger] Active program or instanceId not available yet, skipping notes invalidation')
            return
          }

          // Invalidate cache when week changes - triggers fresh load from Supabase
          // This ensures we get pinned notes from previous week and auto-create them
          await ExerciseNotesService.invalidateCache(user.id, activeProgram.instanceId, activeProgram.currentWeek)

          // Load exercise notes for current week
          const notes = await ExerciseNotesService.getNotesForWeek(
            user.id,
            activeProgram.instanceId,
            activeProgram.currentWeek
          )
          const notesMap: { [exerciseId: string]: ExerciseNote } = {}

          // Map notes by session exercise ID (not library ID)
          // Notes are stored with library ID, but we need to display them by session ID
          if (workout && notes.length > 0) {
            notes.forEach(note => {
              // Find the session exercise that corresponds to this library exercise
              const sessionExercise = workout.exercises.find(ex =>
                ex.exerciseLibraryId === note.exerciseId
              )
              if (sessionExercise) {
                notesMap[sessionExercise.id] = note
              }
            })
          }

          // Check for pinned notes from previous week and auto-create for current week
          if (workout && activeProgram.currentWeek > 1) {
            for (const exercise of workout.exercises) {
              const libraryId = exercise.exerciseLibraryId || exercise.id
              // Skip if we already have a note for this exercise this week
              if (notesMap[exercise.id]) continue

              // Check if there's a pinned note from previous week
              const pinnedNote = await ExerciseNotesService.getPinnedNoteForWeek(
                user.id,
                activeProgram.instanceId,
                libraryId,
                activeProgram.currentWeek
              )
              if (pinnedNote) {
                notesMap[exercise.id] = pinnedNote
              }
            }
          }

          setExerciseNotesData(notesMap)

          // Load custom RPEs for all exercises in current week
          const rpesByExercise: { [exerciseId: string]: { [setNumber: number]: number } } = {}
          for (const exercise of workout.exercises) {
            const exerciseRpes = await CustomRpeService.getExerciseRpesMapForWeek(
              user.id,
              activeProgram.instanceId,
              exercise.exerciseLibraryId,
              activeProgram.currentWeek
            )
            if (Object.keys(exerciseRpes).length > 0) {
              rpesByExercise[exercise.id] = exerciseRpes
            }
          }
          setCustomRpesData(rpesByExercise)
        } catch (error) {
          console.warn('[WorkoutLogger] Failed to reload notes/RPE on week change:', error)
        }
      }

      loadNotesAndRpeData()
    }

    window.addEventListener('programChanged', handleProgramChanged)
    return () => {
      window.removeEventListener('programChanged', handleProgramChanged)
    }
  }, [user?.id, workout])

  useEffect(() => {
    const loadProgramData = async () => {
      // First, check raw localStorage data
      console.log("💾 RAW LOCALSTORAGE CHECK:", {
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
        setProgramName(activeProgram.templateMetadata?.name || 'My Program')
      }

      const existingWorkout = await WorkoutLogger.getCurrentWorkout()
      if (existingWorkout) {
        console.log("📥 COMPONENT LOAD - Existing workout from localStorage:", {
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
          "🔄 MOUNT - In-progress workout needs progression refresh, recalculating..."
        )

        const scheduleKeys = Object.keys(activeProgram.template.schedule)
        const inferredDayKey =
          typeof existingWorkout.day === "number" && existingWorkout.day > 0
            ? `day${existingWorkout.day}`
            : undefined
        const dayKey =
          inferredDayKey && activeProgram?.template?.schedule?.[inferredDayKey]
            ? inferredDayKey
            : scheduleKeys[existingWorkout.day ? existingWorkout.day - 1 : 0]

        const workoutDay = dayKey
          ? activeProgram?.template?.schedule?.[dayKey]
          : undefined

        if (workoutDay?.exercises?.length) {
          const refreshedExercises = await Promise.all(existingWorkout.exercises.map(async (exercise) => {
            const templateExercise = workoutDay.exercises.find(
              (te) =>
                te.exerciseName === exercise.exerciseName ||
                te.id === exercise.exerciseId
            )

            if (!templateExercise) {
              console.log(
                "MOUNT - Template exercise not found for:",
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
                "MOUNT - No previous performance for:",
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

            const result = await ProgressionRouter.calculateProgression(progressionInput)

            console.log("MOUNT - Refreshed progression for", exercise.exerciseName, {
              suggestedWeight: result.targetWeight,
              progressionNote: result.progressionNote,
            })

            const suggestedWeight = result.targetWeight ?? 0

            // Extract default reps from templateRecommendedReps string (e.g., "8-10" -> 8)
            // NOTE: This is NOT used for pre-filling sets anymore
            const defaultReps = result.templateRecommendedReps
              ? parseInt(result.templateRecommendedReps.toString().split('-')[0]) || 0
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
          }))

          const refreshedWorkout = {
            ...existingWorkout,
            exercises: refreshedExercises,
          }

          WorkoutLogger.saveCurrentWorkout(refreshedWorkout, user?.id)
            .then(() => {
              console.log(
                "MOUNT - Saved refreshed workout with updated progression"
              )
            })
            .catch((error) => {
              console.error("MOUNT - Failed to save refreshed workout:", error)
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

      console.log("Checking if workout should be blocked:", {
        existingWorkoutWeek: existingWorkout.week,
        activeProgramWeek: week,
        activeProgramDay: day,
      })

      if (week && day && existingWorkout.week && existingWorkout.week > week) {
        // Workout from a future week - check if current week is complete
        const scheduleKeys = Object.keys(activeProgram.template.schedule)
        const daysPerWeek = scheduleKeys.length
        const isCurrentWeekCompleted = WorkoutLogger.isWeekCompleted(
          week,
          daysPerWeek,
          user?.id,
          activeProgram?.instanceId
        )
        const weeksAhead = existingWorkout.week - week

        if (!isCurrentWeekCompleted) {
          setIsWorkoutBlocked(true)
          setIsFullyBlocked(weeksAhead >= 2)
          setBlockedMessage("No data from previous week")
          console.log("Workout blocked - current week not completed, weeksAhead:", weeksAhead)
        } else {
          setIsWorkoutBlocked(false)
          setIsFullyBlocked(false)
          setBlockedMessage("")
          console.log("Workout not blocked - current week completed")
        }
      } else {
        setIsWorkoutBlocked(false)
        setIsFullyBlocked(false)
        setBlockedMessage("")
        console.log("Workout not blocked - current or past week")
        }
      } else if (initialWorkout) {
        const activeProgram = await ProgramStateManager.getActiveProgram()
        const week = activeProgram?.currentWeek
        const day = activeProgram?.currentDay

        const newWorkout = await WorkoutLogger.startWorkout(initialWorkout.name, initialWorkout.exercises, week, day, user?.id)
        console.log("🆕 COMPONENT NEW WORKOUT - Created from initialWorkout:", {
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
        console.log("No existing workout or initialWorkout, loading current workout from program")
        const currentWorkout = await ProgramStateManager.getCurrentWorkout()
        
        if (!currentWorkout) {
          console.warn("No current workout available from program - this is normal if no active program exists")
          setIsLoadingWorkout(false)
          return
        }

        const activeProgram = await ProgramStateManager.getActiveProgram()
        const week = activeProgram?.currentWeek
        const day = activeProgram?.currentDay

        const newWorkout = await WorkoutLogger.startWorkout(currentWorkout.name, currentWorkout.exercises, week, day, user?.id)
        console.log("🆕 COMPONENT NEW WORKOUT - Created from current program workout:", {
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
      // Mark loading complete after all paths have been checked
      setIsLoadingWorkout(false)
    }
    
    loadProgramData()
  }, [initialWorkout])

  // Listen for program state changes
  useEffect(() => {
    console.log("[useWorkoutSession] Setting up programChanged event listener")
    
    const handleProgramChange = async () => {
      console.log("[handleProgramChange] Event received, reloading workout...")
      
      // Set loading state to prevent "No workout to log" flash during transition
      setIsLoadingWorkout(true)

      // CRITICAL FIX: Force refresh program state from database to avoid using stale cached data
      // This ensures we get the LATEST week/day after workout completion
      const activeProgram = await ProgramStateManager.getActiveProgram({ refreshTemplate: false, skipDatabaseLoad: false })

      console.log("[handleProgramChange] Program state after refresh:", JSON.stringify({
        currentWeek: activeProgram?.currentWeek,
        currentDay: activeProgram?.currentDay,
        completedWorkouts: activeProgram?.completedWorkouts,
        progress: activeProgram?.progress,
        timestamp: new Date().toISOString()
      }))

      if (activeProgram) {
        setProgramName(activeProgram.templateMetadata?.name || 'My Program')

        const week = activeProgram.currentWeek
        const day = activeProgram.currentDay

        // CLEANUP FIX: Clear orphaned in-progress workouts from previous weeks
        // This prevents loading stale workouts when advancing to a new week
        if (workout && workout.week && workout.week < week) {
          console.log(`Clearing orphaned in-progress workouts from week ${workout.week} (now on week ${week})`)
          await WorkoutLogger.clearInProgressWorkoutsForWeek(workout.week, user?.id)
        }

        // CRITICAL FIX: Check if an in-progress workout already exists for the current week/day
        // before creating a new one. This prevents loading the wrong day after completion.
        const existingInProgress = await WorkoutLogger.getInProgressWorkout(week, day, user?.id)

        if (existingInProgress) {
          console.log("[handleProgramChange] Found existing in-progress workout for week", week, "day", day, "- using it instead of creating new one")
          setWorkout(existingInProgress)
          setIsWorkoutBlocked(false)
          setIsFullyBlocked(false)
          setBlockedMessage("")
          setIsLoadingWorkout(false)
          return
        }

        // No existing workout found - create a new one from program template
        const currentWorkout = await ProgramStateManager.getCurrentWorkout()
        if (currentWorkout) {
          const newWorkout = await WorkoutLogger.startWorkout(currentWorkout.name, currentWorkout.exercises, week, day, user?.id)
          console.log("[handleProgramChange] Loaded new workout after program change:", JSON.stringify({
            week,
            day,
            workoutName: newWorkout.workoutName,
            exerciseCount: newWorkout.exercises.length,
          }))
          // Only update state after new workout is fully loaded (prevents "No Workout" flash)
          setWorkout(newWorkout)
          setIsWorkoutBlocked(false)
          setIsFullyBlocked(false)
          setBlockedMessage("")
        }
      }
      
      // Mark loading complete
      setIsLoadingWorkout(false)
    }

    window.addEventListener("programChanged", handleProgramChange)
    return () => window.removeEventListener("programChanged", handleProgramChange)
  }, [user?.id])

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

    // Validate input: ensure non-negative and within bounds (0-1000)
    let validatedValue = value
    if (validatedValue < 0 || !Number.isFinite(validatedValue)) {
      validatedValue = 0
    } else if (validatedValue > 1000) {
      validatedValue = 1000
    }

    console.log("handleSetUpdate called:", { exerciseId, setId, field, value: validatedValue, isWorkoutBlocked })

    const exercise = workout.exercises.find((ex) => ex.id === exerciseId)
    if (!exercise) return

    const volumeKey = `${exerciseId}_${setId}`
    const currentSet = exercise.sets.find((s) => s.id === setId)

    let calculatedAdjustedReps: number | undefined
    let shouldClearReps = false
    let compensationDetails: { adjustedReps: number; strategy: string; message?: string } | null = null

    if (field === "weight") {
      if (exercise.suggestedWeight) {
        const tierRules = resolveTierRules(exercise)
        const withinBounds = isWeightWithinBounds(
          validatedValue,
          exercise.suggestedWeight,
          tierRules.adjustmentBounds
        )

        if (!withinBounds) {
          console.log("Weight out of bounds, marking as override")
          setUserOverrides((prev) => ({ ...prev, [exerciseId]: true }))

          const { min: minBound, max: maxBound } = calculateWeightBounds(
            exercise.suggestedWeight,
            tierRules.adjustmentBounds
          )

          shouldClearReps = true

          const message =
            Number.isFinite(minBound) && Number.isFinite(maxBound)
              ? `Weight outside recommended range (${minBound.toFixed(1)} - ${maxBound.toFixed(1)}). Adjust load to continue.`
              : "Weight outside recommended range. Adjust load to continue."

          compensationDetails = {
            adjustedReps: 0,
            strategy: "out_of_bounds",
            message,
          }
        } else {
          // FIX: Don't use currentSet.reps if it's 0 or 1 (likely from a previous bad calculation)
          // Use a sensible default of 8 reps for volume compensation baseline
          const DEFAULT_BASELINE_REPS = 8
          const currentReps = currentSet?.reps ?? 0
          const baseReps = currentReps >= 3 ? currentReps : DEFAULT_BASELINE_REPS
          
          const suggestedWeight = exercise.suggestedWeight || 0
          const targetVolume = suggestedWeight * baseReps

          // DEBUG: Log volume compensation inputs for diagnosing reps reset issue
          console.log("[handleSetUpdate] Volume compensation inputs:", {
            exerciseName: exercise.exerciseName,
            suggestedWeight,
            baseReps,
            targetVolume,
            newWeight: validatedValue,
            currentSetReps: currentSet?.reps,
            usedDefaultBaseline: currentReps < 3,
          })

          // Safety check: If suggestedWeight is 0 or undefined, don't adjust reps
          if (!suggestedWeight || targetVolume <= 0) {
            console.warn("[handleSetUpdate] No valid suggestedWeight - preserving current reps")
            // Preserve current reps if valid, otherwise use the default baseline
            calculatedAdjustedReps = currentReps >= 1 ? currentReps : DEFAULT_BASELINE_REPS
            compensationDetails = {
              adjustedReps: calculatedAdjustedReps,
              strategy: "volume_compensated",
              message: undefined,
            }
          } else {
            const compensation = calculateVolumeCompensation(
              targetVolume,
              validatedValue,
              baseReps,
              tierRules.maxRepAdjustment
            )

            console.log("[handleSetUpdate] Volume compensation result:", {
              adjustedReps: compensation.adjustedReps,
              strategy: compensation.strategy,
              message: compensation.message,
            })

            // FIX: Ensure adjusted reps never drops below 3 (avoid 1-2 rep anomalies from bad math)
            calculatedAdjustedReps = Math.max(3, compensation.adjustedReps)
            compensationDetails = {
              adjustedReps: calculatedAdjustedReps,
              strategy: compensation.strategy,
              message: compensation.message,
            }
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
      if (compensation && validatedValue !== compensation.adjustedReps) {
        // User manually overrode the volume-compensated reps
        console.log("Manual reps override detected")
        setUserOverrides(prev => ({ ...prev, [exerciseId]: true }))
      }
    }

    console.log("Current workout before update:", {
      id: workout.id,
      exerciseCount: workout.exercises.length,
    })

    // Update with skipDbSync=true to only save to localStorage
    const updateSetAsync = async () => {
      const updates: any = { [field]: validatedValue }
      
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
      
      const updatedWorkout = await WorkoutLogger.updateSet(
        workout,
        exerciseId,
        setId,
        updates,
        user?.id,
        true
      ) // Skip DB sync initially

      console.log("updatedWorkout returned:", updatedWorkout ? "exists" : "null")

      if (updatedWorkout) {
        const exercise = updatedWorkout.exercises.find((ex) => ex.id === exerciseId)
        const set = exercise?.sets.find((s) => s.id === setId)
        console.log("Updated set value:", {
          exerciseId,
          setId,
          field,
          newValue: set?.[field],
          setObject: set,
        })

        setWorkout(updatedWorkout)
        console.log("setWorkout called with updated workout")

        // Debounce database sync for 500ms
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }

        debounceTimerRef.current = setTimeout(() => {
          console.log("Debounced sync triggered for weight/reps update")
          if (ConnectionMonitor.isOnline()) {
            WorkoutLogger.saveCurrentWorkout(updatedWorkout, user?.id)
              .catch((error: unknown) => {
                // Handle 409 conflicts gracefully - they just mean the record already exists
                if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.includes('409')) {
                  console.log("Workout already exists in database (this is normal)")
                } else {
                  console.error("Failed to sync workout to database:", error)
                }
              })
          } else {
            // Queue sync for when connection is restored
            ConnectionMonitor.addToQueue(async () => {
              try {
                await WorkoutLogger.saveCurrentWorkout(updatedWorkout, user?.id)
              } catch (error: unknown) {
                if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.includes('409')) {
                  console.log("Workout already exists in database (this is normal)")
                } else {
                  console.error("Failed to sync queued workout:", error)
                }
              }
            })
          }
        }, 500)
      } else {
        console.log("ERROR: updatedWorkout is null, not updating state")
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
      const tierRules = resolveTierRules(exercise)
      const withinBounds = isWeightWithinBounds(
        activeSet.weight,
        exercise.suggestedWeight,
        tierRules.adjustmentBounds
      )

      if (!withinBounds) {
        const { min, max } = calculateWeightBounds(exercise.suggestedWeight, tierRules.adjustmentBounds)
        setOutOfBoundsExercises(prev => ({
          ...prev,
          [exerciseId]: { 
            min,
            max,
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
    const equipmentType = exercise?.equipmentType?.toLowerCase() || ""
    const isBodyweightExercise = equipmentType.startsWith("bodyweight") && !equipmentType.includes("loadable")

    // Validation: Don't allow completing empty sets unless bodyweight exercise
    if (
      willMarkComplete &&
      !isBodyweightExercise &&
      (!set.weight || set.weight <= 0 || !set.reps || set.reps <= 0)
    ) {
      return
    }

    // OPTIMISTIC: Update UI immediately without waiting for database sync
    // This gives instant feedback to the user (sets mark/unmark instantly)
    // Database sync happens in background with automatic retry if offline
    const updatedWorkout = JSON.parse(JSON.stringify(workout)) as WorkoutSession
    const updatedExercise = updatedWorkout.exercises.find((ex) => ex.id === exerciseId)
    const updatedSet = updatedExercise?.sets.find((s) => s.id === setId)

    if (updatedSet) {
      updatedSet.completed = !set.completed
      updatedExercise!.completed = updatedExercise!.sets.every((s) => s.completed)
      setWorkout(updatedWorkout)

      // Check bounds for next set immediately after completing a set
      checkExerciseBoundsStatus(exerciseId)

      // Check if exercise is done and next exercise is bodyweight-only
      if (updatedExercise!.completed) {
        checkForBodyweightExercise(exerciseId)
      }
    }

    // BACKGROUND: Persist to storage and queue database sync
    // This happens silently without blocking the UI or showing toasts
    try {
      const persistedWorkout = await WorkoutLogger.updateSet(
        updatedWorkout,
        exerciseId,
        setId,
        { completed: !set.completed },
        user?.id,
        true  // skipDbSync - we'll queue it with connection logic
      )

      if (persistedWorkout && willMarkComplete) {
        // Log set completion to database, but queue if offline
        // Get the updated set data to log
        const persistedExercise = persistedWorkout.exercises.find((ex) => ex.id === exerciseId)
        const updatedSet = persistedExercise?.sets.find((s) => s.id === setId)

        if (persistedExercise && updatedSet) {
          // Calculate set number from array index (1-indexed)
          const setNumber = persistedExercise.sets.findIndex((s) => s.id === setId) + 1

          if (ConnectionMonitor.isOnline()) {
            WorkoutLogger.logSetCompletion(
              persistedWorkout.id,
              exerciseId,
              persistedExercise.exerciseName,  // FIX: was exercise.name
              setNumber,              // FIX: calculate from index, not updatedSet.number
              updatedSet.reps,
              updatedSet.weight,
              true,
              user?.id,
              persistedWorkout.week,
              persistedWorkout.day
            ).catch((error) => {
              console.error('[WorkoutLogger] Failed to log set completion:', error)
              // Silently queue for retry - user sees success in UI already
            })
          } else {
            // Queue for sync when online
            ConnectionMonitor.addToQueue(async () => {
              await WorkoutLogger.logSetCompletion(
                persistedWorkout.id,
                exerciseId,
                exercise.exerciseName,  // FIX: was exercise.name
                setNumber,              // FIX: calculate from index, not updatedSet.number
                updatedSet.reps,
                updatedSet.weight,
                true,
                user?.id,
                persistedWorkout.week,
                persistedWorkout.day
              )
            })
          }
        }
      }
    } catch (error) {
      console.error('[WorkoutLogger] Failed to persist set update:', error)
      // Revert optimistic update only on critical errors
      setWorkout(workout)
    }
  }

  // Handle bodyweight input and fill all sets for bodyweight exercise
  const handleSaveBodyweight = async (bodyweight: number) => {
    if (!workout || !bodyweightExerciseId) return

    try {
      const updatedWorkout = JSON.parse(JSON.stringify(workout)) as WorkoutSession
      const exercise = updatedWorkout.exercises.find((ex) => ex.id === bodyweightExerciseId)

      if (!exercise) return

      // Fill all incomplete sets with the bodyweight value
      for (const set of exercise.sets) {
        if (!set.completed) {
          set.weight = bodyweight
        }
      }

      setWorkout(updatedWorkout)

      // Persist to storage
      try {
        await WorkoutLogger.saveCurrentWorkout(updatedWorkout, user?.id)
      } catch (error) {
        console.error('[WorkoutLogger] Failed to persist bodyweight update:', error)
      }

      // Save bodyweight to user profile if it's new
      if (user && (!user.bodyweight || user.bodyweight !== bodyweight)) {
        try {
          const { AuthService } = await import('@/lib/auth')
          await AuthService.updateProfile(user.id, { bodyweight })
        } catch (error) {
          console.error('[WorkoutLogger] Failed to save bodyweight to profile:', error)
        }
      }

      // Close dialog and reset
      setShowBodyweightDialog(false)
      setBodyweightExerciseId(null)
      setBodyweightInput("")
    } catch (error) {
      console.error('[WorkoutLogger] Error saving bodyweight:', error)
    }
  }

  // Check if next exercise is bodyweight-only and show dialog if needed
  const checkForBodyweightExercise = (currentExerciseId: string) => {
    if (!workout) return

    const currentIndex = workout.exercises.findIndex((ex) => ex.id === currentExerciseId)
    if (currentIndex === -1 || currentIndex === workout.exercises.length - 1) return

    const nextExercise = workout.exercises[currentIndex + 1]

    // Check if next exercise is bodyweight only
    const equipmentType = nextExercise?.equipmentType?.toLowerCase() || ""
    const isPureBodyweight =
      equipmentType.startsWith("bodyweight") && !equipmentType.includes("loadable")

    if (nextExercise && isPureBodyweight) {
      setBodyweightExerciseId(nextExercise.id)
      // Prefill with user's saved bodyweight if available
      if (user?.bodyweight) {
        setBodyweightInput(user.bodyweight.toString())
      }
      setShowBodyweightDialog(true)
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

      // Step 1: Save workout with notes
      await WorkoutLogger.saveCurrentWorkout(workoutWithNotes, user?.id)

      // Step 1.5: Flush any pending debounced saves to ensure set completion flags are persisted
      // This is critical - the UI state has all sets marked as completed, but the pending debounce
      // might not have written them to localStorage yet
      await WorkoutLogger.flushPendingWorkoutSave()

      // Step 2: Check if already completed BEFORE completing
      const wasAlreadyCompleted = WorkoutLogger.hasCompletedWorkout(workout.week || 1, workout.day || 1, user?.id)

      // Step 3: Complete the workout (moves to history)
      // Pass the workout data directly to ensure we use the latest set completion flags
      // This is critical for progression calculations in the next week
      const completedWorkout = await WorkoutLogger.completeWorkout(workoutWithNotes.id, user?.id, workoutWithNotes)

      if (completedWorkout) {
        // Validate that the completed workout has proper data
        const hasValidData = completedWorkout.exercises &&
                           completedWorkout.exercises.length > 0 &&
                           completedWorkout.exercises.every(ex => ex.sets && ex.sets.length > 0)

        if (!hasValidData) {
          console.error("Completed workout has invalid data, not proceeding with program advancement")
          setIsCompletingWorkout(false)
          return
        }

        // Step 4: Advance program ONLY if not already completed
        if (!wasAlreadyCompleted) {
          await ProgramStateManager.completeWorkout(user?.id)
        }

        // Step 5: Start database sync in background (non-blocking)
        // Data is already safe in localStorage, so UI can proceed immediately
        if (user?.id) {
          // Fire-and-forget background sync
          // Promise keeps running even if component unmounts
          WorkoutLogger.syncToDatabase(user.id)
            .then(() => {
              console.log("[handleCompleteWorkout] Background database sync completed")
            })
            .catch((error) => {
              console.error("[handleCompleteWorkout] Background sync failed (will retry):", error)
              // ConnectionMonitor will retry automatically
            })
        }

        // Step 6: Dispatch events IMMEDIATELY (optimistic UI)
        // Data is safe in localStorage, sync happens in background

        // Dispatch workout completed event
        window.dispatchEvent(new CustomEvent("workoutCompleted", {
          detail: {
            week: completedWorkout.week,
            day: completedWorkout.day,
            completed: true
          }
        }))

        // Dispatch program changed event (triggers navigation to next workout)
        window.dispatchEvent(new Event("programChanged"))

        // Step 7: Show completion dialog immediately
        setCompletedWorkout(completedWorkout)
        setShowCompletionDialog(true)

        console.log("[handleCompleteWorkout] Workout completion flow completed (sync in background)")
      }
    } catch (error) {
      console.error("Error completing workout:", error)
      // Show error to user if workout completion fails
      toast({
        title: 'Failed to complete workout',
        description: 'Please try again. If the problem persists, your progress is saved locally.',
        variant: 'destructive',
      })
    } finally {
      setIsCompletingWorkout(false)
    }
  }

  const handleCompletionDialogClose = () => {
    setShowCompletionDialog(false)
    setCompletedWorkout(null)
    
    // The new workout was already loaded by handleProgramChange when 
    // handleCompleteWorkout dispatched the programChanged event.
    // Do NOT call onComplete() - it causes a component remount that races
    // with data persistence and results in empty/stale state.
    if (programWasEnded) {
      setProgramWasEnded(false)
    }
    
    console.log("[handleCompletionDialogClose] Dialog closed, workout already loaded")
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
    if (!workout || endWorkoutConfirmation.toLowerCase() !== "end workout") return

    // Show loading state and disable button to prevent double-clicks
    setIsCompletingWorkout(true)

    try {
      // Mark all uncompleted sets as skipped and completed
      const updatedWorkout: WorkoutSession = {
        ...workout,
        exercises: workout.exercises.map((exercise) => ({
          ...exercise,
          completed: true, // Mark exercise as completed
          sets: exercise.sets.map((set) => {
            if (!set.completed) {
              // Mark incomplete sets as skipped with completed=true
              return { ...set, completed: true, reps: 0, weight: 0, skipped: true }
            }
            return set
          }),
        })),
      }

      setWorkout(updatedWorkout)
      await WorkoutLogger.saveCurrentWorkout(updatedWorkout, user?.id)

      // Check if workout was already completed BEFORE we complete it
      const wasAlreadyCompleted = WorkoutLogger.hasCompletedWorkout(workout.week || 1, workout.day || 1, user?.id)

      // Flush any pending saves to ensure all data is persisted before completing
      await WorkoutLogger.flushPendingWorkoutSave()

      // COMPLETE the workout (moves to history and advances program)
      // CRITICAL: Pass updatedWorkout directly to ensure we use the latest state with skipped sets
      const completedWorkout = await WorkoutLogger.completeWorkout(updatedWorkout.id, user?.id, updatedWorkout)

      if (!completedWorkout) {
        console.error("[handleEndWorkout] Failed to complete workout. WorkoutID:", updatedWorkout.id, "UserID:", user?.id)
        toast({
          title: "Error",
          description: "Failed to end workout. Please try again.",
          variant: "destructive",
        })
        return
      }

      // Always advance program to next workout and log before/after states for debugging
      const programBeforeAdvance = await ProgramStateManager.getActiveProgram({ refreshTemplate: false, skipDatabaseLoad: false })
      console.log("[handleEndWorkout] Program before advance:", JSON.stringify({
        wasAlreadyCompleted,
        currentWeek: programBeforeAdvance?.currentWeek,
        currentDay: programBeforeAdvance?.currentDay,
        completedWorkouts: programBeforeAdvance?.completedWorkouts,
        progress: programBeforeAdvance?.progress,
      }))

      await ProgramStateManager.completeWorkout(user?.id)

      const programAfterAdvance = await ProgramStateManager.getActiveProgram({ refreshTemplate: false, skipDatabaseLoad: false })
      console.log("[handleEndWorkout] Program after advance:", JSON.stringify({
        currentWeek: programAfterAdvance?.currentWeek,
        currentDay: programAfterAdvance?.currentDay,
        completedWorkouts: programAfterAdvance?.completedWorkouts,
        progress: programAfterAdvance?.progress,
      }))

      // Start database sync in background (non-blocking)
      // Data is already safe in localStorage, so navigation can proceed immediately
      if (user?.id) {
        // Fire-and-forget background sync
        // Promise keeps running even if component unmounts
        WorkoutLogger.syncToDatabase(user.id)
          .then(() => {
            console.log("[handleEndWorkout] Background database sync completed")
          })
          .catch((error) => {
            console.error("[handleEndWorkout] Background sync failed (will retry):", error)
            // ConnectionMonitor will retry automatically
          })
      }

      // Close the "End Workout" confirmation dialog
      setShowEndWorkoutDialog(false)
      setEndWorkoutConfirmation("")
      
      // Dispatch workout completed event for calendar updates
      window.dispatchEvent(new CustomEvent("workoutCompleted", {
        detail: {
          week: completedWorkout.week,
          day: completedWorkout.day,
          completed: true
        }
      }))
      
      // Show the completion dialog with workout summary
      setCompletedWorkout(completedWorkout)
      setShowCompletionDialog(true)
      
      console.log("[handleEndWorkout] Workout ended, showing completion dialog, wasAlreadyCompleted:", wasAlreadyCompleted)
    } finally {
      setIsCompletingWorkout(false)
    }
  }

  const handleEndProgram = async () => {
    if (!workout || endProgramConfirmation.toLowerCase() !== "end program") return

    const activeProgram = await ProgramStateManager.getActiveProgram()
    if (!activeProgram) {
      console.error("[handleEndProgram] No active program found")
      return
    }

    try {
      // Show immediate loading state for user feedback
      setIsCompletingWorkout(true)

      const wasAlreadyCompleted = WorkoutLogger.hasCompletedWorkout(
        activeProgram.currentWeek,
        activeProgram.currentDay,
        user?.id
      )

      // STEP 1: Complete current workout immediately (what user sees)
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
      console.log("[handleEndProgram] Saving workout with ID:", updatedWorkout.id, "userId:", user?.id)
      await WorkoutLogger.saveCurrentWorkout(updatedWorkout, user?.id)

      // Flush any pending saves to ensure all data is persisted before completing
      await WorkoutLogger.flushPendingWorkoutSave()

      console.log("[handleEndProgram] Attempting to complete workout with ID:", updatedWorkout.id, "userId:", user?.id)
      // CRITICAL: Pass updatedWorkout directly to ensure we use the latest state
      const completedWorkout = await WorkoutLogger.completeWorkout(updatedWorkout.id, user?.id, updatedWorkout)
      if (!completedWorkout) {
        console.error("[handleEndProgram] Failed to complete current workout. WorkoutID:", updatedWorkout.id, "UserID:", user?.id)
        toast({
          title: "Error",
          description: "Failed to complete workout. Please try again.",
          variant: "destructive",
        })
        return
      }
      console.log("[handleEndProgram] Successfully completed workout")

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

      // STEP 2: Show immediate success dialog to user
      setIsCompletingWorkout(false)
      setShowEndProgramDialog(false)
      setEndProgramConfirmation("")
      
      // Show success dialog immediately
      toast({
        title: 'Program ended',
        description: 'Marking remaining workouts as completed in the background...',
      })

      // STEP 3: Finalize program state BEFORE dispatching event
      // CRITICAL: Must await to ensure database cleanup completes before UI navigates
      try {
        await finalizeProgramState(user?.id)
        console.log("[handleEndProgram] Program state finalized successfully")
      } catch (error) {
        console.error("[handleEndProgram] Failed to finalize program state:", error)
        toast({
          title: 'Program state error',
          description: 'Please refresh and check your program status.',
          variant: 'destructive'
        })
        // Don't return - still attempt to navigate even if finalization fails
      }

      // STEP 4: Process remaining workouts in background (after state is cleared)
      // This happens without blocking the user
      processRemainingWorkoutsInBackground(activeProgram, user?.id).catch(error => {
        console.error("[handleEndProgram] Background processing failed:", error)
        toast({
          title: 'Background processing error',
          description: 'Some workouts may not be marked as completed. Please check your program history.',
          variant: 'destructive'
        })
      })

      // STEP 5: Clear the active program and navigate immediately
      setWorkout(null)

      // Dispatch programEnded event to trigger train section navigation
      // Now safe to dispatch - program is fully cleared from database
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('programEnded'))
      }

      // Call onCancel to close the workout logger and return to train view
      onCancel?.()
    } catch (error) {
      console.error("Failed to end program:", error)
      setEndProgramConfirmation("")
      setShowEndProgramDialog(false)
      setIsCompletingWorkout(false)
      toast({
        title: 'Failed to end program',
        description: 'Please try again.',
        variant: 'destructive'
      })
    }
  }

  // Background processing function for remaining workouts
  const processRemainingWorkoutsInBackground = async (activeProgram: any, userId?: string) => {
    if (!activeProgram) return

    console.log("[processRemainingWorkoutsInBackground] Starting background processing")
    
    const template = activeProgram.template
    const templateWeekCount = template.weeks || 6
    const scheduleKeys = Object.keys(template.schedule).sort((a, b) => {
      const numA = Number.parseInt(a.replace(/[^0-9]/g, ""), 10)
      const numB = Number.parseInt(b.replace(/[^0-9]/g, ""), 10)
      return numA - numB
    })
    const daysPerWeek = scheduleKeys.length
    const currentWeek = activeProgram.currentWeek
    const currentDay = activeProgram.currentDay

    // Collect all workouts to skip in this program run
    const workoutsToSkip: Array<{
      templateDay: any
      week: number
      day: number
      userId?: string
      templateId?: string
      programInstanceId?: string
      workoutName: string
    }> = []

    // Calculate remaining workouts from current position
    for (let week = currentWeek; week <= templateWeekCount; week++) {
      let dayStart: number
      
      if (week === currentWeek) {
        // Current week: start from the day after current day
        dayStart = currentDay + 1
      } else {
        // Future weeks: start from day 1
        dayStart = 1
      }

      if (dayStart > daysPerWeek) {
        continue // No days to process in this week
      }

      for (let dayNumber = dayStart; dayNumber <= daysPerWeek; dayNumber++) {
        // Check if workout is already completed
        if (WorkoutLogger.hasCompletedWorkout(week, dayNumber, userId, activeProgram.instanceId)) {
          continue // Skip already completed workouts
        }

        const dayKey = scheduleKeys[dayNumber - 1]
        const templateDay = template.schedule[dayKey]
        if (!templateDay) {
          console.warn(`[processRemainingWorkoutsInBackground] No template found for day ${dayKey}`)
          continue
        }

        workoutsToSkip.push({
          templateDay,
          week,
          day: dayNumber,
          userId,
          templateId: activeProgram.templateId,
          programInstanceId: activeProgram.instanceId,
          workoutName: templateDay.name,
        })
      }
    }

    console.log(`[processRemainingWorkoutsInBackground] Found ${workoutsToSkip.length} workouts to skip`)

    // Process workouts in batches to avoid overwhelming the database
    const batchSize = 5
    for (let i = 0; i < workoutsToSkip.length; i += batchSize) {
      const batch = workoutsToSkip.slice(i, i + batchSize)
      
      console.log(`[processRemainingWorkoutsInBackground] Processing batch ${Math.floor(i/batchSize)+1}/${Math.ceil(workoutsToSkip.length/batchSize)}`)
      
      try {
        // Process all workouts in this batch concurrently
        await Promise.all(batch.map(async (workoutData) => {
          await WorkoutLogger.skipWorkout(workoutData)
          return workoutData
        }))

        // Small delay between batches to prevent overwhelming
        if (i + batchSize < workoutsToSkip.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.error(`[processRemainingWorkoutsInBackground] Batch ${Math.floor(i/batchSize)+1} failed:`, error)
        // Continue with next batch even if current batch fails
      }
    }

    // Final sync to ensure all data is persisted
    if (userId) {
      try {
        await WorkoutLogger.syncToDatabase(userId)
        console.log("[processRemainingWorkoutsInBackground] Final database sync completed")
      } catch (error) {
        console.error("[processRemainingWorkoutsInBackground] Final sync failed:", error)
      }
    }

    console.log("[processRemainingWorkoutsInBackground] Background processing completed")
  }

  // Finalize program state (clear program, etc.)
  const finalizeProgramState = async (userId?: string) => {
    try {
      // Sync any remaining data first
      if (userId) {
        await WorkoutLogger.syncToDatabase(userId)
      }

      // Finalize the active program (this clears storage on both native SQLite AND localStorage)
      // NOTE: No need to call clearActiveProgram() separately - finalizeActiveProgram handles it
      await ProgramStateManager.finalizeActiveProgram(userId, { endedEarly: true })
      console.log("[finalizeProgramState] Program state finalized and cleared")
    } catch (error) {
      console.error("[finalizeProgramState] Failed to finalize program state:", error)
      throw error
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
    // Show dialog to ask if user wants to repeat in following weeks
    setAddSetExerciseId(exerciseId)
    setAddSetAfterSetId(afterSetId)
    setShowAddSetDialog(true)
  }

  const handleConfirmAddSet = async (repeatInFollowingWeeks: boolean) => {
    if (!workout || !addSetExerciseId || !addSetAfterSetId) return

    setIsAddingSet(true)
    try {
      const exercise = workout.exercises.find((ex) => ex.id === addSetExerciseId)
      if (!exercise) {
        toast({
          title: "Error",
          description: "Exercise not found",
          variant: "destructive",
        })
        return
      }

      // If repeat in following weeks, update the template
      if (repeatInFollowingWeeks) {
        try {
          const activeProgram = await ProgramStateManager.getActiveProgram()
          if (activeProgram) {
            await ProgramStateManager.addSetToExercise({
              dayNumber: workout.day || activeProgram.currentDay,
              exerciseId: exercise.exerciseId,
              exerciseName: exercise.exerciseName,
              repeatInFollowingWeeks: true,
            })
            toast({
              title: "Set added",
              description: "This set will appear in all future workouts for this exercise",
            })
          }
        } catch (error) {
          console.error("[WorkoutLogger] Failed to add set to template:", error)
          toast({
            title: "Warning",
            description: "Set added to current workout, but failed to update template",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Set added",
          description: "Set added to current workout only",
        })
      }

      // Add set to current workout - use immutable update pattern
      const setIndex = exercise.sets.findIndex((s) => s.id === addSetAfterSetId)
      const newSet = {
        id: Math.random().toString(36).substr(2, 9),
        reps: 0,
        weight: 0,
        completed: false,
        userAdded: true,
      }

      // Create new arrays/objects to ensure React detects the change
      const updatedExercises = workout.exercises.map((ex) => {
        if (ex.id === addSetExerciseId) {
          const newSets = [...ex.sets]
          newSets.splice(setIndex + 1, 0, newSet)
          return { ...ex, sets: newSets }
        }
        return ex
      })
      const updatedWorkout = { ...workout, exercises: updatedExercises }
      setWorkout(updatedWorkout)
      WorkoutLogger.saveCurrentWorkout(updatedWorkout, user?.id)

      setShowAddSetDialog(false)
      setAddSetExerciseId(null)
      setAddSetAfterSetId(null)
    } catch (error) {
      console.error("[WorkoutLogger] Error adding set:", error)
      toast({
        title: "Error",
        description: "Failed to add set. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAddingSet(false)
    }
  }

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    if (!workout) return

    const exercise = workout.exercises.find((ex) => ex.id === exerciseId)
    if (!exercise || exercise.sets.length <= 1) return

    // Use immutable update pattern to ensure React detects the change
    const updatedExercises = workout.exercises.map((ex) => {
      if (ex.id === exerciseId) {
        return { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }
      }
      return ex
    })
    const updatedWorkout = { ...workout, exercises: updatedExercises }
    setWorkout(updatedWorkout)
    WorkoutLogger.saveCurrentWorkout(updatedWorkout, user?.id)
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
    setIsAddingNewExercise(false)
    setShowExerciseLibrary(true)
  }

  const handleOpenAddExercise = () => {
    setReplaceExerciseId(null)
    setIsAddingNewExercise(true)
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

    // Use immutable update pattern to ensure React detects the change
    const updatedExercises = workout.exercises.map((ex) => {
      if (ex.id === exerciseId) {
        const skippedSets = ex.sets.map((set) => ({
          ...set,
          completed: true,
          reps: 0,
          weight: 0,
        }))
        return { ...ex, sets: skippedSets }
      }
      return ex
    })
    const updatedWorkout = { ...workout, exercises: updatedExercises }
    setWorkout(updatedWorkout)
    WorkoutLogger.saveCurrentWorkout(updatedWorkout, user?.id)
  }

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!workout) return

    // Get the exercise being deleted so we can clean up its notes
    const deletedExercise = workout.exercises.find((ex) => ex.id === exerciseId)
    const deletedExerciseLibraryId = deletedExercise ? ((deletedExercise as any).exerciseLibraryId || deletedExercise.exerciseId) : null

    const exercises = workout.exercises.filter((ex) => ex.id !== exerciseId)
    setWorkout({ ...workout, exercises })
    await WorkoutLogger.saveCurrentWorkout({ ...workout, exercises }, user?.id)

    // CRITICAL: Delete notes from the deleted exercise
    // This prevents orphaned notes from appearing if the exercise is re-added later
    if (user?.id && deletedExerciseLibraryId) {
      try {
        const activeProgram = await ProgramStateManager.getActiveProgram()
        if (activeProgram?.instanceId) {
          console.log("[useWorkoutSession] Cleaning up notes for deleted exercise:", deletedExerciseLibraryId)
          await ExerciseNotesService.deleteExerciseNotes(
            user.id,
            activeProgram.instanceId,
            deletedExerciseLibraryId
          )
        }
      } catch (error) {
        console.error("[useWorkoutSession] Failed to delete exercise notes on exercise removal:", error)
        // Continue anyway - notes cleanup is non-critical
      }
    }
  }

  const handleSelectExerciseFromLibrary = async (selectedExercise: Exercise, options?: { repeat?: boolean }) => {
    if (!workout) return

    // Handle "Add New Exercise" flow
    if (isAddingNewExercise) {
      setIsAddingExercise(true)
      try {
        const activeProgram = await ProgramStateManager.getActiveProgram()
        if (!activeProgram) {
          toast({
            title: "Error",
            description: "No active program found",
            variant: "destructive",
          })
          return
        }

        const repeatInFollowingWeeks = options?.repeat ?? false

        // If repeat in following weeks, update the template
        if (repeatInFollowingWeeks) {
          try {
            await ProgramStateManager.addExerciseToDay({
              dayNumber: workout.day || activeProgram.currentDay,
              exercise: {
                id: selectedExercise.id,
                name: selectedExercise.name,
                muscleGroup: selectedExercise.muscleGroup,
                equipmentType: selectedExercise.equipmentType,
              },
              repeatInFollowingWeeks: true,
            })
            toast({
              title: "Exercise added",
              description: "This exercise will appear in all future workouts for this day",
            })
          } catch (error) {
            console.error("[WorkoutLogger] Failed to add exercise to template:", error)
            toast({
              title: "Warning",
              description: "Exercise added to current workout, but failed to update template",
              variant: "destructive",
            })
          }
        } else {
          toast({
            title: "Exercise added",
            description: "Exercise added to current workout only",
          })
        }

        // Add exercise to current workout - use functional update to avoid stale closure
        const newExercise = {
          id: Math.random().toString(36).substr(2, 9),
          exerciseId: selectedExercise.id,
          exerciseLibraryId: selectedExercise.id,
          exerciseName: selectedExercise.name,
          targetSets: 3,
          targetRest: "90s",
          muscleGroup: selectedExercise.muscleGroup,
          equipmentType: selectedExercise.equipmentType,
          sets: Array.from({ length: 3 }, () => ({
            id: Math.random().toString(36).substr(2, 9),
            reps: 0,
            weight: 0,
            completed: false,
          })),
          completed: false,
        }

        // Use functional update to ensure we get the latest workout state
        let updatedWorkout: WorkoutSession | null = null
        setWorkout((prevWorkout) => {
          if (!prevWorkout) return prevWorkout
          updatedWorkout = {
            ...prevWorkout,
            exercises: [...prevWorkout.exercises, newExercise],
          }
          return updatedWorkout
        })
        
        // Save the updated workout after state update
        if (updatedWorkout) {
          await WorkoutLogger.saveCurrentWorkout(updatedWorkout, user?.id)
        }
      } catch (error) {
        console.error("[WorkoutLogger] Error adding exercise:", error)
        toast({
          title: "Error",
          description: "Failed to add exercise. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsAddingExercise(false)
        setIsAddingNewExercise(false)
        setShowExerciseLibrary(false)
      }
      return
    }

    // Handle "Replace Exercise" flow
    if (!replaceExerciseId) return

    const normalize = (s: string) => s.toLowerCase().trim()

    const applyReplacement = (ex: WorkoutSession["exercises"][number]) => {
      const updatedSets = (ex.sets || []).map((s) => ({
        ...s,
        reps: 0,
        weight: 0,
        completed: false,
        skipped: false,
      }))

      return {
        ...ex,
        exerciseId: selectedExercise.id,
        exerciseLibraryId: selectedExercise.id,
        exerciseName: selectedExercise.name,
        muscleGroup: selectedExercise.muscleGroup,
        equipmentType: selectedExercise.equipmentType,
        suggestedWeight: 0,
        progressionNote: undefined,
        completed: false,
        endTime: undefined,
        sets: updatedSets,
      }
    }

    const targetIndex = workout.exercises.findIndex((ex) => ex.id === replaceExerciseId)
    if (targetIndex === -1) return

    const targetOld = workout.exercises[targetIndex]
    const targetOldName = targetOld.exerciseName
    const previousExerciseId = targetOld.exerciseId
    const previousExerciseLibraryId = (targetOld as any).exerciseLibraryId || previousExerciseId

    if (options?.repeat) {
      // Replace all matching exercises in the current workout (by name or prior id)
      const oldNameNorm = normalize(targetOldName)
      const oldId = targetOld.exerciseId
      workout.exercises = workout.exercises.map((ex) => {
        const matchByName = normalize(ex.exerciseName) === oldNameNorm
        const matchById = ex.exerciseId === oldId
        return matchByName || matchById ? applyReplacement(ex) : ex
      })
    } else {
      workout.exercises[targetIndex] = applyReplacement(targetOld)
    }

    setWorkout({ ...workout })
    await WorkoutLogger.saveCurrentWorkout(workout, user?.id)
    setReplaceExerciseId(null)
    setShowExerciseLibrary(false)

    // CRITICAL: Delete notes from the old exercise to prevent carryover to new exercise
    // This ensures notes don't leak between different exercises in the same workout slot
    if (user?.id && previousExerciseLibraryId) {
      try {
        const activeProgram = await ProgramStateManager.getActiveProgram()
        if (activeProgram?.instanceId) {
          console.log("[useWorkoutSession] Cleaning up notes for replaced exercise:", previousExerciseLibraryId)
          await ExerciseNotesService.deleteExerciseNotes(
            user.id,
            activeProgram.instanceId,
            previousExerciseLibraryId
          )
        }
      } catch (error) {
        console.error("[useWorkoutSession] Failed to delete exercise notes on replacement:", error)
        // Continue anyway - notes will persist but UI is already updated
      }
    }

    // CRITICAL FIX: ANY exercise replacement (not just repeat) will fork the program to custom
    // This ensures that when users modify exercises, they get their own custom copy
    // The "repeat" option controls whether the replacement applies to future weeks
    try {
      console.log("[useWorkoutSession] Exercise replacement detected - forking to custom program if needed")
      await ProgramStateManager.applyFutureExerciseReplacement({
        dayNumber: workout.day || 1,
        fromExerciseId: previousExerciseLibraryId,
        fromExerciseName: targetOldName,
        toExercise: {
          id: selectedExercise.id,
          name: selectedExercise.name,
          muscleGroup: selectedExercise.muscleGroup,
          equipmentType: selectedExercise.equipmentType,
        },
        applyToFutureWeeks: options?.repeat ?? true,
      })

      // If repeat is enabled, the replacement will be applied to future weeks
      // If repeat is disabled, only current week is affected (but program is still forked)
      if (options?.repeat) {
        console.log("[useWorkoutSession] Repeat option enabled - replacement will apply to future weeks")
      } else {
        console.log("[useWorkoutSession] Repeat option disabled - replacement is current week only, but program has been forked to custom")
      }
    } catch (error) {
      console.error("[useWorkoutSession] Failed to fork program or apply replacement:", error)
      toast({
        title: "Could not fork program to custom",
        description: "Your current session was updated, but this may not be saved as a custom program.",
        variant: "destructive",
      })
    }
  }

  const handleStartNextWorkout = async () => {
    setShowCompletionDialog(false)
    setCompletedWorkout(null)

    // Note: clearCurrentWorkout is already called in WorkoutLogger.completeWorkout()
    // No need to clear again here

    // Check if program still exists - if not, the program was completed
    const activeProgram = await ProgramStateManager.getActiveProgram()

    if (!activeProgram) {
      // Program was completed and removed - navigate away
      console.log("[handleStartNextWorkout] Program completed, closing workout logger")
      setWorkout(null)
      onCancel?.() // Navigate back to train view which will show CTA
      return
    }

    // Program still exists - the new workout was already loaded by handleProgramChange
    // when the programChanged event was dispatched in handleCompleteWorkout.
    // Just close the dialogs and the user will see the new workout.
    // 
    // IMPORTANT: Do NOT call onComplete() here - that remounts the component and
    // causes a race condition where the new workout state is lost.
    console.log("[handleStartNextWorkout] Dialogs closed, new workout should already be loaded")
  }

  const handleWorkoutClick = async (week: number, day: number) => {
    const activeProgram = await ProgramStateManager.getActiveProgram()
    if (!activeProgram) return

    console.log("User clicked on week", week, "day", day)

    // Use the template from activeProgram instead of getTemplateById
    const template = activeProgram.template
    if (!template) {
      console.error("No template in active program")
      return
    }

    const dayKey = `day${day}`
    const workoutDay = template.schedule[dayKey]
    if (!workoutDay) return

    // Only save if it's an in-progress workout, not a completed one
    if (workout && !workout.completed) {
      WorkoutLogger.saveCurrentWorkout(workout, user?.id)
      console.log("Saved in-progress workout before switching")
    } else if (workout && workout.completed) {
      console.log("Skipping save - this is a completed workout (read-only)")
    }

    // Check completed history first, then in-progress workouts
    const completedWorkout = WorkoutLogger.getCompletedWorkout(
      week,
      day,
      user?.id,
      activeProgram.instanceId
    )
    const inProgressWorkout = await WorkoutLogger.getInProgressWorkout(week, day, user?.id)
    const existingWorkout = completedWorkout || inProgressWorkout

    let loadedWorkout: WorkoutSession

    if (existingWorkout) {
      console.log("Found existing workout for week", week, "day", day, ":", {
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
        console.log("⚠️ Loading COMPLETED workout - this should be READ-ONLY")
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
        console.log("In-progress workout needs progression refresh - recalculating...")
        
        // Recalculate progression for each exercise
        const refreshedExercises = await Promise.all(existingWorkout.exercises.map(async (exercise) => {
          // Find the template exercise to get progression data
          const templateExercise = workoutDay.exercises.find(te => 
            te.exerciseName === exercise.exerciseName || 
            te.id === exercise.exerciseId
          )
          
          if (!templateExercise) {
            console.log("Template exercise not found for:", exercise.exerciseName)
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
            console.log("No previous performance found for:", exercise.exerciseName)
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
          
          const result = await ProgressionRouter.calculateProgression(progressionInput)
          
          console.log("Refreshed progression for", exercise.exerciseName, ":", {
            oldNote: exercise.progressionNote,
            newNote: result.progressionNote,
            oldWeight: exercise.suggestedWeight,
            newWeight: result.targetWeight
          })

          // Update exercise with new progression data
          // Copy actualReps from previous week (what user actually did), not template target
          return {
            ...exercise,
            suggestedWeight: result.targetWeight,
            progressionNote: result.progressionNote,
            bounds: result.additionalData?.bounds,
            strategy: result.strategy,
            tier: result.additionalData?.tier,
            userOverridden: false
          }
        }))

        // Update the existing workout with refreshed progression
        existingWorkout.exercises = refreshedExercises
        
        // Save the updated workout (async but don't await to avoid blocking UI)
        WorkoutLogger.saveCurrentWorkout(existingWorkout, user?.id).then(() => {
          console.log("Saved workout with refreshed progression data")
        }).catch((error) => {
          console.error("Failed to save refreshed workout:", error)
        })
      }

      loadedWorkout = existingWorkout
    } else {
      console.log("No existing workout found, creating new one for week", week, "day", day)

      const weekKey = `week${week}`
      const transformedExercises = await Promise.all(workoutDay.exercises.map(async (exercise) => {
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
        
        const result = await ProgressionRouter.calculateProgression(progressionInput)

        return {
          id: Math.random().toString(36).substr(2, 9),
          exerciseId: exercise.id,
          exerciseName: exercise.exerciseName,
          targetSets: result.targetSets || 3,
          targetRest: `${Math.floor(exercise.restTime / 60)} min`,
          muscleGroup: getExerciseMuscleGroup(exercise.exerciseName),
          equipmentType: exercise.equipmentType || "BARBELL",
          suggestedWeight: result.targetWeight,
          progressionNote: result.progressionNote,
          perSetSuggestions: result.perSetSuggestions,  // NEW: Pass per-set suggestions for reps pre-filling
          // Add progression metadata for volume compensation
          bounds: result.additionalData?.bounds,
          strategy: result.strategy,
          tier: result.additionalData?.tier,
          userOverridden: false,
          completed: false,
          sets: []
        }
      }))

      // Check blocking logic BEFORE creating workout to prevent ghost data
      const scheduleKeys = Object.keys(template.schedule)
      const daysPerWeek = scheduleKeys.length
      const isCurrentWeekCompleted = WorkoutLogger.isWeekCompleted(
        activeProgram.currentWeek,
        daysPerWeek,
        user?.id,
        activeProgram.instanceId
      )
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

        console.log("Created new workout:", {
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
      const isCurrentWeekCompleted = WorkoutLogger.isWeekCompleted(
        activeProgram.currentWeek,
        daysPerWeek,
        user?.id,
        activeProgram.instanceId
      )
      const weeksAhead = week - activeProgram.currentWeek

      if (!isCurrentWeekCompleted) {
        // For current week + 1, show suggested weights but block editing
        if (weeksAhead === 1) {
          setIsWorkoutBlocked(true)
          setIsFullyBlocked(false)
          setBlockedMessage("Complete current week to unlock this workout")
          console.log("Workout partially blocked - current week not completed, showing preview for week", week)
        } else {
          // For weeks 2+ ahead, fully block
          setIsWorkoutBlocked(true)
          setIsFullyBlocked(true)
          setBlockedMessage("Complete previous weeks before accessing this workout")
          console.log("Workout fully blocked - too many weeks ahead:", weeksAhead)
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

  const getMuscleGroupColor = (muscleGroup: string) => getMuscleGroupBadgeClass(muscleGroup)

  const displayExercises = workout?.exercises ?? []

  console.log("Rendering workout with", displayExercises?.length || 0, "exercises")
  displayExercises?.forEach((ex, idx) => {
    console.log(`Exercise ${idx + 1}: ${ex.exerciseName} - ${ex.sets?.length || 0} sets`)
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
    exerciseNotesData,
    setExerciseNotesData,
    customRpesData,
    setCustomRpesData,
    displayMode,
    blockLevelRpe,
    blockLevelRir,
    handleSaveExerciseNote,
    handleSaveCustomRpe,
    showBodyweightDialog,
    setShowBodyweightDialog,
    bodyweightInput,
    setBodyweightInput,
    handleSaveBodyweight,
    showAddSetDialog,
    setShowAddSetDialog,
    addSetExerciseId,
    addSetAfterSetId,
    isAddingSet,
    handleConfirmAddSet,
    isAddingExercise,
    isAddingNewExercise,
    handleOpenAddExercise,
    isLoadingWorkout,
  }
}
