import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { WorkoutLoggerComponent } from "@/components/workout-logger"

const initialExercises = [
  {
    exerciseId: "squat",
    exerciseName: "Back Squat",
    targetSets: 2,
    targetReps: "5",
    targetRest: "120",
    muscleGroup: "legs",
  },
]

const buildWorkout = (name: string, exercises: typeof initialExercises, week = 1, day = 1) => ({
  id: `workout-${week}-${day}`,
  userId: "user-1",
  workoutName: name,
  startTime: Date.now(),
  week,
  day,
  exercises: exercises.map((exercise, index) => ({
    id: `${exercise.exerciseId}-${index}`,
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
    targetSets: exercise.targetSets,
    targetReps: exercise.targetReps,
    targetRest: exercise.targetRest,
    muscleGroup: exercise.muscleGroup,
    sets: Array.from({ length: exercise.targetSets }).map((_, setIndex) => ({
      id: `${exercise.exerciseId}-set-${setIndex}`,
      reps: 0,
      weight: 0,
      completed: false,
      skipped: false,
    })),
    completed: false,
    skipped: false,
  })),
  notes: "",
  completed: false,
})

const activeProgram = {
  templateId: "template-1",
  template: {
    id: "template-1",
    name: "Mock Program",
    days: 1,
    weeks: 1,
    gender: ["male", "female"],
    experience: ["beginner", "intermediate", "advanced"],
    schedule: {
      day1: {
        name: "Mock Workout",
        exercises: initialExercises.map((exercise) => ({
          id: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          category: "compound",
          progressionTemplate: {
            week1: { sets: exercise.targetSets, repRange: exercise.targetReps },
          },
          autoProgression: {
            enabled: true,
            progressionType: "weight_based",
            rules: {
              if_all_sets_completed: "increase",
              if_failed_reps: "repeat",
              if_failed_twice: "reduce",
            },
          },
          restTime: 120,
        })),
      },
    },
  },
  startDate: Date.now(),
  currentWeek: 1,
  currentDay: 1,
  completedWorkouts: 0,
  totalWorkouts: 1,
  progress: 0,
}

let storedWorkout = buildWorkout("Mock Workout", initialExercises)

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", gender: "male", experience: "intermediate" },
    isLoading: false,
  }),
}))

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

vi.mock("@/components/workout-completion-dialog", () => ({
  WorkoutCompletionDialog: () => <div data-testid="workout-completion-dialog" />,
}))

vi.mock("@/components/muscle-group-stats", () => ({
  MuscleGroupStats: () => <div data-testid="muscle-group-stats" />,
}))

vi.mock("@/components/workout-calendar", () => ({
  WorkoutCalendar: () => <div data-testid="workout-calendar" />,
}))

vi.mock("@/components/exercise-library", () => ({
  ExerciseLibrary: () => <div data-testid="exercise-library" />,
}))

vi.mock("@/lib/workout-logger", () => {
  return {
    WorkoutLogger: {
      startWorkout: (
        name: string,
        exercises: typeof initialExercises,
        week?: number,
        day?: number,
        _userId?: string,
      ) => {
        storedWorkout = buildWorkout(name, exercises, week ?? 1, day ?? 1)
        return storedWorkout
      },
      getCurrentWorkout: () => storedWorkout,
      saveCurrentWorkout: vi.fn().mockResolvedValue(undefined),
      updateSet: vi.fn(async (workout: any, exerciseId: string, setId: string, updates: any) => {
        const updated = {
          ...workout,
          exercises: workout.exercises.map((exercise: any) =>
            exercise.id === exerciseId
              ? {
                  ...exercise,
                  sets: exercise.sets.map((set: any) => (set.id === setId ? { ...set, ...updates } : set)),
                }
              : exercise,
          ),
        }
        storedWorkout = updated
        return updated
      }),
      completeWorkout: vi.fn(async () => ({ ...storedWorkout, completed: true, endTime: Date.now() })),
      hasCompletedWorkout: vi.fn(() => false),
      isWeekCompleted: vi.fn(() => false),
      syncToDatabase: vi.fn().mockResolvedValue(undefined),
      clearCurrentWorkout: vi.fn().mockResolvedValue(undefined),
      getCompletedWorkout: vi.fn(() => null),
      getInProgressWorkout: vi.fn(() => null),
      skipWorkout: vi.fn(async () => null),
      getUserStorageKeys: vi.fn(() => ({
        workouts: "liftlog_workouts_user-1",
        inProgress: "liftlog_in_progress_workouts_user-1",
      })),
    },
  }
})

vi.mock("@/lib/program-state", () => ({
  ProgramStateManager: {
    getActiveProgram: vi.fn(() => activeProgram),
    getCurrentWorkout: vi.fn(() => ({ name: "Mock Workout", exercises: initialExercises })),
    recalculateProgress: vi.fn(),
    completeWorkout: vi.fn().mockResolvedValue(undefined),
    finalizeActiveProgram: vi.fn().mockResolvedValue(undefined),
    setActiveProgram: vi.fn(),
    syncToDatabase: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock("@/lib/gym-templates", () => ({
  getTemplateById: vi.fn(() => activeProgram.template),
}))

vi.mock("@/lib/exercise-muscle-groups", () => ({
  getExerciseMuscleGroup: () => "Legs",
}))

vi.mock("@/lib/progression-router", () => ({
  ProgressionRouter: {
    getPreviousPerformance: vi.fn(() => null),
    calculateProgression: vi.fn(() => ({
      targetWeight: 0,
      targetReps: 8,
      progressionNote: "Mock progression",
      strategy: "linear",
      engineUsed: "linear",
    })),
  },
}))

vi.mock("@/lib/connection-monitor", () => {
  const listeners = new Set<(status: string) => void>()
  return {
    ConnectionMonitor: {
      initialize: vi.fn(),
      subscribe: (callback: (status: string) => void) => {
        listeners.add(callback)
        callback("online")
        return () => listeners.delete(callback)
      },
      getStatus: vi.fn(() => ({ queueSize: 0, isOnline: true, status: "online" })),
      isOnline: vi.fn(() => true),
      updateStatus: vi.fn(),
      addToQueue: vi.fn(),
      clearQueue: vi.fn(),
      getQueueSize: vi.fn(() => 0),
      getSetSyncStatus: vi.fn(() => ({ queueSize: 0 })),
      registerSetSyncProvider: vi.fn(),
      forceSyncSets: vi.fn().mockResolvedValue(undefined),
    },
  }
})

describe("WorkoutLoggerComponent smoke test", () => {
  beforeEach(() => {
    localStorage.clear()
    storedWorkout = buildWorkout("Mock Workout", initialExercises)
  })

  it("renders the workout logger UI", async () => {
    render(
      <WorkoutLoggerComponent
        initialWorkout={{
          name: "Mock Workout",
          exercises: initialExercises,
        }}
      />,
    )

    expect(await screen.findByText("Mock Workout")).toBeInTheDocument()
    const finishActions = await screen.findAllByText(/Complete exercises to finish/i)
    expect(finishActions.length).toBeGreaterThan(0)
  })
})
