"use client"

import { useState, useEffect } from "react"
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
import { ProgramStateManager } from "@/lib/program-state"
import { getTemplateById } from "@/lib/gym-templates"
import { getExerciseMuscleGroup } from "@/lib/exercise-muscle-groups"
import { ProgressionCalculator } from "@/lib/progression-calculator"
import {
  Clock,
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
  const [workout, setWorkout] = useState<WorkoutSession | null>(null)
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [restTimeLeft, setRestTimeLeft] = useState(0)
  const [showNotesDialog, setShowNotesDialog] = useState(false)
  const [showSummaryDialog, setShowSummaryDialog] = useState(false)
  const [showAddExerciseDialog, setShowAddExerciseDialog] = useState(false)
  const [showEndProgramDialog, setShowEndProgramDialog] = useState(false)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [completedWorkout, setCompletedWorkout] = useState<WorkoutSession | null>(null)
  const [workoutNotes, setWorkoutNotes] = useState("")
  const [endProgramConfirmation, setEndProgramConfirmation] = useState("")
  const [showCalendar, setShowCalendar] = useState(false)
  const [showMuscleGroupStats, setShowMuscleGroupStats] = useState(false)
  const [isWorkoutBlocked, setIsWorkoutBlocked] = useState(false)
  const [blockedMessage, setBlockedMessage] = useState("")
  const [programName, setProgramName] = useState<string>("")

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
    const activeProgram = ProgramStateManager.getActiveProgram()
    if (activeProgram) {
      setProgramName(activeProgram.template.name)
    }

    const existingWorkout = WorkoutLogger.getCurrentWorkout()
    if (existingWorkout) {
      console.log("[v0] Component loaded existing workout:", {
        id: existingWorkout.id,
        week: existingWorkout.week,
        day: existingWorkout.day,
        exerciseCount: existingWorkout.exercises.length,
        exercises: existingWorkout.exercises.map((ex) => ({
          name: ex.exerciseName,
          setsCount: ex.sets?.length || 0,
          hasSets: !!ex.sets,
        })),
      })
      setWorkout(existingWorkout)
      setWorkoutNotes(existingWorkout.notes || "")

      const week = activeProgram?.currentWeek
      const day = activeProgram?.currentDay

      console.log("[v0] Checking if workout should be blocked:", {
        existingWorkoutWeek: existingWorkout.week,
        activeProgramWeek: week,
        activeProgramDay: day,
      })

      if (week && day && existingWorkout.week && existingWorkout.week > week) {
        // Workout from a future week - check if current week is complete
        const scheduleKeys = Object.keys(activeProgram.template.schedule)
        const daysPerWeek = scheduleKeys.length
        const isCurrentWeekCompleted = WorkoutLogger.isWeekCompleted(week, daysPerWeek)

        if (!isCurrentWeekCompleted) {
          setIsWorkoutBlocked(true)
          setBlockedMessage(
            `Complete all workouts in Week ${week} before accessing Week ${existingWorkout.week}`,
          )
          console.log("[v0] Workout blocked - current week not completed")
        } else {
          setIsWorkoutBlocked(false)
          setBlockedMessage("")
          console.log("[v0] Workout not blocked - current week completed")
        }
      } else {
        setIsWorkoutBlocked(false)
        setBlockedMessage("")
        console.log("[v0] Workout not blocked - current or past week")
      }
    } else if (initialWorkout) {
      const activeProgram = ProgramStateManager.getActiveProgram()
      const week = activeProgram?.currentWeek
      const day = activeProgram?.currentDay

      const newWorkout = WorkoutLogger.startWorkout(initialWorkout.name, initialWorkout.exercises, week, day)
      console.log("[v0] Component created new workout from initialWorkout")
      setWorkout(newWorkout)
      setIsWorkoutBlocked(false)
      setBlockedMessage("")
    }
  }, [initialWorkout])

  useEffect(() => {
    if (restTimer && restTimeLeft > 0) {
      const interval = setInterval(() => {
        setRestTimeLeft((prev) => {
          if (prev <= 1) {
            setRestTimer(null)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [restTimer, restTimeLeft])

  const handleSetUpdate = (exerciseId: string, setId: string, field: "reps" | "weight", value: number) => {
    if (!workout) return

    console.log("[v0] handleSetUpdate called:", { exerciseId, setId, field, value, isWorkoutBlocked })

    console.log("[v0] Current workout before update:", {
      id: workout.id,
      exerciseCount: workout.exercises.length,
    })

    const updatedWorkout = WorkoutLogger.updateSet(workout, exerciseId, setId, {
      [field]: value,
    })

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
    } else {
      console.log("[v0] ERROR: updatedWorkout is null, not updating state")
    }
  }

  const handleCompleteSet = (exerciseId: string, setId: string) => {
    if (!workout) return

    const exercise = workout.exercises.find((ex) => ex.id === exerciseId)
    const set = exercise?.sets.find((s) => s.id === setId)
    if (!set) return

    if (!set.completed) {
      if (!set.weight || set.weight <= 0 || !set.reps || set.reps <= 0) {
        return
      }
    }

    const updatedWorkout = WorkoutLogger.updateSet(workout, exerciseId, setId, {
      completed: !set.completed,
    })
    if (updatedWorkout) {
      setWorkout(updatedWorkout)
    }
  }

  const handleStartRest = (exerciseId: string, setId: string, restDuration: string) => {
    if (!workout) return

    const restSeconds = parseRestDuration(restDuration)
    WorkoutLogger.startRest(workout.id, exerciseId, setId)
    setRestTimer(Date.now())
    setRestTimeLeft(restSeconds)
  }

  const parseRestDuration = (duration: string): number => {
    const match = duration.match(/(\d+)/)
    return match ? Number.parseInt(match[1]) * 60 : 120
  }

  const canFinishWorkout = (): boolean => {
    if (!workout) return false

    return workout.exercises.every((exercise) => exercise.sets.every((set) => set.completed))
  }

  const handleCompleteWorkout = () => {
    if (!workout) return

    if (!canFinishWorkout()) {
      return
    }

    const workoutWithNotes = { ...workout, notes: workoutNotes }
    setWorkout(workoutWithNotes)
    WorkoutLogger.saveCurrentWorkout(workoutWithNotes)

    const wasAlreadyCompleted = WorkoutLogger.hasCompletedWorkout(workout.week || 1, workout.day || 1)

    const completedWorkout = WorkoutLogger.completeWorkout(workoutWithNotes.id)
    if (completedWorkout) {
      if (!wasAlreadyCompleted) {
        console.log("[v0] handleWorkoutComplete called - updating program state")
        ProgramStateManager.completeWorkout()
      } else {
        console.log("[v0] Workout was already completed, not updating program state")
      }

      setCompletedWorkout(completedWorkout)
      setShowCompletionDialog(true)
      onComplete?.()
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
      WorkoutLogger.clearCurrentWorkout()
    }
    onCancel?.()
  }

  const handleSaveNotes = () => {
    if (!workout) return

    const updatedWorkout = { ...workout, notes: workoutNotes }
    setWorkout(updatedWorkout)
    WorkoutLogger.saveCurrentWorkout(updatedWorkout)
    setShowNotesDialog(false)
  }

  const handleEndProgram = () => {
    if (!workout || endProgramConfirmation !== "End Program") return

    const updatedWorkout = { ...workout }
    updatedWorkout.exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        if (!set.completed) {
          set.completed = true
          set.reps = 0
          set.weight = 0
          set.skipped = true
        }
      })
    })

    setWorkout(updatedWorkout)
    WorkoutLogger.saveCurrentWorkout(updatedWorkout)

    const completedWorkout = WorkoutLogger.completeWorkout(updatedWorkout.id)
    if (completedWorkout) {
      setCompletedWorkout(completedWorkout)
      setShowEndProgramDialog(false)
      setShowCompletionDialog(true)
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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getWorkoutProgress = (): number => {
    if (!workout) return 0
    const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
    const completedSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0)
    return totalSets > 0 ? (completedSets / totalSets) * 100 : 0
  }

  const getWorkoutDuration = (): string => {
    if (!workout) return "0:00"
    const duration = Math.floor((Date.now() - workout.startTime) / 1000)
    return formatTime(duration)
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
    WorkoutLogger.saveCurrentWorkout(workout)
  }

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    if (!workout) return

    const exercise = workout.exercises.find((ex) => ex.id === exerciseId)
    if (!exercise || exercise.sets.length <= 1) return

    exercise.sets = exercise.sets.filter((s) => s.id !== setId)
    setWorkout({ ...workout })
    WorkoutLogger.saveCurrentWorkout(workout)
  }

  const handleSkipSet = (exerciseId: string, setId: string) => {
    if (!workout) return

    const updatedWorkout = WorkoutLogger.updateSet(workout, exerciseId, setId, {
      completed: true,
      reps: 0,
      weight: 0,
    })
    if (updatedWorkout) {
      setWorkout(updatedWorkout)
    }
  }

  const handleStartNextWorkout = () => {
    setShowCompletionDialog(false)
    setCompletedWorkout(null)

    if (completedWorkout?.week && completedWorkout?.day) {
      WorkoutLogger.clearCurrentWorkout(completedWorkout.week, completedWorkout.day)
    }
    window.location.reload()
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

    if (workout) {
      WorkoutLogger.saveCurrentWorkout(workout)
      console.log("[v0] Saved current workout before switching")
    }

    const existingWorkout = WorkoutLogger.getWorkout(week, day)

    let loadedWorkout: WorkoutSession

    if (existingWorkout) {
      console.log("[v0] Found existing workout for week", week, "day", day, ":", {
        id: existingWorkout.id,
        completed: existingWorkout.completed,
        exerciseCount: existingWorkout.exercises.length,
        exercises: existingWorkout.exercises.map((ex) => ({
          name: ex.exerciseName,
          setsCount: ex.sets.length,
          firstSetWeight: ex.sets[0]?.weight || 0,
          firstSetReps: ex.sets[0]?.reps || 0,
        })),
      })
      loadedWorkout = existingWorkout
    } else {
      console.log("[v0] No existing workout found, creating new one for week", week, "day", day)

      const weekKey = `week${week}`
      const transformedExercises = workoutDay.exercises.map((exercise) => {
        // Use progression calculator to get smart targets based on previous week
        const progressedData = ProgressionCalculator.calculateProgressedTargets(
          exercise.id,
          exercise.exerciseName,
          week,
          day,
          exercise,
        )

        return {
          exerciseId: exercise.id,
          exerciseName: exercise.exerciseName,
          targetSets: progressedData.targetSets,
          targetReps: progressedData.targetReps,
          targetRest: `${Math.floor(exercise.restTime / 60)} min`,
          muscleGroup: exercise.category,
          equipmentType: "BARBELL",
          suggestedWeight: progressedData.targetWeight,
          progressionNote: progressedData.progressionNote,
        }
      })

      loadedWorkout = WorkoutLogger.startWorkout(workoutDay.name, transformedExercises, week, day)

      console.log("[v0] Created new workout:", {
        id: loadedWorkout.id,
        exerciseCount: loadedWorkout.exercises.length,
      })
    }

    const scheduleKeys = Object.keys(template.schedule)
    const daysPerWeek = scheduleKeys.length

    // New blocking logic: Allow current week (any day order) + completed weeks
    // Block future weeks until current week is fully completed
    if (week > activeProgram.currentWeek) {
      // Trying to access a future week - check if current week is complete
      const isCurrentWeekCompleted = WorkoutLogger.isWeekCompleted(activeProgram.currentWeek, daysPerWeek)

      if (!isCurrentWeekCompleted) {
        setIsWorkoutBlocked(true)
        setBlockedMessage(`Complete all workouts in Week ${activeProgram.currentWeek} before accessing Week ${week}`)
        console.log("[v0] Workout blocked - current week not completed")
      } else {
        setIsWorkoutBlocked(false)
        setBlockedMessage("")
      }
    } else {
      // Current week or past weeks - always allow access
      setIsWorkoutBlocked(false)
      setBlockedMessage("")
    }

    setWorkout(loadedWorkout)
    setWorkoutNotes(loadedWorkout.notes || "")
    setShowCalendar(false)
  }

  const getMuscleGroupColor = (muscleGroup: string) => {
    const colors = {
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

  const groupedExercises = displayExercises.reduce(
    (groups, exercise) => {
      const muscleGroup = exercise.muscleGroup || getExerciseMuscleGroup(exercise.exerciseName)
      if (!groups[muscleGroup]) {
        groups[muscleGroup] = []
      }
      groups[muscleGroup].push(exercise)
      return groups
    },
    {} as Record<string, typeof displayExercises>,
  )

  const handleMuscleGroupStatsClose = () => {
    setShowMuscleGroupStats(false)
    setShowCompletionDialog(true)
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 bg-background border-b border-border/50 z-50 shadow-sm">
          <div className="w-full max-w-full px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                {programName && (
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">{programName}</div>
                )}
                <h1 className="text-xl font-bold">{workout?.workoutName}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{getWorkoutDuration()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className={showCalendar ? "bg-muted" : ""}
                >
                  <Calendar className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
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
            <div className="mt-3">
              <Progress value={getWorkoutProgress()} className="w-full" />
            </div>
          </div>
          {showCalendar && (
            <div className="border-t border-border/50 bg-muted/30 w-full overflow-x-hidden">
              <WorkoutCalendar
                onWorkoutClick={handleWorkoutClick}
                selectedWeek={workout?.week}
                selectedDay={workout?.day}
              />
            </div>
          )}
        </div>

        {/* Progression Notes Banner */}
        {workout?.week && workout?.week > 1 && workout?.notes && (
          <div className="bg-blue-50 border-b border-blue-200 p-3 text-center">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Week {workout.week}, Day {workout.day}:</span> {workout.notes}
            </p>
          </div>
        )}

        {restTimer && restTimeLeft > 0 && (
          <div className="bg-primary text-primary-foreground p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="text-lg font-bold">Rest: {formatTime(restTimeLeft)}</span>
            </div>
          </div>
        )}

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

        <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
          <DialogContent>
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
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-lg font-semibold">Workout Duration</div>
                <div className="text-2xl font-bold text-primary">{getWorkoutDuration()}</div>
              </div>
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

        <div className="container mx-auto px-4 pb-8">
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

                    {/* Exercise Card - Flat list style */}
                    <div className="border-b border-border/30 relative overflow-hidden bg-background hover:bg-muted/20 transition-colors">
                      <div className="py-4 px-2">
                        <div className="flex items-center justify-between pb-3">
                          <div className="flex-1">
                            <h4 className="text-base font-medium">{exercise.exerciseName}</h4>
                            <p className="text-muted-foreground uppercase text-xs font-medium mt-0.5">
                              {exercise.equipmentType || "MACHINE"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem
                                  onClick={() => handleAddSet(exercise.id, exercise.sets[exercise.sets.length - 1].id)}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add set
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleSkipSet(exercise.id, exercise.sets[exercise.sets.length - 1].id)}
                                >
                                  <SkipForward className="h-4 w-4 mr-2" />
                                  Skip set
                                </DropdownMenuItem>
                                {exercise.sets.length > 1 && (
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteSet(exercise.id, exercise.sets[exercise.sets.length - 1].id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete set
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                      <div className="px-2 pb-2 relative">
                        {isWorkoutBlocked && (
                          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10 flex items-center justify-center p-3">
                            <div className="text-center px-2 max-w-full">
                              <Lock className="h-7 w-7 mx-auto mb-2 text-destructive" />
                              <p className="text-xs font-medium text-destructive leading-tight">
                                {blockedMessage || "Complete previous week before accessing this workout"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                You can preview the workout structure below
                              </p>
                            </div>
                          </div>
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
                            <div key={set.id} className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
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
                                  className="text-center h-10 bg-muted/30 border-border/50"
                                  placeholder=""
                                  step="2.5"
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
                                />
                              </div>

                              <div className="col-span-3">
                                <Button
                                  size="sm"
                                  onClick={() => handleCompleteSet(exercise.id, set.id)}
                                  variant="ghost"
                                  className={`w-full h-10 border-2 ${
                                    set.completed
                                      ? set.reps === 0 && set.weight === 0
                                        ? "bg-blue-50 border-blue-500 text-blue-700"
                                        : "bg-green-50 border-green-500 text-green-700"
                                      : "border-border/50 hover:border-primary"
                                  }`}
                                >
                                  {set.completed ? (
                                    set.reps === 0 && set.weight === 0 ? (
                                      <Minus className="h-5 w-5 text-blue-600" />
                                    ) : (
                                      <Check className="h-5 w-5 text-green-600" />
                                    )
                                  ) : (
                                    <div className="w-5 h-5 border-2 border-border rounded" />
                                  )}
                                </Button>
                              </div>

                              <div className="col-span-1 text-center">
                                <span className="text-sm font-medium text-muted-foreground">{setIndex + 1}</span>
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

          <div className="lg:hidden pt-8 pb-24">
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
                    disabled={!canFinishWorkout()}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {canFinishWorkout() ? "Finish Workout" : "Complete exercises to finish"}
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
    </>
  )
}
