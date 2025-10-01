import type { WorkoutSession } from "./workout-logger"

export interface ProgressMetrics {
  totalWorkouts: number
  totalVolume: number
  averageWorkoutDuration: number
  strengthGains: { [exerciseId: string]: number }
  weeklyProgress: { week: string; workouts: number; volume: number }[]
  exerciseProgress: { [exerciseId: string]: { date: string; maxWeight: number; totalReps: number }[] }
}

export interface ExerciseStats {
  exerciseId: string
  exerciseName: string
  totalSets: number
  totalReps: number
  maxWeight: number
  averageWeight: number
  lastPerformed: string
  progressTrend: "up" | "down" | "stable"
}

export class AnalyticsEngine {
  static calculateProgressMetrics(workouts: WorkoutSession[]): ProgressMetrics {
    const completedWorkouts = workouts.filter((w) => w.completed)

    if (completedWorkouts.length === 0) {
      return {
        totalWorkouts: 0,
        totalVolume: 0,
        averageWorkoutDuration: 0,
        strengthGains: {},
        weeklyProgress: [],
        exerciseProgress: {},
      }
    }

    const totalWorkouts = completedWorkouts.length
    const totalVolume = this.calculateTotalVolume(completedWorkouts)
    const averageWorkoutDuration = this.calculateAverageWorkoutDuration(completedWorkouts)
    const strengthGains = this.calculateStrengthGains(completedWorkouts)
    const weeklyProgress = this.calculateWeeklyProgress(completedWorkouts)
    const exerciseProgress = this.calculateExerciseProgress(completedWorkouts)

    return {
      totalWorkouts,
      totalVolume,
      averageWorkoutDuration,
      strengthGains,
      weeklyProgress,
      exerciseProgress,
    }
  }

  static getExerciseStats(workouts: WorkoutSession[]): ExerciseStats[] {
    const completedWorkouts = workouts.filter((w) => w.completed)
    const exerciseMap = new Map<
      string,
      {
        exerciseName: string
        sets: { weight: number; reps: number; date: string }[]
      }
    >()

    // Collect all exercise data
    completedWorkouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        if (!exerciseMap.has(exercise.exerciseId)) {
          exerciseMap.set(exercise.exerciseId, {
            exerciseName: exercise.exerciseName,
            sets: [],
          })
        }

        const exerciseData = exerciseMap.get(exercise.exerciseId)!
        exercise.sets.forEach((set) => {
          if (set.completed && set.weight > 0 && set.reps > 0) {
            exerciseData.sets.push({
              weight: set.weight,
              reps: set.reps,
              date: new Date(workout.startTime).toISOString().split("T")[0],
            })
          }
        })
      })
    })

    // Calculate stats for each exercise
    return Array.from(exerciseMap.entries())
      .map(([exerciseId, data]) => {
        const sets = data.sets
        if (sets.length === 0) {
          return {
            exerciseId,
            exerciseName: data.exerciseName,
            totalSets: 0,
            totalReps: 0,
            maxWeight: 0,
            averageWeight: 0,
            lastPerformed: "",
            progressTrend: "stable" as const,
          }
        }

        const totalSets = sets.length
        const totalReps = sets.reduce((sum, set) => sum + set.reps, 0)
        const maxWeight = Math.max(...sets.map((set) => set.weight))
        const averageWeight = sets.reduce((sum, set) => sum + set.weight, 0) / sets.length
        const lastPerformed = sets[sets.length - 1].date
        const progressTrend = this.calculateProgressTrend(sets)

        return {
          exerciseId,
          exerciseName: data.exerciseName,
          totalSets,
          totalReps,
          maxWeight,
          averageWeight: Math.round(averageWeight * 10) / 10,
          lastPerformed,
          progressTrend,
        }
      })
      .sort((a, b) => b.totalSets - a.totalSets)
  }

  private static calculateTotalVolume(workouts: WorkoutSession[]): number {
    return workouts.reduce((total, workout) => {
      return (
        total +
        workout.exercises.reduce((exerciseTotal, exercise) => {
          return (
            exerciseTotal +
            exercise.sets.reduce((setTotal, set) => {
              return set.completed ? setTotal + set.weight * set.reps : setTotal
            }, 0)
          )
        }, 0)
      )
    }, 0)
  }

  private static calculateAverageWorkoutDuration(workouts: WorkoutSession[]): number {
    const durations = workouts.filter((w) => w.endTime).map((w) => (w.endTime! - w.startTime) / (1000 * 60)) // Convert to minutes

    return durations.length > 0 ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length) : 0
  }

  private static calculateStrengthGains(workouts: WorkoutSession[]): { [exerciseId: string]: number } {
    const exerciseData = new Map<string, number[]>()

    workouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        const maxWeight = Math.max(...exercise.sets.filter((s) => s.completed).map((s) => s.weight))
        if (maxWeight > 0) {
          if (!exerciseData.has(exercise.exerciseId)) {
            exerciseData.set(exercise.exerciseId, [])
          }
          exerciseData.get(exercise.exerciseId)!.push(maxWeight)
        }
      })
    })

    const gains: { [exerciseId: string]: number } = {}
    exerciseData.forEach((weights, exerciseId) => {
      if (weights.length >= 2) {
        const firstWeight = weights[0]
        const lastWeight = weights[weights.length - 1]
        gains[exerciseId] = firstWeight > 0 ? Math.round(((lastWeight - firstWeight) / firstWeight) * 100) : 0
      }
    })

    return gains
  }

  private static calculateWeeklyProgress(
    workouts: WorkoutSession[],
  ): { week: string; workouts: number; volume: number }[] {
    const weeklyData = new Map<string, { workouts: number; volume: number }>()

    workouts.forEach((workout) => {
      const date = new Date(workout.startTime)
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()))
      const weekKey = weekStart.toISOString().split("T")[0]

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, { workouts: 0, volume: 0 })
      }

      const weekData = weeklyData.get(weekKey)!
      weekData.workouts += 1
      weekData.volume += workout.exercises.reduce((total, exercise) => {
        return (
          total +
          exercise.sets.reduce((setTotal, set) => {
            return set.completed ? setTotal + set.weight * set.reps : setTotal
          }, 0)
        )
      }, 0)
    })

    return Array.from(weeklyData.entries())
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-8) // Last 8 weeks
  }

  private static calculateExerciseProgress(workouts: WorkoutSession[]): {
    [exerciseId: string]: { date: string; maxWeight: number; totalReps: number }[]
  } {
    const exerciseProgress: { [exerciseId: string]: { date: string; maxWeight: number; totalReps: number }[] } = {}

    workouts.forEach((workout) => {
      const date = new Date(workout.startTime).toISOString().split("T")[0]

      workout.exercises.forEach((exercise) => {
        if (!exerciseProgress[exercise.exerciseId]) {
          exerciseProgress[exercise.exerciseId] = []
        }

        const completedSets = exercise.sets.filter((s) => s.completed)
        if (completedSets.length > 0) {
          const maxWeight = Math.max(...completedSets.map((s) => s.weight))
          const totalReps = completedSets.reduce((sum, s) => sum + s.reps, 0)

          exerciseProgress[exercise.exerciseId].push({
            date,
            maxWeight,
            totalReps,
          })
        }
      })
    })

    return exerciseProgress
  }

  private static calculateProgressTrend(
    sets: { weight: number; reps: number; date: string }[],
  ): "up" | "down" | "stable" {
    if (sets.length < 3) return "stable"

    const recent = sets.slice(-3)
    const older = sets.slice(-6, -3)

    if (older.length === 0) return "stable"

    const recentAvg = recent.reduce((sum, set) => sum + set.weight, 0) / recent.length
    const olderAvg = older.reduce((sum, set) => sum + set.weight, 0) / older.length

    const change = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0

    if (change > 0.05) return "up"
    if (change < -0.05) return "down"
    return "stable"
  }
}
